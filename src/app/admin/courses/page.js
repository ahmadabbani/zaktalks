import { redirect } from 'next/navigation'

export default function AdminCoursesPage() {
  redirect('/admin/dashboard?view=courses')
}
