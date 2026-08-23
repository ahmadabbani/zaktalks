import { redirect } from 'next/navigation'

export const metadata = { title: 'Discount Settings | Admin' }

export default function AdminSettingsPage() {
  redirect('/admin/dashboard?view=discounts')
}
