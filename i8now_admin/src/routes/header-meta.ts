/** Page titles for `SiteHeader` (keep in sync with `App` routes). */
export function headerForPath(pathname: string): { title: string; description?: string } {
  const map: Record<string, { title: string; description?: string }> = {
    '/': {
      title: 'Overview',
      description: 'Platform activity and key metrics.',
    },
    '/users': { title: 'Users', description: 'Manage accounts — role, status, access.' },
    '/users/new': {
      title: 'Add user',
      description: 'Provision an account with email or phone and assign role and status.',
    },
    '/workers': { title: 'Workers', description: 'Worker profiles and KYC verification.' },
    '/employers': { title: 'Employers', description: 'Employer companies and platform trust.' },
    '/shifts': { title: 'Shifts', description: 'Manage shift inventory, capacity, and publishing status.' },
    '/shifts/new': { title: 'Add shift', description: 'Create a shift with employer, category, schedule, and geofence.' },
    '/timesheets': { title: 'Timesheets', description: 'Clock-in records pending review or approved.' },
    '/settings': { title: 'Settings', description: 'Security, login methods, and platform configuration.' },
    '/hrm/workforce':   { title: 'Workforce',   description: 'Employee directory, headcount, and employment records.' },
    '/hrm/attendance':  { title: 'Attendance',  description: 'Daily clock-in tracking, shift adherence, and absences.' },
    '/hrm/payroll':     { title: 'Payroll',     description: 'Pay runs, earnings, deductions, and payslips.' },
    '/hrm/leave':       { title: 'Leave',       description: 'Leave requests, balances, and approval workflow.' },
    '/hrm/performance': { title: 'Performance', description: 'Worker ratings, KPIs, and appraisal records.' },
    '/hrm/compliance':  { title: 'Compliance',  description: 'KYC status, document verification, and regulatory checks.' },
    '/admin/tasks':     { title: 'Task Management', description: 'Monitor all platform tasks across employers and workers.' },
    '/admin/payments':  { title: 'Payment Management', description: 'Monitor wallet transactions and payment flows.' },
    '/admin/moderation':{ title: 'Moderation', description: 'Review reports, flags, and platform policy violations.' },
    '/admin/notifications': { title: 'Notifications Management', description: 'Configure email and in-app communication channels.' },
  }

  if (map[pathname]) return map[pathname]

  // User profile (not /users/new — handled in map above)
  if (/^\/users\/(?!new$)[^/]+$/.test(pathname)) {
    return { title: 'User profile', description: 'Full account view, access control, and lifecycle.' }
  }
  if (/^\/workers\//.test(pathname)) return { title: 'Worker detail' }
  if (/^\/employers\//.test(pathname)) return { title: 'Employer detail' }
  if (/^\/shifts\//.test(pathname)) return { title: 'Shift detail' }
  if (/^\/timesheets\//.test(pathname)) return { title: 'Timesheet detail' }
  if (/^\/hrm\//.test(pathname)) return { title: 'HRM', description: 'Human resource management.' }

  return { title: 'Admin', description: undefined }
}
