import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiRequestError, apiGet, apiPatch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  ArrowLeftIcon,
  BadgeCheckIcon,
  BriefcaseIcon,
  BuildingIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  PhoneIcon,
  MailIcon,
  StarIcon,
  UserRoundIcon,
  XCircleIcon,
  BanknoteIcon,
  TimerIcon,
  ShieldCheckIcon,
  Navigation2Icon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ApplicationDetail = {
  application_id: string
  status: 'applied' | 'confirmed' | 'rejected' | 'completed' | 'cancelled'
  applied_at: string
  worker: {
    id: string
    full_name: string
    avatar_url: string | null
    city: string
    bio: string | null
    dob: string | null
    radius_km: number
    kyc_status: string
    kyc_review_note: string | null
    rating_avg: number
    rating_count: number
    total_shifts: number
    payout_account_holder: string | null
    payout_masked_account: string | null
    payout_upi_id: string | null
    created_at: string | null
  } | null
  user: {
    id: string
    email: string | null
    phone: string | null
    role: string
    status: string
    onboarding_step: number
  } | null
  shift: {
    id: string
    title: string
    description: string | null
    date: string | null
    start_time: string
    end_time: string
    hourly_rate: number
    currency: string
    slots_total: number
    slots_filled: number
    status: string
    address: string
    location_lat: number | null
    location_lng: number | null
    geofence_radius_m: number | null
    employer_id: string
    employer_name: string
    employer_logo_url: string | null
    employer_verified: boolean
    employer_rating: number
  } | null
  timesheet: {
    id: string
    status: string
    clock_in: string | null
    clock_out: string | null
    clock_in_lat: number | null
    clock_in_lng: number | null
    distance_from_venue_m: number | null
    total_hours: number | null
    gross_amount: number | null
    platform_fee: number | null
    net_to_worker: number | null
    approved_at: string | null
    worker_rating_employer: number | null
    employer_rating_worker: number | null
  } | null
  qualifications: Array<{
    id: string
    type: string
    title: string
    institution: string
    from_date: string
    to_date: string | null
  }>
}

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────

const APP_STATUS: Record<string, { cls: string; dot: string; label: string; step: number }> = {
  applied:   { cls: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400',   label: 'Applied',   step: 1 },
  confirmed: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Confirmed', step: 2 },
  completed: { cls: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500',    label: 'Completed', step: 3 },
  rejected:  { cls: 'bg-red-50 text-red-600 border-red-200',             dot: 'bg-red-500',     label: 'Rejected',  step: 0 },
  cancelled: { cls: 'bg-zinc-100 text-zinc-500 border-zinc-200',         dot: 'bg-zinc-400',    label: 'Cancelled', step: 0 },
}

const KYC_CFG: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
  approved:   { cls: 'text-emerald-600 bg-emerald-50 border-emerald-200', label: 'KYC Approved',   icon: <BadgeCheckIcon className="h-3.5 w-3.5" /> },
  pending:    { cls: 'text-amber-600 bg-amber-50 border-amber-200',       label: 'KYC Pending',    icon: <ClockIcon className="h-3.5 w-3.5" /> },
  rejected:   { cls: 'text-red-600 bg-red-50 border-red-200',             label: 'KYC Rejected',   icon: <XCircleIcon className="h-3.5 w-3.5" /> },
  unverified: { cls: 'text-zinc-500 bg-zinc-100 border-zinc-200',         label: 'Unverified',     icon: <XCircleIcon className="h-3.5 w-3.5" /> },
}

const TS_STATUS: Record<string, { cls: string; label: string }> = {
  open:     { cls: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'Open' },
  approved: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Approved' },
  disputed: { cls: 'bg-red-50 text-red-600 border-red-200',             label: 'Disputed' },
}

const CHANGE_TO: Record<string, string[]> = {
  applied:   ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'rejected', 'cancelled'],
  completed: ['confirmed', 'cancelled'],
  rejected:  ['applied', 'confirmed'],
  cancelled: ['applied'],
}

const INR = '\u20B9'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StarDisplay({ value, label }: { value: number | null; label: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-zinc-400">{label}</p>
      {value == null ? (
        <p className="text-sm text-zinc-400 italic">Not rated</p>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <StarIcon
                key={n}
                className={cn('h-4 w-4', n <= value ? 'fill-amber-400 text-amber-400' : 'text-zinc-200')}
              />
            ))}
          </div>
          <span className="text-sm font-semibold text-zinc-800">{value}/5</span>
        </div>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-zinc-400">{children}</p>
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-zinc-100 last:border-0">
      <span className="shrink-0 text-xs text-zinc-400 w-32">{label}</span>
      <div className="text-right text-sm font-medium text-zinc-800 break-all">{children}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = APP_STATUS[status] ?? APP_STATUS.applied
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold', cfg.cls)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// Progress timeline
// ─────────────────────────────────────────────────────────────

function ApplicationTimeline({ status }: { status: string }) {
  const steps = [
    { key: 'applied',   label: 'Applied',   icon: <UserRoundIcon className="h-4 w-4" /> },
    { key: 'confirmed', label: 'Confirmed', icon: <CheckCircle2Icon className="h-4 w-4" /> },
    { key: 'completed', label: 'Completed', icon: <BriefcaseIcon className="h-4 w-4" /> },
  ]
  const isTerminal = status === 'rejected' || status === 'cancelled'
  const currentStep = APP_STATUS[status]?.step ?? 0

  return (
    <div className="flex items-center gap-0">
      {isTerminal ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 w-full">
          <XCircleIcon className="h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700 capitalize">{status}</p>
            <p className="text-xs text-red-400">This application was {status}.</p>
          </div>
        </div>
      ) : (
        <div className="flex w-full items-center">
          {steps.map((step, idx) => {
            const done = currentStep >= idx + 1
            const active = currentStep === idx + 1
            return (
              <div key={step.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors',
                    done ? 'border-emerald-500 bg-emerald-500 text-white'
                        : active ? 'border-zinc-300 bg-zinc-50 text-zinc-500'
                        : 'border-zinc-200 bg-white text-zinc-300',
                  )}>
                    {step.icon}
                  </div>
                  <span className={cn('text-[11px] font-semibold whitespace-nowrap',
                    done ? 'text-emerald-600' : 'text-zinc-400')}>
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={cn('mx-2 mb-5 h-0.5 flex-1 rounded-full', done ? 'bg-emerald-400' : 'bg-zinc-200')} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export function ApplicationDetailPage() {
  const { applicationId } = useParams<{ applicationId: string }>()
  const navigate = useNavigate()

  const [data, setData] = useState<ApplicationDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!applicationId) return
    setLoading(true)
    apiGet<{ data: ApplicationDetail }>(`/admin/applications/${applicationId}`)
      .then((r) => setData(r.data))
      .catch((e) => toast.error(e instanceof ApiRequestError ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [applicationId])

  async function updateStatus(newStatus: string) {
    if (!data) return
    const shiftId = data.shift?.id ?? ''
    try {
      await apiPatch(`/admin/shifts/${shiftId}/applications/${applicationId}`, { status: newStatus })
      toast.success(`Marked as ${APP_STATUS[newStatus]?.label ?? newStatus}`)
      setData((d) => d ? { ...d, status: newStatus as ApplicationDetail['status'] } : d)
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not update status')
    }
  }

  if (!applicationId) return <div className="p-8 text-sm text-zinc-400">Invalid route.</div>

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-zinc-400">Loading application…</p>
      </div>
    )
  }

  const w = data.worker
  const s = data.shift
  const ts = data.timesheet
  const u = data.user
  const kyc = w ? (KYC_CFG[w.kyc_status] ?? KYC_CFG.unverified) : null
  const tsCfg = ts ? (TS_STATUS[ts.status] ?? TS_STATUS.open) : null
  const transitions = CHANGE_TO[data.status] ?? []

  const scheduledHours = s?.start_time && s?.end_time ? (() => {
    const [sh, sm] = s.start_time.split(':').map(Number)
    const [eh, em] = s.end_time.split(':').map(Number)
    const diff = (eh * 60 + em) - (sh * 60 + sm)
    return diff > 0 ? diff / 60 : (diff + 24 * 60) / 60
  })() : null

  return (
    <div className="w-full min-h-screen bg-zinc-50">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" className="gap-1.5 shrink-0 text-zinc-400 hover:text-zinc-800" asChild>
              <Link to="/applications">
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Applications</span>
              </Link>
            </Button>
            <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
            <span className="truncate text-sm font-medium text-zinc-700">
              {w?.full_name ?? 'Application'} — {s?.title ?? 'Shift'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={data.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <MoreHorizontalIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs text-zinc-400">Change status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {transitions.length === 0 ? (
                  <DropdownMenuItem disabled className="text-xs text-zinc-400">No actions</DropdownMenuItem>
                ) : transitions.map((st) => {
                  const cfg = APP_STATUS[st]
                  return (
                    <DropdownMenuItem key={st} onClick={() => updateStatus(st)} className="gap-2 text-sm">
                      <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                      Mark as {cfg.label}
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuSeparator />
                {w && (
                  <DropdownMenuItem asChild>
                    <Link to={`/workers/${w.id}`} className="gap-2 text-sm">
                      <ExternalLinkIcon className="h-3.5 w-3.5 text-zinc-400" />
                      View worker profile
                    </Link>
                  </DropdownMenuItem>
                )}
                {s && (
                  <DropdownMenuItem asChild>
                    <Link to={`/shifts/${s.id}`} className="gap-2 text-sm">
                      <ExternalLinkIcon className="h-3.5 w-3.5 text-zinc-400" />
                      View shift
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="w-full p-4 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">

          {/* ── Left column ── */}
          <div className="space-y-5">

            {/* Application status timeline */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <SectionTitle>Application progress</SectionTitle>
              <ApplicationTimeline status={data.status} />
              <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
                <CalendarIcon className="h-3.5 w-3.5" />
                Applied on {fmtDateTime(data.applied_at)}
              </div>
            </div>

            {/* Timesheet */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <SectionTitle>Timesheet log</SectionTitle>
                {ts && tsCfg && (
                  <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', tsCfg.cls)}>
                    {tsCfg.label}
                  </span>
                )}
              </div>

              {!ts ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
                    <ClockIcon className="h-5 w-5 text-zinc-300" />
                  </div>
                  <p className="text-sm font-medium text-zinc-500">No timesheet yet</p>
                  <p className="text-xs text-zinc-400">Timesheet is created when the worker clocks in.</p>
                </div>
              ) : (
                <>
                  {/* Clock in/out hero */}
                  <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-center">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Clock in</p>
                      <p className="text-xl font-bold text-zinc-900">{fmtTime(ts.clock_in)}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">{fmtDate(ts.clock_in)}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-center">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Clock out</p>
                      <p className="text-xl font-bold text-zinc-900">{fmtTime(ts.clock_out)}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">{fmtDate(ts.clock_out)}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-center">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Hours</p>
                      <p className="text-xl font-bold text-zinc-900">
                        {ts.total_hours != null ? `${ts.total_hours.toFixed(2)}` : (scheduledHours ? scheduledHours.toFixed(1) : '—')}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-400">{ts.total_hours != null ? 'actual' : 'scheduled'}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-center">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Net pay</p>
                      <p className="text-xl font-bold text-emerald-600">
                        {ts.net_to_worker != null ? `${INR}${ts.net_to_worker.toFixed(0)}` : '—'}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-400">to worker</p>
                    </div>
                  </div>

                  {/* Earnings breakdown */}
                  <div className="mb-5 rounded-xl border border-zinc-100">
                    <SectionTitle>
                      <span className="px-0">Earnings breakdown</span>
                    </SectionTitle>
                    <div>
                      <InfoRow label="Gross earnings">
                        {ts.gross_amount != null ? <span className="font-semibold">{INR}{ts.gross_amount.toFixed(2)}</span> : 'Pending'}
                      </InfoRow>
                      <InfoRow label="Platform fee">
                        {ts.platform_fee != null ? <span className="text-red-500">- {INR}{ts.platform_fee.toFixed(2)}</span> : '—'}
                      </InfoRow>
                      <InfoRow label="Net to worker">
                        {ts.net_to_worker != null ? <span className="font-bold text-emerald-600">{INR}{ts.net_to_worker.toFixed(2)}</span> : 'Pending'}
                      </InfoRow>
                      {ts.approved_at && (
                        <InfoRow label="Approved at">
                          <span className="text-xs">{fmtDateTime(ts.approved_at)}</span>
                        </InfoRow>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  {(ts.clock_in_lat != null || ts.distance_from_venue_m != null) && (
                    <div className="mb-5 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Clock-in location</p>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        {ts.clock_in_lat != null && ts.clock_in_lng != null && (
                          <span className="flex items-center gap-1.5 text-zinc-600">
                            <Navigation2Icon className="h-3.5 w-3.5 text-zinc-400" />
                            {ts.clock_in_lat.toFixed(5)}, {ts.clock_in_lng.toFixed(5)}
                          </span>
                        )}
                        {ts.distance_from_venue_m != null && (
                          <span className="flex items-center gap-1.5 text-zinc-600">
                            <MapPinIcon className="h-3.5 w-3.5 text-zinc-400" />
                            {ts.distance_from_venue_m}m from venue
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Ratings */}
                  <div>
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Ratings</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                        <p className="mb-2 text-xs font-semibold text-zinc-500">Worker rated employer</p>
                        <StarDisplay value={ts.worker_rating_employer} label="" />
                      </div>
                      <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                        <p className="mb-2 text-xs font-semibold text-zinc-500">Employer rated worker</p>
                        <StarDisplay value={ts.employer_rating_worker} label="" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Shift info */}
            {s && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <SectionTitle>Shift details</SectionTitle>
                  <Link
                    to={`/shifts/${s.id}`}
                    className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
                  >
                    Open shift <ExternalLinkIcon className="h-3 w-3" />
                  </Link>
                </div>
                <Link
                  to={`/employers/${s.employer_id}`}
                  className="mb-4 flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 transition-colors hover:bg-zinc-100"
                >
                  {s.employer_logo_url ? (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white p-1">
                      <img
                        src={s.employer_logo_url}
                        alt={s.employer_name}
                        className="h-full w-full object-contain"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement!.querySelector('.fallback-icon') as HTMLElement)!.style.display = 'flex' }}
                      />
                      <div className="fallback-icon hidden h-full w-full items-center justify-center">
                        <BuildingIcon className="h-5 w-5 text-zinc-400" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                      <BuildingIcon className="h-5 w-5 text-zinc-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">{s.employer_name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      {s.employer_verified && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                          <ShieldCheckIcon className="h-3 w-3" />Verified
                        </span>
                      )}
                      <span className="flex items-center gap-0.5 text-xs text-zinc-400">
                        <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {s.employer_rating > 0 ? s.employer_rating.toFixed(1) : '—'}
                      </span>
                    </div>
                  </div>
                  <ExternalLinkIcon className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-300" />
                </Link>

                <h3 className="mb-3 text-base font-semibold text-zinc-900">{s.title}</h3>

                <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-500">
                  {s.date && (
                    <span className="flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5 text-zinc-400" />{s.date}</span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <ClockIcon className="h-3.5 w-3.5 text-zinc-400" />{s.start_time} – {s.end_time}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BanknoteIcon className="h-3.5 w-3.5 text-zinc-400" />{INR}{s.hourly_rate}/hr
                  </span>
                  {scheduledHours && (
                    <span className="flex items-center gap-1.5">
                      <TimerIcon className="h-3.5 w-3.5 text-zinc-400" />{scheduledHours.toFixed(1)} hrs scheduled
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-1.5 text-sm text-zinc-500">
                  <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <span>{s.address}</span>
                </div>

                {s.geofence_radius_m && (
                  <p className="mt-1.5 text-xs text-zinc-400">Geofence: {s.geofence_radius_m}m radius</p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="text-xs text-zinc-400">{s.slots_filled} / {s.slots_total} slots filled</span>
                  {/* Payment status derived from timesheet */}
                  {ts ? (
                    ts.approved_at ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Payment approved
                      </span>
                    ) : ts.net_to_worker != null ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        Awaiting approval
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                        Payment pending
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                      No timesheet
                    </span>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-5">

            {/* Worker card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <SectionTitle>Worker</SectionTitle>
              <div className="flex items-center gap-3 mb-4">
                {w?.avatar_url ? (
                  <img src={w.avatar_url} alt={w.full_name} className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-base font-bold text-zinc-500">
                    {w?.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <div className="min-w-0">
                  {w ? (
                    <>
                      <Link to={`/workers/${w.id}`} className="block truncate text-base font-semibold text-zinc-900 hover:underline">
                        {w.full_name}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {kyc && (
                          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold', kyc.cls)}>
                            {kyc.icon}{kyc.label}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <span className="text-sm italic text-zinc-400">Worker removed</span>
                  )}
                </div>
              </div>

              {w && (
                <>
                  {/* Rating */}
                  <div className="mb-4 flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
                    <div>
                      <p className="text-xs text-zinc-400">Overall rating</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <div className="flex">
                          {[1,2,3,4,5].map((n) => (
                            <StarIcon key={n} className={cn('h-3.5 w-3.5', n <= Math.round(w.rating_avg) ? 'fill-amber-400 text-amber-400' : 'text-zinc-200')} />
                          ))}
                        </div>
                        <span className="text-sm font-bold text-zinc-800">{w.rating_avg > 0 ? w.rating_avg.toFixed(1) : '—'}</span>
                        <span className="text-xs text-zinc-400">({w.rating_count} ratings)</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-400">Shifts done</p>
                      <p className="text-xl font-bold text-zinc-900">{w.total_shifts}</p>
                    </div>
                  </div>

                  <div>
                    {w.city && <InfoRow label="City"><span>{w.city}</span></InfoRow>}
                    {w.dob && <InfoRow label="Date of birth"><span>{fmtDate(w.dob)}</span></InfoRow>}
                    <InfoRow label="Work radius"><span>{w.radius_km} km</span></InfoRow>
                    {w.created_at && <InfoRow label="Member since"><span>{fmtDate(w.created_at)}</span></InfoRow>}
                  </div>
                </>
              )}
            </div>

            {/* Contact */}
            {u && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <SectionTitle>Contact</SectionTitle>
                <div className="space-y-3">
                  {u.phone && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                        <PhoneIcon className="h-3.5 w-3.5 text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400">Phone</p>
                        <p className="text-sm font-medium text-zinc-800">{u.phone}</p>
                      </div>
                    </div>
                  )}
                  {u.email && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                        <MailIcon className="h-3.5 w-3.5 text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400">Email</p>
                        <p className="text-sm font-medium text-zinc-800">{u.email}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                      <ShieldCheckIcon className="h-3.5 w-3.5 text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Account status</p>
                      <p className="text-sm font-medium text-zinc-800 capitalize">{u.status}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payout */}
            {w && (w.payout_masked_account || w.payout_upi_id) && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <SectionTitle>Payout details</SectionTitle>
                <div className="space-y-3">
                  {w.payout_account_holder && (
                    <InfoRow label="Account holder"><span>{w.payout_account_holder}</span></InfoRow>
                  )}
                  {w.payout_masked_account && (
                    <InfoRow label="Bank account"><span className="font-mono tracking-wide">{w.payout_masked_account}</span></InfoRow>
                  )}
                  {w.payout_upi_id && (
                    <InfoRow label="UPI ID"><span className="font-mono">{w.payout_upi_id}</span></InfoRow>
                  )}
                </div>
              </div>
            )}

            {/* Qualifications */}
            {data.qualifications.length > 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <div className="mb-3 flex items-center justify-between">
                  <SectionTitle>Qualifications</SectionTitle>
                  {w && (
                    <Link to={`/workers/${w.id}`} className="text-xs text-zinc-400 hover:text-zinc-700">
                      See all
                    </Link>
                  )}
                </div>
                <div className="space-y-3">
                  {data.qualifications.map((q) => (
                    <div key={q.id} className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                        <BriefcaseIcon className="h-3.5 w-3.5 text-zinc-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 leading-tight">{q.title}</p>
                        <p className="text-xs text-zinc-400">{q.institution}</p>
                        <p className="text-xs text-zinc-300">
                          {new Date(q.from_date).getFullYear()}
                          {q.to_date ? ` – ${new Date(q.to_date).getFullYear()}` : ' – present'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
