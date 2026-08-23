import { Suspense } from 'react'
import { getAccessContext } from '@/lib/auth-utils'
import { canAccessDashboardView, dashboardViewById, firstAccessibleDashboardView } from '@/lib/auth/admin-dashboard-views'
import AdminWorkspaceShell from './AdminWorkspaceShell'
import DashboardPanelContent from './DashboardPanelContent'
import { AdminDashboardLoading } from '../users/AdminDashboardLoading'

export default async function AdminDashboardPage({ searchParams }) {
  const access = await getAccessContext()
  const params = await searchParams
  const requestedView = dashboardViewById(params?.view)
  const fallbackView = firstAccessibleDashboardView(access)
  const activeView = requestedView && canAccessDashboardView(access, requestedView) ? requestedView : fallbackView
  const accessDenied = params?.access === 'denied' || Boolean(requestedView && requestedView !== activeView)
  const clientAccess = { role: access.role, permissions: access.permissions }

  return <AdminWorkspaceShell access={clientAccess} activeView={activeView} accessDenied={accessDenied}>
    {activeView && <Suspense key={activeView.id} fallback={<AdminDashboardLoading label={`Loading ${activeView.label}`} />}>
      <DashboardPanelContent viewId={activeView.id} access={access} />
    </Suspense>}
  </AdminWorkspaceShell>
}
