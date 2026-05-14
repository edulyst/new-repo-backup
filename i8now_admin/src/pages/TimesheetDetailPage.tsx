import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiRequestError, apiGet, apiPost } from '@/lib/api'
import { fmtDate, fmtDateTime, fmtDuration, fmtMoney, fmtRating } from '@/lib/fmt'
import type { AdminTimesheetDetail } from '@/types/admin'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  ArrowLeftIcon,
  BadgeCheckIcon,
  BanknoteIcon,
  BriefcaseIcon,
  Building2Icon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  Navigation2Icon,
  StarIcon,
  TimerIcon,
  UserRoundIcon,
  XCircleIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────

const TS_STATUS: Record<string, { cls: string; dot: string; label: string }> = {
  open:     { cls: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400',   label: 'Open' },
  pending:  { cls: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400',   label: 'Pending' },
  approved: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Approved' },
  disputed: { cls: 'bg-red-50 text-red-600 border-red-200',             dot: 'bg-red-500',     label: 'Disputed' },
}

const INR = '\u20B9'
const STAR_VALUES = [1, 2, 3, 4, 5]

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-zinc-400">{children}</p>
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-2.5 last:border-0">
      <span className="w-36 shrink-0 text-xs text-zinc-400">{label}</span>
      <div className="text-right text-sm font-medium text-zinc-800">{children}</div>
    </div>
  )
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {STAR_VALUES.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
        >
          <StarIcon className={cn('h-6 w-6 transition-colors', n <= value ? 'fill-amber-400 text-amber-400' : 'text-zinc-200 hover:text-amber-200')} />
        </button>
      ))}
      <span className="ml-2 text-sm font-semibold text-zinc-700">{value}/5</span>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-center">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{label}</p>
      <div className="text-xl font-bold text-zinc-900">{value}</div>
      {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export function TimesheetDetailPage() {
  const { timesheetId } = useParams<{ timesheetId: string }>()
  const navigate = useNavigate()

  const [data, setData]       = useState<AdminTimesheetDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [stars, setStars]     = useState(5)

  function reload() {
    if (!timesheetId) return
    apiGet<{ data: AdminTimesheetDetail }>(`/admin/timesheets/${timesheetId}`)
      .then((r) => { setData(r.data); setStars(5) })
      .catch((e) => toast.error(e instanceof ApiRequestError ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    reload()
  }, [timesheetId])

  async function approve() {
    if (!timesheetId || !data) return
    setSaving(true)
    try {
      await apiPost(`/admin/timesheets/${timesheetId}/approve`, {})
      toast.success('Timesheet approved.')
      setData((d) => d ? { ...d, status: 'approved', approved_at: new Date().toISOString() } : d)
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not approve')
    } finally { setSaving(false) }
  }

  async function saveWorkerRating() {
    if (!timesheetId || !data) return
    if (stars < 1 || stars > 5) return
    setSaving(true)
    try {
      await apiPost(`/admin/timesheets/${timesheetId}/rate-worker`, { stars })
      toast.success('Worker rating saved — profile average updated.')
      reload()
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not save rating')
    } finally { setSaving(false) }
  }

  if (!timesheetId) return <div className="p-8 text-sm text-zinc-400">Invalid route.</div>

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-zinc-400">Loading timesheet…</p>
      </div>
    )
  }

  const cfg = TS_STATUS[data.status] ?? TS_STATUS.pending
  const isApproved = data.status === 'approved' || data.status === 'paid'
  const canApprove = data.status === 'pending' || data.status === 'open'
  const canRateWorker = isApproved && data.employer_rating_worker == null

  const scheduledHours = data.shift?.start_time && data.shift?.end_time ? (() => {
    const [sh, sm] = data.shift.start_time.split(':').map(Number)
    const [eh, em] = data.shift.end_time.split(':').map(Number)
    const diff = (eh * 60 + em) - (sh * 60 + sm)
    return (diff > 0 ? diff : diff + 24 * 60) / 60
  })() : null

  return (
    <div className="w-full min-h-screen bg-zinc-50">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" className="gap-1.5 shrink-0 text-zinc-400 hover:text-zinc-800" asChild>
              <Link to="/timesheets">
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Timesheets</span>
              </Link>
            </Button>
            <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
            <span className="truncate text-sm font-medium text-zinc-700">
              {data.shift?.title ?? 'Timesheet'} — {data.worker?.full_name ?? 'Worker'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold', cfg.cls)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
              {cfg.label}
            </span>
            {canApprove && (
              <Button size="sm" onClick={approve} disabled={saving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2Icon className="h-3.5 w-3.5" />
                {saving ? 'Approving…' : 'Approve'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="w-full p-4 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">

          {/* ── Left column ── */}
          <div className="space-y-5">

            {/* Clock-in / out hero stats */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <SectionTitle>Time record</SectionTitle>
              <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard
                  label="Clock in"
                  value={data.clock_in ? new Date(data.clock_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                  sub={fmtDate(data.clock_in)}
                />
                <StatCard
                  label="Clock out"
                  value={data.clock_out ? new Date(data.clock_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                  sub={data.clock_out ? fmtDate(data.clock_out) : 'Not recorded'}
                />
                <StatCard
                  label="Hours worked"
                  value={fmtDuration(data.total_hours)}
                  sub={data.total_hours != null ? 'actual' : 'pending'}
                />
                <StatCard
                  label="Net pay"
                  value={<span className="text-emerald-600">{fmtMoney(data.net_to_worker)}</span>}
                  sub="to worker"
                />
              </div>

              {/* Full timestamps + location */}
              <div>
                <InfoRow label="Clock in (full)">{fmtDateTime(data.clock_in)}</InfoRow>
                <InfoRow label="Clock out (full)">{fmtDateTime(data.clock_out)}</InfoRow>
                {data.approved_at && (
                  <InfoRow label="Approved at">
                    <span className="flex items-center justify-end gap-1 text-emerald-600">
                      <CheckCircle2Icon className="h-3.5 w-3.5" />
                      {fmtDateTime(data.approved_at)}
                    </span>
                  </InfoRow>
                )}
                {data.distance_from_venue_m != null && (
                  <InfoRow label="Distance from venue">
                    <span className="flex items-center justify-end gap-1">
                      <Navigation2Icon className="h-3.5 w-3.5 text-zinc-400" />
                      {data.distance_from_venue_m}m
                    </span>
                  </InfoRow>
                )}
                {data.clock_in_lat != null && data.clock_in_lng != null && (
                  <InfoRow label="Clock-in location">
                    <span className="font-mono text-xs">{data.clock_in_lat.toFixed(5)}, {data.clock_in_lng.toFixed(5)}</span>
                  </InfoRow>
                )}
              </div>
            </div>

            {/* Earnings breakdown */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <SectionTitle>Earnings breakdown</SectionTitle>
              <InfoRow label="Hourly rate">
                <span>{data.shift ? `${INR}${data.shift.hourly_rate}/hr` : '—'}</span>
              </InfoRow>
              {scheduledHours && (
                <InfoRow label="Scheduled hours">
                  <span>{scheduledHours.toFixed(1)} hrs</span>
                </InfoRow>
              )}
              <InfoRow label="Actual hours">
                <span>{fmtDuration(data.total_hours)}</span>
              </InfoRow>
              <InfoRow label="Gross earnings">
                <span className="font-semibold">{fmtMoney(data.gross_amount)}</span>
              </InfoRow>
              <InfoRow label="Platform fee">
                {data.platform_fee != null
                  ? <span className="text-red-500">- {fmtMoney(data.platform_fee)}</span>
                  : '—'}
              </InfoRow>
              <InfoRow label="Net to worker">
                <span className="text-lg font-bold text-emerald-600">{fmtMoney(data.net_to_worker)}</span>
              </InfoRow>
            </div>

            {/* Ratings */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <SectionTitle>Shift ratings</SectionTitle>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Worker → Employer */}
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                  <p className="mb-2 text-xs font-semibold text-zinc-500">Worker rated employer</p>
                  {data.worker_rating_employer != null ? (
                    <div className="flex items-center gap-1.5">
                      <div className="flex">
                        {STAR_VALUES.map((n) => (
                          <StarIcon key={n} className={cn('h-4 w-4', n <= data.worker_rating_employer! ? 'fill-amber-400 text-amber-400' : 'text-zinc-200')} />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-zinc-700">{data.worker_rating_employer}/5</span>
                    </div>
                  ) : (
                    <p className="text-sm italic text-zinc-400">Not yet rated</p>
                  )}
                </div>

                {/* Employer → Worker */}
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                  <p className="mb-2 text-xs font-semibold text-zinc-500">Employer rated worker</p>
                  {data.employer_rating_worker != null ? (
                    <div className="flex items-center gap-1.5">
                      <div className="flex">
                        {STAR_VALUES.map((n) => (
                          <StarIcon key={n} className={cn('h-4 w-4', n <= data.employer_rating_worker! ? 'fill-amber-400 text-amber-400' : 'text-zinc-200')} />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-zinc-700">{data.employer_rating_worker}/5</span>
                    </div>
                  ) : (
                    <p className="text-sm italic text-zinc-400">Not yet rated</p>
                  )}
                </div>
              </div>

              {/* Admin: rate worker on behalf of employer */}
              {canRateWorker && (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="mb-1 text-sm font-semibold text-blue-800">Record employer → worker rating</p>
                  <p className="mb-3 text-xs text-blue-500">This updates the worker's profile rating average.</p>
                  <StarPicker value={stars} onChange={setStars} />
                  <Button
                    className="mt-3 h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={saveWorkerRating}
                    disabled={saving}
                  >
                    <StarIcon className="h-3.5 w-3.5" />
                    {saving ? 'Saving…' : 'Save rating'}
                  </Button>
                </div>
              )}

              {/* Approve CTA (also in top bar, repeated for discoverability) */}
              {canApprove && (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="mb-1 text-sm font-semibold text-emerald-800">Approve this timesheet</p>
                  <p className="mb-3 text-xs text-emerald-600">Approving confirms the hours and unlocks rating actions.</p>
                  <Button
                    onClick={approve}
                    disabled={saving}
                    className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2Icon className="h-3.5 w-3.5" />
                    {saving ? 'Approving…' : 'Approve timesheet'}
                  </Button>
                </div>
              )}
            </div>

          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-5">

            {/* Worker */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <SectionTitle>Worker</SectionTitle>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-base font-bold text-zinc-500">
                  {data.worker?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  {data.worker ? (
                    <>
                      <Link to={`/workers/${data.worker.id}`} className="block truncate text-sm font-semibold text-zinc-900 hover:underline">
                        {data.worker.full_name}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        {data.worker.city && (
                          <span className="flex items-center gap-0.5 text-zinc-400">
                            <MapPinIcon className="h-3 w-3" />{data.worker.city}
                          </span>
                        )}
                        <span className={cn('font-semibold capitalize',
                          data.worker.kyc_status === 'approved' ? 'text-emerald-600' : 'text-zinc-400')}>
                          {data.worker.kyc_status === 'approved'
                            ? <BadgeCheckIcon className="inline h-3.5 w-3.5 mr-0.5" />
                            : null}
                          {data.worker.kyc_status}
                        </span>
                      </div>
                    </>
                  ) : (
                    <span className="text-sm italic text-zinc-400">Worker removed</span>
                  )}
                </div>
              </div>
              {data.worker && (
                <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
                  <div>
                    <p className="text-xs text-zinc-400">Overall rating</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <div className="flex">
                        {STAR_VALUES.map((n) => (
                          <StarIcon key={n} className={cn('h-3.5 w-3.5', n <= Math.round(data.worker!.rating_avg) ? 'fill-amber-400 text-amber-400' : 'text-zinc-200')} />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-zinc-800">{fmtRating(data.worker.rating_avg)}</span>
                    </div>
                  </div>
                  <Link to={`/workers/${data.worker.id}`} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700">
                    Profile <ExternalLinkIcon className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>

            {/* Shift */}
            {data.shift && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <div className="mb-3 flex items-center justify-between">
                  <SectionTitle>Shift</SectionTitle>
                  <Link to={`/shifts/${data.shift.id}`} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700">
                    Open <ExternalLinkIcon className="h-3 w-3" />
                  </Link>
                </div>
                <p className="mb-3 text-sm font-semibold text-zinc-900">{data.shift.title}</p>
                <div className="space-y-2 text-xs text-zinc-500">
                  {data.shift.date && (
                    <div className="flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5 text-zinc-400" />{fmtDate(data.shift.date)}</div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <ClockIcon className="h-3.5 w-3.5 text-zinc-400" />
                    {data.shift.start_time} – {data.shift.end_time}
                    {scheduledHours && <span className="ml-1 text-zinc-400">({scheduledHours.toFixed(1)} hrs)</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BanknoteIcon className="h-3.5 w-3.5 text-zinc-400" />
                    {INR}{data.shift.hourly_rate}/hr
                  </div>
                  {data.shift.address && (
                    <div className="flex items-start gap-1.5">
                      <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                      <span>{data.shift.address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Employer */}
            {data.employer && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <SectionTitle>Employer</SectionTitle>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 border">
                    <Building2Icon className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">{data.employer.company_name}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs">
                      {data.employer.verified && (
                        <span className="flex items-center gap-0.5 font-semibold text-emerald-600">
                          <BadgeCheckIcon className="h-3 w-3" />Verified
                        </span>
                      )}
                      <span className="flex items-center gap-0.5 text-zinc-400">
                        <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {fmtRating(data.employer.rating_avg)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ID reference */}
            <div className="rounded-2xl border border-zinc-100 bg-white px-5 py-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Reference</p>
              <p className="font-mono text-xs text-zinc-400 break-all">{data.id}</p>
              {data.application_id && (
                <p className="mt-1 font-mono text-xs text-zinc-300 break-all">{data.application_id}</p>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
