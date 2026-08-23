export const ADMIN_DASHBOARD_GROUPS = [
  {
    id: 'learning-operations',
    label: 'Learners & Insights',
    items: [
      { id: 'overview', permission: 'users.overview', label: 'Overview & Stats', description: 'Key learner metrics and activity at a glance.', icon: 'overview' },
      { id: 'directory', permission: 'users.directory', label: 'User Directory', description: 'Search, review, and manage user accounts.', icon: 'users' },
      { id: 'enrollments', permission: 'users.enrollments', label: 'Enrollments', description: 'Review course access and enrollment records.', icon: 'enrollments' },
      { id: 'progress', permission: 'users.progress', label: 'Learning Progress', description: 'Track module completion and learner progress.', icon: 'progress' },
      { id: 'course-performance', permission: 'users.course_performance', label: 'Course Performance', description: 'Compare course health, engagement, and outcomes.', icon: 'performance' },
      { id: 'video-analytics', permission: 'users.video_analytics', label: 'Video Analytics', description: 'Understand viewing progress and lesson activity.', icon: 'video' },
      { id: 'assessments', permission: 'users.assessments', label: 'Assessment Results', description: 'Review attempts, results, and submitted worksheets.', icon: 'assessments' },
      { id: 'certificates', permission: 'users.certificates', label: 'Certificates', description: 'Review earned and issued certificates.', icon: 'certificates' },
      { id: 'purchases', permission: 'users.purchases', label: 'Payments', description: 'Review payments, discounts, fulfillment, and orders.', icon: 'payments' },
    ],
  },
  {
    id: 'course-management',
    label: 'Course Management',
    items: [
      {
        id: 'courses',
        permissions: ['courses.view', 'courses.create', 'courses.edit', 'courses.content'],
        label: 'Manage Courses',
        description: 'Create, edit, and organize courses, modules, and lessons.',
        icon: 'courses',
      },
      {
        id: 'assessment-links',
        permission: 'external_assessments.manage',
        label: 'Assessment Links',
        description: 'Create and revoke temporary public assessment links.',
        icon: 'links',
      },
    ],
  },
  {
    id: 'promotions',
    label: 'Discounts & Promotions',
    items: [
      { id: 'discounts', permission: 'settings.manage', label: 'Discount Settings', description: 'Configure first-purchase and points discounts.', icon: 'discounts' },
      { id: 'coupons', permission: 'coupons.manage', label: 'Coupons', description: 'Create and manage promotional coupon codes.', icon: 'coupons' },
    ],
  },
  {
    id: 'access-control',
    label: 'Access Control',
    items: [
      { id: 'roles', adminOnly: true, label: 'Roles & Access', description: 'Create staff accounts and control creator access.', icon: 'roles' },
    ],
  },
]

export const ADMIN_DASHBOARD_VIEWS = ADMIN_DASHBOARD_GROUPS.flatMap((group) => group.items)

export function canAccessDashboardView(access, view) {
  if (!access || !view) return false
  if (access.role === 'admin') return true
  if (access.role !== 'creator' || view.adminOnly) return false
  if (view.permission) return access.permissions.includes(view.permission)
  if (view.permissions) return view.permissions.some((permission) => access.permissions.includes(permission))
  return false
}

export function dashboardViewById(viewId) {
  return ADMIN_DASHBOARD_VIEWS.find((view) => view.id === viewId) || null
}

export function firstAccessibleDashboardView(access) {
  return ADMIN_DASHBOARD_VIEWS.find((view) => canAccessDashboardView(access, view)) || null
}
