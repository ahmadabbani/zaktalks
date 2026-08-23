import { redirect } from 'next/navigation'

export const metadata = { title: 'Coupon Management | Admin' }

export default function AdminCouponsPage() {
  redirect('/admin/dashboard?view=coupons')
}
