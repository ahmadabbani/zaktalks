import 'server-only'

// Explicit projection from the service-only combined report; routes always scope
// rows to auth.getUser().id before calling this helper.
export async function enrichPaymentHistory(admin, rows) {
  const ids=[...new Set(rows.map(row=>row.course_id))]
  if(!ids.length)return rows
  const {data,error}=await admin.from('courses').select('id,title,slug,logo_url,deleted_at').in('id',ids)
  if(error)throw error
  const courses=new Map((data||[]).map(course=>[course.id,course]))
  const whishIds=rows.filter(row=>row.payment_provider==='whish').map(row=>row.id)
  let whishOffers=new Map()
  if(whishIds.length){
    const result=await admin.from('whish_orders').select('id,discounts').in('id',whishIds)
    if(result.error)throw result.error
    whishOffers=new Map((result.data||[]).map(order=>[order.id,order.discounts?.whishPromotion||null]))
  }
  return rows.map(row=>{
    const course=courses.get(row.course_id)
    return {...row,whish_promotion:whishOffers.get(row.id)||null,checkout_status:row.status || row.checkout_status,course:course&&!course.deleted_at?{title:course.title,slug:course.slug,logo_url:course.logo_url}:null,
      course_title_snapshot:row.course_title_snapshot||course?.title||'Course purchase',
      coupon_applied:Boolean(row.coupon_id),promotion_applied:Number(row.promotion_discount_cents)>0}
  })
}
