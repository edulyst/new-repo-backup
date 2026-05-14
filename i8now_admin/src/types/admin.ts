/** Shapes returned under `data` / list rows — aligned with i8now backend admin API. */

export type AdminUserRow = {
  id: string
  phone: string | null
  email: string | null
  role: string
  status: string
  onboarding_step: number
  deleted_at: string | null
  created_at: string | null
  updated_at: string | null
  totp_enabled: boolean
  password_login_enabled: boolean
  password_set: boolean
}

/** GET /admin/users/:id — same fields as list rows (security flags included). */
export type AdminUserDetail = AdminUserRow

export type AdminWorkerListRow = {
  id: string
  user_id: string
  full_name: string
  city: string
  kyc_status: string
  avatar_url?: string | null
  avatar_preview_url?: string | null
  rating_avg: number
  created_at: string | null
}

export type AdminWorkerDetail = {
  profile: {
    id: string
    user_id: string
    full_name: string
    dob: string | null
    avatar_url: string | null
    avatar_preview_url?: string | null
    bio: string | null
    city: string
    radius_km: number
    kyc_status: string
    kyc_review_note: string | null
    rating_avg: number
    admin_can_rate?: boolean
    total_shifts: number
    payout_account_holder: string | null
    payout_masked_account: string | null
    payout_upi_id: string | null
    payout_verified: boolean
    created_at: string | null
    updated_at: string | null
  }
  user: {
    id: string
    role: string
    status: string
    phone: string | null
    email: string | null
    onboarding_step: number
  }
  verification?: {
    documents_uploaded: number
    documents?: Array<{
      id: string
      type: 'govt_id' | 'right_to_work' | 'background_check'
      file_url: string
      preview_url?: string | null
      status: 'pending' | 'approved' | 'rejected'
      reviewed_at: string | null
    }>
  }
  qualifications?: Array<{
    id: string
    type: 'education' | 'work_experience' | 'certification'
    title: string
    institution: string
    from_date: string
    to_date: string | null
    is_currently_pursuing: boolean
    description: string | null
    verified: boolean
    created_at: string
  }>
}

export type AdminEmployerRow = {
  id: string
  company_name: string
  logo_url?: string | null
  logo_preview_url?: string | null
  logo_fit?: 'contain' | 'cover'
  verified: boolean
  rating_avg: number
  admin_can_rate?: boolean
  total_shifts_posted: number
  created_at: string | null
}

export type AdminEmployerDetail = {
  id: string
  company_name: string
  logo_url: string | null
  logo_preview_url?: string | null
  logo_fit?: 'contain' | 'cover'
  verified: boolean
  rating_avg: number
  admin_can_rate?: boolean
  total_shifts_posted: number
  industry: string | null
  company_size: string | null
  website_url: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  city: string | null
  address_line1: string | null
  address_line2: string | null
  notes: string | null
  status: 'active' | 'inactive'
  created_at: string | null
  updated_at: string | null
}

export type AdminTimesheetRow = {
  id: string
  application_id: string
  shift_id: string
  worker_profile_id: string
  status: string
  clock_in: string
  clock_out: string | null
  total_hours: number | null
  gross_amount: number | null
  shift_title: string
  worker_name: string
}

export type AdminTimesheetDetail = {
  id: string
  application_id: string
  shift_id: string
  worker_profile_id: string
  status: string
  clock_in: string
  clock_out: string | null
  clock_in_lat: number | null
  clock_in_lng: number | null
  distance_from_venue_m: number | null
  total_hours: number | null
  gross_amount: number | null
  platform_fee: number | null
  net_to_worker: number | null
  approved_at: string | null
  /** Worker→employer stars for this job, if submitted. */
  worker_rating_employer: number | null
  /** Employer→worker stars for this job, if submitted. */
  employer_rating_worker: number | null
  shift: {
    id: string
    title: string
    date: string
    start_time: string
    end_time: string
    hourly_rate: number
    address?: string
  } | null
  worker: {
    id: string
    full_name: string
    city: string
    user_id?: string
    kyc_status?: string
    rating_avg: number
  } | null
  employer: {
    id: string
    company_name: string
    verified?: boolean
    rating_avg: number
  } | null
}

export type AdminShiftRow = {
  id: string
  title: string
  employer_id: string
  employer_name: string
  category_id: string
  category_name: string
  date: string
  start_time: string
  end_time: string
  hourly_rate: number
  currency: string
  slots_total: number
  slots_filled: number
  status: 'open' | 'filled' | 'cancelled'
  address: string
  created_at: string | null
}

export type AdminShiftDetail = AdminShiftRow & {
  description: string
  location_lat: number
  location_lng: number
  geofence_radius_m: number
  applications_count: number
  timesheets_count: number
  updated_at: string | null
}

export type PaginatedBody<T> = {
  status: 'success'
  message: string
  data: T
  meta: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export type AdminOverviewDashboard = {
  cards: {
    users_total: number
    workers_total: number
    employers_total: number
    timesheets_open: number
    growth_workers_pct: number
  }
  kyc: {
    pending: number
    approved: number
    docs_pending: number
    docs_approved: number
  }
  productivity: {
    timesheets_approved_14d: number
    new_workers_14d: number
  }
  trend: Array<{
    date: string
    workers_created: number
    docs_uploaded: number
    kyc_approved: number
  }>
}
