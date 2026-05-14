import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiRequestError, apiGet, apiPatch } from '@/lib/api'
import type { AdminShiftDetail } from '@/types/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { AddressMapPicker } from '@/components/ui/address-map-picker'
import { toast } from 'sonner'
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  CalendarIcon,
  CheckIcon,
  Clock3Icon,
  ExternalLinkIcon,
  MapPinIcon,
  SlidersHorizontalIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type EmployerOption = { id: string; company_name: string }
type CategoryOption = { id: string; name: string }

const STATUS_CONFIG = {
  open: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  filled: { cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  cancelled: { cls: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-500' },
}

export function ShiftEditPage() {
  const { shiftId } = useParams<{ shiftId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<AdminShiftDetail | null>(null)
  const [employers, setEmployers] = useState<EmployerOption[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [form, setForm] = useState({
    employer_id: '',
    category_id: '',
    title: '',
    description: '',
    date: '',
    start_time: '',
    end_time: '',
    hourly_rate: '',
    slots_total: '',
    slots_filled: '',
    status: 'open' as 'open' | 'filled' | 'cancelled',
    address: '',
    location_lat: '',
    location_lng: '',
    geofence_radius_m: '',
  })
  const timeOptions = useMemo(() => buildTimeOptions(), [])

  useEffect(() => {
    apiGet<{ data: { employers: EmployerOption[] } }>('/admin/employers?page=1&limit=100')
      .then((r) => setEmployers(r.data.employers))
      .catch(() => { })
    apiGet<{ data: { categories: CategoryOption[] } }>('/admin/shifts-categories')
      .then((r) => setCategories(r.data.categories))
      .catch(() => { })
  }, [])

  useEffect(() => {
    if (!shiftId) return
    setLoading(true)
    apiGet<{ data: AdminShiftDetail }>(`/admin/shifts/${shiftId}`)
      .then((r) => {
        setData(r.data)
        setForm({
          employer_id: r.data.employer_id,
          category_id: r.data.category_id,
          title: r.data.title,
          description: r.data.description,
          date: r.data.date,
          start_time: r.data.start_time,
          end_time: r.data.end_time,
          hourly_rate: String(r.data.hourly_rate),
          slots_total: String(r.data.slots_total),
          slots_filled: String(r.data.slots_filled),
          status: r.data.status,
          address: r.data.address,
          location_lat: String(r.data.location_lat),
          location_lng: String(r.data.location_lng),
          geofence_radius_m: String(r.data.geofence_radius_m),
        })
      })
      .catch((e) => toast.error(e instanceof ApiRequestError ? e.message : 'Failed to load shift'))
      .finally(() => setLoading(false))
  }, [shiftId])

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function save() {
    if (!shiftId) return
    if (!form.employer_id || !form.category_id) {
      toast.error('Select employer and category.')
      return
    }
    if (!form.address.trim() || form.location_lat === '' || form.location_lng === '') {
      toast.error('Select shift location from address suggestions or map.')
      return
    }
    setSaving(true)
    try {
      await apiPatch(`/admin/shifts/${shiftId}`, {
        employer_id: form.employer_id,
        category_id: form.category_id,
        title: form.title.trim(),
        description: normalizeRichText(form.description),
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        hourly_rate: Number(form.hourly_rate),
        slots_total: Number(form.slots_total),
        slots_filled: Number(form.slots_filled),
        status: form.status,
        address: form.address.trim(),
        location_lat: Number(form.location_lat),
        location_lng: Number(form.location_lng),
        geofence_radius_m: Number(form.geofence_radius_m),
      })
      toast.success('Shift saved successfully')
      navigate(`/shifts/${shiftId}`)
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not save shift')
    } finally {
      setSaving(false)
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

  const statusCfg = STATUS_CONFIG[form.status] ?? STATUS_CONFIG.open
  const fillPct = Number(form.slots_total) > 0
    ? Math.round((Number(form.slots_filled) / Number(form.slots_total)) * 100)
    : 0

  return (
    <div className="w-full min-h-screen bg-zinc-50">

      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 shrink-0 text-zinc-400 hover:text-zinc-900" asChild>
              <Link to={`/shifts/${shiftId}`}>
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Back to details</span>
              </Link>
            </Button>
            <span className="text-zinc-300 hidden sm:inline">/</span>
            <span className="hidden sm:block truncate text-sm font-medium text-zinc-600">{data.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-zinc-600"
              onClick={() => navigate(`/shifts/${shiftId}`)}
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View details</span>
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 min-w-[120px]"
              onClick={save}
              disabled={saving}
            >
              {saving ? (
                'Saving…'
              ) : (
                <>
                  <CheckIcon className="h-3.5 w-3.5" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 py-8 lg:px-8">

        {/* ── Page hero ── */}
        <div className="mb-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">Editing Shift</p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{data.title}</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            {data.employer_name} &middot; {data.category_name}
          </p>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

          {/* LEFT: form */}
          <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">

            {/* Assignment */}
            <SectionBlock
              icon={<BriefcaseIcon className="h-4 w-4" />}
              title="Assignment"
              subtitle="Employer, category, and shift title"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <FieldBlock label="Employer">
                  <Select value={form.employer_id} onValueChange={(v) => set('employer_id', v)}>
                    <SelectTrigger className="h-[54px] w-full rounded-xl border-zinc-200 px-4 text-sm">
                      <SelectValue placeholder="Select employer" />
                    </SelectTrigger>
                    <SelectContent>
                      {employers.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.company_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldBlock>
                <FieldBlock label="Category">
                  <Select value={form.category_id} onValueChange={(v) => set('category_id', v)}>
                    <SelectTrigger className="h-[54px] w-full rounded-xl border-zinc-200 px-4 text-sm">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldBlock>
                <FieldBlock label="Shift title" className="sm:col-span-2">
                  <Input
                    className="h-[54px] rounded-xl border-zinc-200 px-4 text-sm"
                    placeholder="e.g. Morning warehouse loading shift"
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                  />
                </FieldBlock>
                <FieldBlock label="Description" className="sm:col-span-2">
                  <RichTextEditor
                    value={form.description}
                    onChange={(value) => set('description', value)}
                    placeholder="Shift summary, worker instructions, and reporting notes."
                  />
                </FieldBlock>
              </div>
            </SectionBlock>

            {/* Schedule */}
            <SectionBlock
              icon={<CalendarIcon className="h-4 w-4" />}
              title="Schedule"
              subtitle="Date, start & end times, and current status"
            >
              <div className="grid gap-5 sm:grid-cols-3">
                <FieldBlock label="Date">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          'h-[54px] w-full justify-between rounded-xl border-zinc-200 px-4 font-normal text-sm',
                          !form.date && 'text-zinc-400'
                        )}
                      >
                        {form.date || 'Select date'}
                        <CalendarIcon className="h-4 w-4 text-zinc-400" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.date ? new Date(`${form.date}T00:00:00`) : undefined}
                        onSelect={(d) => set('date', d ? toYmd(d) : '')}
                      />
                    </PopoverContent>
                  </Popover>
                </FieldBlock>
                <FieldBlock label="Start time">
                  <Select value={form.start_time} onValueChange={(v) => set('start_time', v)}>
                    <SelectTrigger className="h-[54px] rounded-xl border-zinc-200 px-4 text-sm">
                      <Clock3Icon className="mr-2 h-4 w-4 shrink-0 text-zinc-400" />
                      <SelectValue placeholder="Start" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldBlock>
                <FieldBlock label="End time">
                  <Select value={form.end_time} onValueChange={(v) => set('end_time', v)}>
                    <SelectTrigger className="h-[54px] rounded-xl border-zinc-200 px-4 text-sm">
                      <Clock3Icon className="mr-2 h-4 w-4 shrink-0 text-zinc-400" />
                      <SelectValue placeholder="End" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldBlock>

                {/* Status pills */}
                <div className="sm:col-span-3">
                  <Label className="mb-2.5 block text-xs font-medium text-zinc-500">Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {(['open', 'filled', 'cancelled'] as const).map((s) => {
                      const cfg = STATUS_CONFIG[s]
                      const active = form.status === s
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => set('status', s)}
                          className={cn(
                            'inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold capitalize transition-all',
                            active
                              ? cfg.cls
                              : 'border-zinc-200 bg-zinc-50 text-zinc-400 hover:border-zinc-300 hover:bg-white hover:text-zinc-700'
                          )}
                        >
                          <span className={cn('h-2 w-2 rounded-full', active ? cfg.dot : 'bg-zinc-300')} />
                          {s}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </SectionBlock>

            {/* Capacity & Pay */}
            <SectionBlock
              icon={<SlidersHorizontalIcon className="h-4 w-4" />}
              title="Capacity & pay"
              subtitle="Slots, fill count, hourly rate, and geofence radius"
            >
              <div className="grid gap-5 sm:grid-cols-4">
                <FieldBlock label="Hourly rate (₹)">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-400">₹</span>
                    <Input
                      type="number"
                      className="h-[54px] rounded-xl border-zinc-200 pl-9 pr-4 text-sm"
                      placeholder="12.00"
                      value={form.hourly_rate}
                      onChange={(e) => set('hourly_rate', e.target.value)}
                    />
                  </div>
                </FieldBlock>
                <FieldBlock label="Slots total">
                  <Input
                    type="number"
                    className="h-[54px] rounded-xl border-zinc-200 px-4 text-sm"
                    placeholder="8"
                    value={form.slots_total}
                    onChange={(e) => set('slots_total', e.target.value)}
                  />
                </FieldBlock>
                <FieldBlock label="Slots filled">
                  <Input
                    type="number"
                    className="h-[54px] rounded-xl border-zinc-200 px-4 text-sm"
                    placeholder="3"
                    value={form.slots_filled}
                    onChange={(e) => set('slots_filled', e.target.value)}
                  />
                </FieldBlock>
                <FieldBlock label="Geofence radius">
                  <div className="relative">
                    <Input
                      type="number"
                      className="h-[54px] rounded-xl border-zinc-200 px-4 pr-11 text-sm"
                      placeholder="200"
                      value={form.geofence_radius_m}
                      onChange={(e) => set('geofence_radius_m', e.target.value)}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-400">m</span>
                  </div>
                </FieldBlock>
              </div>

              {/* Fill progress */}
              {form.slots_total && (
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Live fill preview</span>
                    <span className="font-semibold text-zinc-800">
                      {form.slots_filled || 0} / {form.slots_total} — {fillPct}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={cn(
                        'h-2.5 rounded-full transition-all duration-500',
                        fillPct >= 100 ? 'bg-blue-500' : fillPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      )}
                      style={{ width: `${Math.min(fillPct, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </SectionBlock>

            {/* Location */}
            <SectionBlock
              icon={<MapPinIcon className="h-4 w-4" />}
              title="Location"
              subtitle="Shift address and map pin for worker check-in"
            >
              <AddressMapPicker
                label=""
                placeholder="Search venue address"
                value={form.address}
                lat={form.location_lat ? Number(form.location_lat) : null}
                lng={form.location_lng ? Number(form.location_lng) : null}
                onValueChange={(next) => set('address', next)}
                onLocationPick={({ address, lat, lng }) =>
                  setForm((f) => ({
                    ...f,
                    address: address || f.address,
                    location_lat: String(lat),
                    location_lng: String(lng),
                  }))
                }
              />
            </SectionBlock>

          </div>

          {/* RIGHT: live preview sidebar */}
          <div className="space-y-4">

            {/* Save CTA */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="mb-1 text-sm font-semibold text-emerald-800">Ready to save?</p>
              <p className="mb-4 text-xs text-emerald-700/70 leading-relaxed">
                Review changes below, then save to apply them to this shift.
              </p>
              <Button
                className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={save}
                disabled={saving}
              >
                {saving ? (
                  'Saving…'
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Save changes
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full text-zinc-500 hover:text-zinc-800"
                onClick={() => navigate(`/shifts/${shiftId}`)}
              >
                Discard & view details
              </Button>
            </div>

            {/* Live preview */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Live preview</p>
              </div>
              <div className="divide-y divide-zinc-100">
                <PreviewRow
                  label="Status"
                  children={
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase',
                      statusCfg.cls
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', statusCfg.dot)} />
                      {form.status}
                    </span>
                  }
                />
                <PreviewRow label="Employer" value={employers.find((e) => e.id === form.employer_id)?.company_name ?? '—'} />
                <PreviewRow label="Category" value={categories.find((c) => c.id === form.category_id)?.name ?? '—'} />
                <PreviewRow label="Date" value={form.date || '—'} />
                <PreviewRow
                  label="Time"
                  value={form.start_time && form.end_time ? `${form.start_time} – ${form.end_time}` : '—'}
                />
                <PreviewRow
                  label="Rate"
                  value={form.hourly_rate ? `₹${parseFloat(form.hourly_rate || '0').toFixed(2)}/hr` : '—'}
                />
                <PreviewRow
                  label="Geofence"
                  value={form.geofence_radius_m ? `${form.geofence_radius_m} m` : '—'}
                />
              </div>
            </div>

            {/* Slots preview */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">Slots preview</p>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-zinc-900">{form.slots_filled || 0}</p>
                  <p className="text-xs text-zinc-400">of {form.slots_total || '?'} slots</p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    'text-2xl font-bold',
                    fillPct >= 100 ? 'text-blue-600' : fillPct > 50 ? 'text-amber-600' : 'text-emerald-600'
                  )}>{fillPct}%</p>
                  <p className="text-xs text-zinc-400">fill rate</p>
                </div>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={cn(
                    'h-3 rounded-full transition-all duration-500',
                    fillPct >= 100 ? 'bg-blue-500' : fillPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                  )}
                  style={{ width: `${Math.min(fillPct, 100)}%` }}
                />
              </div>
            </div>

          </div>
        </div>

        {/* ── Bottom save bar ── */}
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-6 py-4">
          <p className="text-sm text-zinc-400">Changes are applied immediately on save.</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/shifts/${shiftId}`)}
            >
              Cancel
            </Button>
            <Button
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 min-w-[130px]"
              onClick={save}
              disabled={saving}
            >
              {saving ? 'Saving…' : (
                <>
                  <CheckIcon className="h-3.5 w-3.5" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Layout helpers
// ─────────────────────────────────────────────────────────────

function SectionBlock({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="flex items-start gap-3 px-6 py-5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
          {icon}
        </div>
        <div>
          <p className="font-semibold text-zinc-900">{title}</p>
          <p className="text-xs text-zinc-400">{subtitle}</p>
        </div>
      </div>
      <div className="px-6 pb-6">{children}</div>
    </div>
  )
}

function FieldBlock({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-xs font-medium text-zinc-500">{label}</Label>
      {children}
    </div>
  )
}

function PreviewRow({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <span className="shrink-0 text-xs text-zinc-400">{label}</span>
      {children ?? (
        <span className="truncate text-right text-xs font-medium text-zinc-700">{value}</span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────

function buildTimeOptions() {
  const list: string[] = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      list.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return list
}

function toYmd(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function normalizeRichText(value: string) {
  const plain = value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  return plain ? value : ''
}
