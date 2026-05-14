import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiRequestError, apiDeleteJson, apiGet, apiPatch } from '@/lib/api'
import type { AdminShiftDetail } from '@/types/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  CalendarIcon,
  CheckCircle2Icon,
  Clock3Icon,
  ExternalLinkIcon,
  LayersIcon,
  MapPinIcon,
  PencilIcon,
  SlidersHorizontalIcon,
  StarIcon,
  Trash2Icon,
  UserRoundIcon,
  UsersIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ShiftApplication = {
  application_id: string
  worker_profile_id: string
  status: 'applied' | 'confirmed' | 'rejected' | 'completed' | 'cancelled'
  applied_at: string
  worker: {
    full_name: string
    avatar_url: string | null
    city: string
    kyc_status: 'unverified' | 'pending' | 'approved' | 'rejected'
    rating_avg: number
    rating_count: number
    total_shifts: number
  } | null
  user: { id: string; email: string | null; phone: string | null } | null
}

// ─────────────────────────────────────────────────────────────
// Config maps
// ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  open: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Open' },
  filled: { cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Filled' },
  cancelled: { cls: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-500', label: 'Cancelled' },
}

const APP_STATUS_CONFIG: Record<string, { cls: string; label: string }> = {
  applied: { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Applied' },
  confirmed: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Confirmed' },
  rejected: { cls: 'bg-red-50 text-red-600 border-red-200', label: 'Rejected' },
  completed: { cls: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Completed' },
  cancelled: { cls: 'bg-zinc-100 text-zinc-500 border-zinc-200', label: 'Cancelled' },
}

const KYC_CONFIG: Record<string, { cls: string; label: string }> = {
  approved: { cls: 'bg-emerald-50 text-emerald-700', label: 'KYC Approved' },
  pending: { cls: 'bg-amber-50 text-amber-700', label: 'KYC Pending' },
  rejected: { cls: 'bg-red-50 text-red-600', label: 'KYC Rejected' },
  unverified: { cls: 'bg-zinc-100 text-zinc-500', label: 'Unverified' },
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export function ShiftDetailPage() {
  const { shiftId } = useParams<{ shiftId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AdminShiftDetail | null>(null)

  const [applications, setApplications] = useState<ShiftApplication[]>([])
  const [appsLoading, setAppsLoading] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!shiftId) return
    setLoading(true)
    apiGet<{ data: AdminShiftDetail }>(`/admin/shifts/${shiftId}`)
      .then((r) => setData(r.data))
      .catch((e) => toast.error(e instanceof ApiRequestError ? e.message : 'Failed to load shift'))
      .finally(() => setLoading(false))
  }, [shiftId])

  const loadApplications = useCallback(() => {
    if (!shiftId) return
    setAppsLoading(true)
    apiGet<{ data: { applications: ShiftApplication[] } }>(`/admin/shifts/${shiftId}/applications`)
      .then((r) => setApplications(r.data.applications))
      .catch(() => { })
      .finally(() => setAppsLoading(false))
  }, [shiftId])

  useEffect(() => {
    loadApplications()
  }, [loadApplications])

  async function updateAppStatus(applicationId: string, newStatus: string) {
    if (!shiftId) return
    try {
      await apiPatch(`/admin/shifts/${shiftId}/applications/${applicationId}`, { status: newStatus })
      toast.success('Application status updated')
      setApplications((prev) =>
        prev.map((a) =>
          a.application_id === applicationId
            ? { ...a, status: newStatus as ShiftApplication['status'] }
            : a
        )
      )
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not update status')
    }
  }

  function openDelete() {
    setDeleteText('')
    setDeleteOpen(true)
  }

  async function confirmDelete() {
    if (!shiftId || !data) return
    setDeleting(true)
    try {
      await apiDeleteJson(`/admin/shifts/${shiftId}`, { confirmation: deleteText.trim() })
      toast.success('Shift deleted')
      navigate('/shifts')
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not delete shift')
    } finally {
      setDeleting(false)
    }
  }

  if (!shiftId) return <div className="p-8 text-sm text-zinc-400">Invalid route.</div>

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-zinc-400">Loading shift…</p>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[data.status] ?? STATUS_CONFIG.open
  const fillPct = data.slots_total > 0 ? Math.round((data.slots_filled / data.slots_total) * 100) : 0

  return (
    <div className="w-full min-h-screen bg-zinc-50">

      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 shrink-0 text-zinc-400 hover:text-zinc-900" asChild>
              <Link to="/shifts">
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Shifts</span>
              </Link>
            </Button>
            <span className="text-zinc-300 hidden sm:inline">/</span>
            <span className="hidden sm:block truncate text-sm font-medium text-zinc-600">{data.title}</span>
            <span className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              statusCfg.cls
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full', statusCfg.dot)} />
              {statusCfg.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50" onClick={openDelete}>
              <Trash2Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
            <Button size="sm" className="gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800" onClick={() => navigate(`/shifts/${shiftId}/edit`)}>
              <PencilIcon className="h-3.5 w-3.5" />
              Edit shift
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 py-8 lg:px-8">

        {/* ── Hero ── */}
        <div className="mb-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">Shift Details</p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{data.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
            <span className="flex items-center gap-1.5"><BriefcaseIcon className="h-3.5 w-3.5 text-zinc-400" />{data.employer_name}</span>
            <span className="text-zinc-300">·</span>
            <span className="flex items-center gap-1.5"><LayersIcon className="h-3.5 w-3.5 text-zinc-400" />{data.category_name}</span>
            <span className="text-zinc-300">·</span>
            <span className="flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5 text-zinc-400" />{data.date || 'No date set'}</span>
            {data.start_time && data.end_time && (
              <>
                <span className="text-zinc-300">·</span>
                <span className="flex items-center gap-1.5"><Clock3Icon className="h-3.5 w-3.5 text-zinc-400" />{data.start_time} – {data.end_time}</span>
              </>
            )}
          </div>
        </div>

        {/* ── Stat strip ── */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat icon={<UsersIcon className="h-4 w-4" />} label="Applications" value={String(data.applications_count)} accent="zinc" />
          <MiniStat icon={<LayersIcon className="h-4 w-4" />} label="Timesheets" value={String(data.timesheets_count)} accent="zinc" />
          <MiniStat icon={<UsersIcon className="h-4 w-4" />} label="Slots" value={`${data.slots_filled} / ${data.slots_total}`} accent={fillPct >= 100 ? 'blue' : fillPct > 50 ? 'amber' : 'emerald'} />
          <MiniStat icon={<Clock3Icon className="h-4 w-4" />} label="Schedule" value={data.start_time && data.end_time ? `${data.start_time} – ${data.end_time}` : data.date || '—'} accent="zinc" />
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

          {/* LEFT */}
          <div className="space-y-4">

            {/* Shift details card */}
            <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">

              <ViewSection icon={<BriefcaseIcon className="h-4 w-4" />} title="Assignment" subtitle="Employer, category, and shift title">
                <div className="grid gap-4 sm:grid-cols-2">
                  <ViewField label="Employer" value={data.employer_name} />
                  <ViewField label="Category" value={data.category_name} />
                  <ViewField label="Shift title" value={data.title} className="sm:col-span-2" />
                  {data.description && (
                    <div className="sm:col-span-2">
                      <p className="mb-1.5 text-xs font-medium text-zinc-400">Description</p>
                      <div className="prose prose-sm max-w-none text-zinc-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: data.description }} />
                    </div>
                  )}
                </div>
              </ViewSection>

              <ViewSection icon={<CalendarIcon className="h-4 w-4" />} title="Schedule" subtitle="Date, times, and status">
                <div className="grid gap-4 sm:grid-cols-3">
                  <ViewField label="Date" value={data.date || '—'} />
                  <ViewField label="Start time" value={data.start_time || '—'} />
                  <ViewField label="End time" value={data.end_time || '—'} />
                  <div className="sm:col-span-3">
                    <p className="mb-1.5 text-xs font-medium text-zinc-400">Status</p>
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize', statusCfg.cls)}>
                      <span className={cn('h-2 w-2 rounded-full', statusCfg.dot)} />
                      {statusCfg.label}
                    </span>
                  </div>
                </div>
              </ViewSection>

              <ViewSection icon={<SlidersHorizontalIcon className="h-4 w-4" />} title="Capacity & pay" subtitle="Slots, hourly rate, and geofence radius">
                <div className="grid gap-x-8 gap-y-5 sm:grid-cols-4">
                  <ViewField label="Hourly rate" value={`₹${data.hourly_rate}/hr`} />
                  <ViewField label="Slots total" value={String(data.slots_total)} />
                  <ViewField label="Slots filled" value={String(data.slots_filled)} />
                  <ViewField label="Geofence" value={`${data.geofence_radius_m} m`} />
                </div>
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Fill rate</span>
                    <span className="font-semibold text-zinc-800">{fillPct}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div className={cn('h-2.5 rounded-full transition-all duration-700', fillPct >= 100 ? 'bg-blue-500' : fillPct > 50 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${fillPct}%` }} />
                  </div>
                </div>
              </ViewSection>

              <ViewSection icon={<MapPinIcon className="h-4 w-4" />} title="Location" subtitle="Shift address and coordinates">
                <div className="grid gap-4 sm:grid-cols-2">
                  <ViewField label="Address" value={data.address || '—'} className="sm:col-span-2" />
                  <ViewField label="Latitude" value={data.location_lat ? String(data.location_lat) : '—'} />
                  <ViewField label="Longitude" value={data.location_lng ? String(data.location_lng) : '—'} />
                </div>
              </ViewSection>

            </div>

            {/* ── Applications section ── */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
                    <UsersIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900">Applicants</p>
                    <p className="text-xs text-zinc-400">Workers who applied for this shift</p>
                  </div>
                </div>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
                  {applications.length}
                </span>
              </div>

              {appsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-zinc-400">Loading applicants…</p>
                </div>
              ) : applications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
                    <UserRoundIcon className="h-5 w-5 text-zinc-400" />
                  </div>
                  <p className="text-sm font-medium text-zinc-500">No applications yet</p>
                  <p className="text-xs text-zinc-400">Workers will appear here once they apply.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {applications.map((app) => (
                    <ApplicationRow
                      key={app.application_id}
                      app={app}
                      onStatusChange={(newStatus) => updateAppStatus(app.application_id, newStatus)}
                      onNavigate={() => navigate(`/workers/${app.worker_profile_id}`)}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT: sidebar */}
          <div className="space-y-4">

            {/* Quick actions */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">Actions</p>
              <div className="space-y-2">
                <Button className="w-full gap-2 bg-zinc-900 text-white hover:bg-zinc-800" onClick={() => navigate(`/shifts/${shiftId}/edit`)}>
                  <PencilIcon className="h-3.5 w-3.5" />
                  Edit shift details
                </Button>
                <Button variant="outline" className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50" onClick={openDelete}>
                  <Trash2Icon className="h-3.5 w-3.5" />
                  Delete shift
                </Button>
              </div>
            </div>

            {/* Snapshot */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Shift snapshot</p>
              </div>
              <div className="divide-y divide-zinc-100">
                <SidebarRow label="Status">
                  <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase', statusCfg.cls)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', statusCfg.dot)} />
                    {statusCfg.label}
                  </span>
                </SidebarRow>
                <SidebarRow label="Employer" value={data.employer_name} />
                <SidebarRow label="Category" value={data.category_name} />
                <SidebarRow label="Date" value={data.date || '—'} />
                <SidebarRow label="Time" value={data.start_time && data.end_time ? `${data.start_time} – ${data.end_time}` : '—'} />
                <SidebarRow label="Rate" value={`₹${data.hourly_rate}/hr`} />
                <SidebarRow label="Geofence" value={`${data.geofence_radius_m} m`} />
              </div>
            </div>

            {/* Fill card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">Fill progress</p>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-zinc-900">{data.slots_filled}</p>
                  <p className="text-xs text-zinc-400">of {data.slots_total} slots filled</p>
                </div>
                <div className="text-right">
                  <p className={cn('text-2xl font-bold', fillPct >= 100 ? 'text-blue-600' : fillPct > 50 ? 'text-amber-600' : 'text-emerald-600')}>{fillPct}%</p>
                  <p className="text-xs text-zinc-400">fill rate</p>
                </div>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100">
                <div className={cn('h-3 rounded-full transition-all duration-700', fillPct >= 100 ? 'bg-blue-500' : fillPct > 50 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${fillPct}%` }} />
              </div>
            </div>

            {/* Activity */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Activity</p>
              </div>
              <div className="divide-y divide-zinc-100">
                <SidebarRow label="Applications" value={String(data.applications_count)} valueClass="font-bold text-zinc-900" />
                <SidebarRow label="Timesheets" value={String(data.timesheets_count)} valueClass="font-bold text-zinc-900" />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Delete confirmation dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete shift permanently?</DialogTitle>
            <DialogDescription>
              This cannot be undone. Type{' '}
              <span className="font-semibold text-zinc-900">{data.title}</span>{' '}
              to confirm deletion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs text-zinc-500">Shift name</Label>
            <Input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder={data.title}
              className="border-zinc-200"
              onKeyDown={(e) => { if (e.key === 'Enter' && deleteText.trim() === data.title) confirmDelete() }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-200" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" disabled={deleting || deleteText.trim() !== data.title} onClick={confirmDelete}>
              {deleting ? 'Deleting…' : 'Delete shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Application row
// ─────────────────────────────────────────────────────────────

function ApplicationRow({
  app,
  onStatusChange,
  onNavigate,
}: {
  app: ShiftApplication
  onStatusChange: (s: string) => void
  onNavigate: () => void
}) {
  const w = app.worker
  const kycCfg = KYC_CONFIG[w?.kyc_status ?? 'unverified']
  const appCfg = APP_STATUS_CONFIG[app.status] ?? APP_STATUS_CONFIG.applied
  const initials = w?.full_name?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  const appliedDate = new Date(app.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-start">

      {/* Avatar */}
      <div className="shrink-0">
        {w?.avatar_url ? (
          <img src={w.avatar_url} alt={w.full_name} className="h-12 w-12 rounded-full object-cover ring-2 ring-zinc-100" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-600 ring-2 ring-zinc-100">
            {initials}
          </div>
        )}
      </div>

      {/* Worker info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onNavigate}
            className="text-sm font-semibold text-zinc-900 hover:text-zinc-600 hover:underline underline-offset-2 transition-colors"
          >
            {w?.full_name ?? 'Unknown worker'}
          </button>
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', appCfg.cls)}>
            {appCfg.label}
          </span>
          {w && (
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', kycCfg.cls)}>
              {kycCfg.label}
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          {w?.city && (
            <span className="flex items-center gap-1">
              <MapPinIcon className="h-3 w-3" />
              {w.city}
            </span>
          )}
          {w && w.rating_count > 0 && (
            <span className="flex items-center gap-0.5">
              <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
              {w.rating_avg.toFixed(1)}
              <span className="text-zinc-400">({w.rating_count})</span>
            </span>
          )}
          {w && (
            <span className="flex items-center gap-1">
              <CheckCircle2Icon className="h-3 w-3 text-emerald-500" />
              {w.total_shifts} shifts completed
            </span>
          )}
          <span className="text-zinc-400">Applied {appliedDate}</span>
        </div>

        {app.user && (app.user.email || app.user.phone) && (
          <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-zinc-400">
            {app.user.email && <span>{app.user.email}</span>}
            {app.user.phone && <span>{app.user.phone}</span>}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Select value={app.status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-8 w-36 rounded-lg border-zinc-200 px-3 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-lg border-zinc-200 px-3 text-xs text-zinc-600 hover:text-zinc-900"
          onClick={onNavigate}
        >
          <ExternalLinkIcon className="h-3 w-3" />
          Profile
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Layout helpers
// ─────────────────────────────────────────────────────────────

function MiniStat({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent: 'zinc' | 'blue' | 'amber' | 'emerald' }) {
  const accentMap = { zinc: 'text-zinc-900', blue: 'text-blue-600', amber: 'text-amber-600', emerald: 'text-emerald-600' }
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4">
      <div className="mb-2 flex items-center gap-1.5 text-zinc-400">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-widest">{label}</p>
      </div>
      <p className={cn('truncate text-xl font-bold', accentMap[accent])}>{value}</p>
    </div>
  )
}

function ViewSection({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-start gap-3 px-6 py-5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">{icon}</div>
        <div>
          <p className="font-semibold text-zinc-900">{title}</p>
          <p className="text-xs text-zinc-400">{subtitle}</p>
        </div>
      </div>
      <div className="px-6 pb-6">{children}</div>
    </div>
  )
}

function ViewField({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn(className)}>
      <p className="mb-1 text-xs font-medium text-zinc-400">{label}</p>
      <p className="text-sm font-medium text-zinc-800">{value}</p>
    </div>
  )
}

function SidebarRow({ label, value, valueClass, children }: { label: string; value?: string; valueClass?: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <span className="shrink-0 text-xs text-zinc-400">{label}</span>
      {children ?? <span className={cn('truncate text-right text-xs font-medium text-zinc-700', valueClass)}>{value}</span>}
    </div>
  )
}
