import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const cache=new Map()
function localModule(path){
  if(cache.has(path))return cache.get(path)
  let source=readFileSync(new URL(`../src/${path}.js`,import.meta.url),'utf8').replace("import 'server-only'",'')
  source=source.replace(/from ['"]@\/([^'"]+)['"]/g,(_,dependency)=>`from '${localModule(dependency)}'`)
  const url=`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  cache.set(path,url)
  return url
}
const {buildWhishEmail}=await import(localModule('lib/email/templates/whish'))
const offer={applied:true,name:'Transfer & Learn <Special>',discountPercent:20,discountCents:18000}
const order={id:'00000000-0000-4000-8000-000000000001',first_name:'Maya',course_title:'Test Course',original_price_cents:100000,quoted_amount_cents:72000,amount_received_cents:72000,points_to_spend:0,points_earned:720,transfer_reference:'TEST-REFERENCE',discounts:{promotion:{applied:true,name:'General Offer',discountCents:10000},whishPromotion:offer}}
for(const kind of ['instructions','approved']){
  const email=buildWhishEmail({kind,order,appUrl:'https://www.zaktalks.com'})
  assert.ok(email.html.includes('Transfer &amp; Learn &lt;Special&gt;'))
  assert.ok(email.html.includes('20%'))
  assert.ok(email.html.includes('$180.00 USD'))
  assert.ok(email.text.includes(offer.name))
  assert.ok(email.html.includes('okayness-email-logo.png'))
  assert.ok(!email.html.includes('Whish promotion'))
}
const old=buildWhishEmail({kind:'instructions',order:{...order,discounts:{}},appUrl:'https://www.zaktalks.com'})
assert.ok(!old.html.includes(offer.name))
const {enrichPaymentHistory}=await import(localModule('lib/payments/history'))
let whishLookups=0
const admin={from(table){return {select(){return this},async in(_key,ids){
  if(table==='courses')return {data:[{id:'course',title:'Test Course',slug:'test',logo_url:null}],error:null}
  assert.equal(table,'whish_orders');whishLookups++
  assert.deepEqual(ids,['whish-order'])
  return {data:[{id:'whish-order',discounts:{whishPromotion:offer,recipient_number:'private'}}],error:null}
}}}}
const rows=await enrichPaymentHistory(admin,[{id:'whish-order',course_id:'course',payment_provider:'whish'},{id:'stripe-order',course_id:'course',payment_provider:'stripe'}])
assert.deepEqual(rows[0].whish_promotion,offer)
assert.equal(rows[1].whish_promotion,null)
assert.equal(rows[0].recipient_number,undefined)
await enrichPaymentHistory(admin,[{id:'stripe-order',course_id:'course',payment_provider:'stripe'}])
assert.equal(whishLookups,1,'Stripe history must not query Whish orders')
console.log('PASS: named offers, escaped email content, logo, plain text, historical orders and safe provider-scoped history')
