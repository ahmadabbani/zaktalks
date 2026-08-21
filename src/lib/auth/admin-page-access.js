import 'server-only'

import { redirect } from 'next/navigation'
import { requireAnyPermission, requirePermission } from '@/lib/auth-utils'

export async function requireAdminPagePermission(permissionKey) {
  try {
    return await requirePermission(permissionKey)
  } catch {
    redirect('/admin/dashboard?access=denied')
  }
}

export async function requireAdminPageAnyPermission(permissionKeys) {
  try {
    return await requireAnyPermission(permissionKeys)
  } catch {
    redirect('/admin/dashboard?access=denied')
  }
}
