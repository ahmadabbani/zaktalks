export const PERMISSION_GROUPS = [
  {
    id: 'courses',
    label: 'Courses',
    description: 'Course records and learning content operations.',
    permissions: [
      { key: 'courses.view', label: 'View courses', description: 'Open the course directory and view course statistics.', href: '/admin/dashboard?view=courses' },
      { key: 'courses.create', label: 'Create courses', description: 'Create and publish new course records.', href: '/admin/courses/new' },
      { key: 'courses.edit', label: 'Edit courses', description: 'Edit course details, imagery, FAQs, and publishing state.', href: '/admin/dashboard?view=courses' },
      { key: 'courses.content', label: 'Manage modules and lessons', description: 'Create, edit, move, and remove course modules and lessons.', href: '/admin/dashboard?view=courses' },
      { key: 'external_assessments.manage', label: 'External assessment links', description: 'Create and revoke public assessment links.', href: '/admin/dashboard?view=assessment-links' },
    ],
  },
  {
    id: 'users',
    label: 'Users and learning',
    description: 'Individual areas inside the User Management workspace.',
    permissions: [
      { key: 'users.overview', label: 'Overview and statistics', description: 'View user totals, readiness, and recent activity.', href: '/admin/dashboard?view=overview', viewId: 'overview' },
      { key: 'users.directory', label: 'User directory', description: 'Search accounts and inspect individual user records.', href: '/admin/dashboard?view=directory', viewId: 'directory' },
      { key: 'users.enrollments', label: 'Enrollments', description: 'View course access and enrollment records.', href: '/admin/dashboard?view=enrollments', viewId: 'enrollments' },
      { key: 'users.progress', label: 'Learning progress', description: 'Inspect module and lesson completion progress.', href: '/admin/dashboard?view=progress', viewId: 'progress' },
      { key: 'users.course_performance', label: 'Course performance', description: 'View course-level learning health and engagement.', href: '/admin/dashboard?view=course-performance', viewId: 'course-performance' },
      { key: 'users.video_analytics', label: 'Video analytics', description: 'Inspect lesson viewing and playback activity.', href: '/admin/dashboard?view=video-analytics', viewId: 'video-analytics' },
      { key: 'users.assessments', label: 'Assessment results', description: 'Review assessment attempts, results, and worksheets.', href: '/admin/dashboard?view=assessments', viewId: 'assessments' },
      { key: 'users.certificates', label: 'Certificates', description: 'View and manage issued learner certificates.', href: '/admin/dashboard?view=certificates', viewId: 'certificates' },
      { key: 'users.purchases', label: 'Payments', description: 'Review payments, discounts, fulfillment, and reconciliation.', href: '/admin/dashboard?view=purchases', viewId: 'purchases' },
    ],
  },
  {
    id: 'commercial',
    label: 'Commercial settings',
    description: 'Discount and checkout configuration.',
    permissions: [
      { key: 'coupons.manage', label: 'Coupons', description: 'Create, edit, activate, and remove coupon codes.', href: '/admin/dashboard?view=coupons' },
      { key: 'settings.manage', label: 'Discount settings', description: 'Change platform discount and points settings.', href: '/admin/dashboard?view=discounts' },
    ],
  },
]

export const PERMISSIONS = PERMISSION_GROUPS.flatMap((group) => group.permissions)
export const PERMISSION_KEYS = PERMISSIONS.map((permission) => permission.key)
export const PERMISSION_KEY_SET = new Set(PERMISSION_KEYS)

export const USER_MANAGEMENT_PERMISSIONS = PERMISSIONS
  .filter((permission) => permission.key.startsWith('users.'))
  .map((permission) => permission.key)

export function permissionByKey(key) {
  return PERMISSIONS.find((permission) => permission.key === key) || null
}
