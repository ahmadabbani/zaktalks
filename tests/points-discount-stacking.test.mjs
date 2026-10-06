import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const rulesUrl = moduleUrl(readFileSync(new URL('../src/lib/points-rules.js', import.meta.url), 'utf8'))
let source = readFileSync(new URL('../src/lib/discount-utils.js', import.meta.url), 'utf8')
source = source.replace("import { createClient as createAdminClient } from '@/lib/supabase/admin'", 'const createAdminClient = async () => globalThis.pointsTestDatabase')
source = source.replace("from '@/lib/points-rules'", `from '${rulesUrl}'`)

let firstPurchaseEnabled = true
let whishOfferEnabled = true
let whishLookups = 0
globalThis.pointsTestDatabase = {
  async rpc(name, args) {
    if (name === 'get_active_whish_promotion') {
      whishLookups++
      return {data: whishOfferEnabled ? [{promotion_id:'whish-offer',promotion_name:'Transfer Special',discount_percent:20,discount_amount_cents:Math.floor(args.p_remaining_price_cents*.2)}] : [],error:null}
    }
    assert.equal(name, 'get_active_course_promotion')
    return { data: [{ promotion_id: 'promotion', promotion_name: 'Test promotion', discount_percent: 15, discount_amount_cents: 15000 }], error: null }
  },
  from(table) {
    const filters = {}
    const response = () => {
      const rows = {
        admin_settings: filters.key ? { value: '10' } : [
          { key: 'first_purchase_discount_enabled', value: String(firstPurchaseEnabled) },
          { key: 'first_purchase_discount_percent', value: '10' },
        ],
        users: { points: 7000, first_purchase_discount_used: false },
        coupons: { id: 'coupon', code: 'TEST', discount_type: 'percentage', discount_value: 20, is_active: true, applies_to_all_courses: true, max_uses_per_user: 1, usage_count: 0 },
        user_enrollments: [], checkout_sessions: [], whish_orders: [], coupon_usages: [],
      }
      assert.ok(table in rows, `Unexpected table ${table}`)
      return { data: rows[table], error: null }
    }
    const query = {
      select() { return this },
      eq(key, value) { filters[key] = value; return this },
      in() { return this },
      limit() { return this },
      async single() { return response() },
      then(resolve, reject) { return Promise.resolve(response()).then(resolve, reject) },
    }
    return query
  },
}
const { calculateAllDiscounts } = await import(moduleUrl(source))
let result = await calculateAllDiscounts({ userId: 'user', courseId: 'course', basePriceCents: 100000, pointsToUse: 6000, couponCode: 'TEST' })
assert.equal(result.promotion.discountCents, 15000)
assert.equal(result.firstPurchase.discountCents, 8500)
assert.equal(result.points.discountPercent, 10)
assert.equal(result.points.discountCents, 60000)
assert.equal(result.points.pointsToUse, 6000)
assert.equal(result.coupon.discountCents, 3300)
assert.equal(result.finalPriceCents, 13200)
assert.equal(result.totalDiscountCents, 86800)
firstPurchaseEnabled = false
result = await calculateAllDiscounts({ userId: 'user', courseId: 'course', basePriceCents: 100000, pointsToUse: 6000, couponCode: 'TEST' })
assert.equal(result.firstPurchase.eligible, false)
assert.equal(result.points.discountCents, 60000)
assert.equal(result.coupon.discountCents, 5000)
assert.equal(result.finalPriceCents, 20000)
firstPurchaseEnabled = true
result = await calculateAllDiscounts({ userId: null, courseId: 'course', basePriceCents: 100000, pointsToUse: 0, couponCode: 'TEST' })
assert.equal(result.points.pointsToUse, 0)
assert.equal(result.firstPurchase.discountCents, 8500)
assert.equal(result.coupon.discountCents, 15300)
assert.equal(result.finalPriceCents, 61200)
assert.equal(whishLookups,0,'Stripe must never look up Whish-only offers')
result = await calculateAllDiscounts({ userId:'user', courseId:'course', basePriceCents:100000, paymentMethod:'whish', pointsToUse:6000, couponCode:'TEST' })
assert.equal(result.promotion.discountCents,15000)
assert.equal(result.whishPromotion.discountCents,17000)
assert.equal(result.whishPromotion.name,'Transfer Special')
assert.equal(result.firstPurchase.discountCents,6800)
assert.equal(result.points.discountCents,60000)
assert.equal(result.coupon.discountCents,240)
assert.equal(result.finalPriceCents,960)
assert.equal(result.totalDiscountCents,99040)
result = await calculateAllDiscounts({userId:null,courseId:'course',basePriceCents:100000,paymentMethod:'whish',couponCode:'TEST'})
assert.equal(result.finalPriceCents,48960,'Guest Whish discounts stack correctly')
whishOfferEnabled=false
result = await calculateAllDiscounts({userId:'user',courseId:'course',basePriceCents:100000,paymentMethod:'whish',pointsToUse:6000,couponCode:'TEST'})
assert.equal(result.finalPriceCents,13200,'No Whish offer keeps general pricing')
assert.equal(result.whishPromotion.applied,false)
delete globalThis.pointsTestDatabase
console.log('PASS: promotion → first purchase → proportional points → coupon; first-purchase toggle; guest pricing')
