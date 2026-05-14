import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiRequestError, apiDeleteJson, apiGet, apiPatch, apiPost } from '@/lib/api'
import type { AdminWorkerDetail } from '@/types/admin'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowLeftIcon,
  BriefcaseBusinessIcon,
  CalendarIcon,
  CheckIcon,
  GraduationCapIcon,
  Trash2Icon,
  UserRoundIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function parseYmd(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

type WorkerEditForm = {
  loginType: 'email' | 'phone'
  loginValue: string
  full_name: string
  dob: string
  city: string
  location_lat: string
  location_lng: string
  radius_km: string
  status: 'pending' | 'active' | 'suspended' | 'banned'
  bio: string
}

type WorkerQualification = NonNullable<AdminWorkerDetail['qualifications']>[number]
type StepId = 'profile' | 'education' | 'experience'

const STEPS: Array<{ id: StepId; label: string; icon: React.ReactNode }> = [
  { id: 'profile', label: 'Profile basics', icon: <UserRoundIcon className="h-4 w-4" /> },
  { id: 'education', label: 'Education', icon: <GraduationCapIcon className="h-4 w-4" /> },
  { id: 'experience', label: 'Work experience', icon: <BriefcaseBusinessIcon className="h-4 w-4" /> },
]

export function WorkerEditPage() {
  const { workerId } = useParams<{ workerId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [qualSaving, setQualSaving] = useState(false)
  const [qualifications, setQualifications] = useState<WorkerQualification[]>([])
  const [activeStep, setActiveStep] = useState<StepId>('profile')
  const [form, setForm] = useState<WorkerEditForm>({
    loginType: 'email',
    loginValue: '',
    full_name: '',
    dob: '',
    city: '',
    location_lat: '',
    location_lng: '',
    radius_km: '10',
    status: 'active',
    bio: '',
  })
  const [qualForm, setQualForm] = useState({
    title: '',
    institution: '',
    from_date: '',
    to_date: '',
    description: '',
  })

  useEffect(() => {
    const q = searchParams.get('step')
    if (q === 'education' || q === 'experience' || q === 'profile') setActiveStep(q)
  }, [searchParams])

  useEffect(() => {
    if (!workerId) return
    setLoading(true)
    apiGet<{ data: AdminWorkerDetail }>(`/admin/workers/${workerId}`)
      .then((res) => {
        const d = res.data
        const profileGeo = d.profile as typeof d.profile & { location_lat?: number; location_lng?: number }
        setForm({
          loginType: d.user.email ? 'email' : 'phone',
          loginValue: d.user.email ?? d.user.phone ?? '',
          full_name: d.profile.full_name,
          dob: (d.profile.dob ?? '').slice(0, 10),
          city: d.profile.city,
          location_lat: String(profileGeo.location_lat ?? ''),
          location_lng: String(profileGeo.location_lng ?? ''),
          radius_km: String(d.profile.radius_km),
          status: d.user.status as WorkerEditForm['status'],
          bio: d.profile.bio ?? '',
        })
        setQualifications(d.qualifications ?? [])
      })
      .catch((e) => toast.error(e instanceof ApiRequestError ? e.message : 'Failed to load worker'))
      .finally(() => setLoading(false))
  }, [workerId])

  async function submit() {
    if (!workerId) return
    const lat = Number(form.location_lat)
    const lng = Number(form.location_lng)
    const radius = Number(form.radius_km)
    if (!form.loginValue.trim() || !form.full_name.trim() || !form.dob || !form.city.trim()) {
      toast.error('Fill login, full name, DOB, and city.')
      return
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius)) {
      toast.error('Enter valid latitude, longitude, and radius.')
      return
    }
    setSaving(true)
    try {
      await apiPatch(`/admin/workers/${workerId}/profile`, {
        [form.loginType]: form.loginValue.trim(),
        full_name: form.full_name.trim(),
        dob: form.dob,
        city: form.city.trim(),
        location_lat: lat,
        location_lng: lng,
        radius_km: radius,
        status: form.status,
        bio: form.bio.trim() || null,
      })
      toast.success('Worker updated.')
      navigate(`/workers/${workerId}`)
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  async function addQualification(type: 'education' | 'work_experience') {
    if (!workerId) return
    if (!qualForm.title.trim() || !qualForm.institution.trim() || !qualForm.from_date) {
      toast.error('Fill title, institution, and start date.')
      return
    }
    setQualSaving(true)
    try {
      const res = (await apiPost(`/admin/workers/${workerId}/qualifications`, {
        type,
        title: qualForm.title.trim(),
        institution: qualForm.institution.trim(),
        from_date: qualForm.from_date,
        to_date: qualForm.to_date.trim() || null,
        description: qualForm.description.trim() || undefined,
      })) as { data: WorkerQualification }
      setQualifications((prev) => [...prev, res.data])
      setQualForm({ title: '', institution: '', from_date: '', to_date: '', description: '' })
      toast.success(type === 'education' ? 'Education added' : 'Experience added')
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not add qualification')
    } finally {
      setQualSaving(false)
    }
  }

  async function removeQualification(id: string) {
    if (!workerId) return
    try {
      await apiDeleteJson(`/admin/workers/${workerId}/qualifications/${id}`, {})
      setQualifications((prev) => prev.filter((q) => q.id !== id))
      toast.success('Removed')
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not remove')
    }
  }

  function moveStep(next: StepId) {
    setActiveStep(next)
    setSearchParams({ step: next })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!workerId) return <div className="p-8 text-sm text-zinc-400">Invalid route.</div>

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-zinc-400">Loading worker…</p>
      </div>
    )
  }

  const activeIdx = STEPS.findIndex((s) => s.id === activeStep)
  const educationQuals = qualifications.filter((q) => q.type === 'education')
  const workQuals = qualifications.filter((q) => q.type === 'work_experience')

  return (
    <div className="w-full">
      {/* Top bar */}
      <div className="border-b border-zinc-200 bg-white px-4 py-4 lg:px-6">
        <div className="flex w-full min-w-0 items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-zinc-400 hover:text-zinc-900" asChild>
            <Link to={`/workers/${workerId}`}>
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Back to worker
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-zinc-200 text-zinc-500" asChild>
              <Link to={`/workers/${workerId}`}>Cancel</Link>
            </Button>
            {activeStep === 'profile' && (
              <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800" onClick={submit} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 px-4 py-8 lg:px-6">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900">Edit worker</h1>
          <p className="mt-1 text-sm text-zinc-400">Update profile details, education, and work history.</p>
        </div>

        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center gap-0">
            {STEPS.map((step, idx) => {
              const isActive = activeStep === step.id
              const isDone = idx < activeIdx
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => moveStep(step.id)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : isDone
                          ? 'text-emerald-700 hover:text-emerald-800'
                          : 'text-zinc-300 hover:text-zinc-600'
                    )}
                  >
                    <span className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold',
                      isActive ? 'bg-white text-emerald-700' :
                        isDone ? 'bg-emerald-600 text-white' :
                          'bg-zinc-200 text-zinc-500'
                    )}>
                      {isDone ? <CheckIcon className="h-3 w-3" /> : idx + 1}
                    </span>
                    {step.label}
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={cn('mx-1 h-px w-8', idx < activeIdx ? 'bg-emerald-500' : 'bg-zinc-200')} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Profile step ── */}
        {activeStep === 'profile' && (
          <div className="space-y-6">
            {/* Login */}
            <FormSection title="Login credentials" description="Set how this worker signs in.">
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block text-xs text-zinc-500">Login type</Label>
                  <div className="inline-flex rounded-lg border border-zinc-200 p-0.5">
                    {(['email', 'phone'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, loginType: t, loginValue: '' }))}
                        className={cn(
                          'rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors',
                          form.loginType === t ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <FieldGrid>
                  <FormField label={form.loginType === 'email' ? 'Email address' : 'Phone (E.164)'}>
                    <Input
                      value={form.loginValue}
                      onChange={(e) => setForm((f) => ({ ...f, loginValue: e.target.value }))}
                      placeholder={form.loginType === 'email' ? 'worker@example.com' : '+447700900123'}
                      className="h-12 rounded-lg border-zinc-200 px-4"
                    />
                  </FormField>
                </FieldGrid>
              </div>
            </FormSection>

            {/* Personal info */}
            <FormSection title="Personal information" description="Basic details about the worker.">
              <FieldGrid cols={2}>
                <FormField label="Full name">
                  <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="John Worker" className="h-12 rounded-lg border-zinc-200 px-4" />
                </FormField>
                <FormField label="Date of birth">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn('h-12 w-full justify-start rounded-lg border-zinc-200 px-4 font-normal', !form.dob && 'text-zinc-400')}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                        {form.dob || 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={parseYmd(form.dob)}
                        onSelect={(d) => setForm((f) => ({ ...f, dob: d ? toYmd(d) : '' }))}
                        captionLayout="dropdown"
                        fromYear={1950}
                        toYear={new Date().getFullYear()}
                      />
                    </PopoverContent>
                  </Popover>
                </FormField>
                <FormField label="City">
                  <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="London" className="h-12 rounded-lg border-zinc-200 px-4" />
                </FormField>
                <FormField label="Account status">
                  <Select value={form.status} onValueChange={(v: WorkerEditForm['status']) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger className="h-12 rounded-lg border-zinc-200 px-4"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Bio" className="sm:col-span-2">
                  <Input value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Short profile summary (optional)" className="h-12 rounded-lg border-zinc-200 px-4" />
                </FormField>
              </FieldGrid>
            </FormSection>

            {/* Location */}
            <FormSection title="Location & radius" description="Geographic coordinates and job search radius.">
              <FieldGrid cols={3}>
                <FormField label="Latitude">
                  <Input value={form.location_lat} onChange={(e) => setForm((f) => ({ ...f, location_lat: e.target.value }))} placeholder="51.5074" className="h-12 rounded-lg border-zinc-200 px-4" />
                </FormField>
                <FormField label="Longitude">
                  <Input value={form.location_lng} onChange={(e) => setForm((f) => ({ ...f, location_lng: e.target.value }))} placeholder="-0.1278" className="h-12 rounded-lg border-zinc-200 px-4" />
                </FormField>
                <FormField label="Radius (km)">
                  <Input value={form.radius_km} onChange={(e) => setForm((f) => ({ ...f, radius_km: e.target.value }))} placeholder="10" className="h-12 rounded-lg border-zinc-200 px-4" />
                </FormField>
              </FieldGrid>
            </FormSection>

            {/* Footer actions */}
            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4">
              <p className="text-sm text-zinc-400">Changes are saved immediately on submit.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-zinc-200" onClick={() => moveStep('education')}>
                  Next: Education
                </Button>
                <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800" onClick={submit} disabled={saving}>
                  {saving ? 'Saving…' : 'Save profile'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Education step ── */}
        {activeStep === 'education' && (
          <div className="space-y-6">
            <FormSection title="Add education" description="Degrees, diplomas, and other academic qualifications.">
              <FieldGrid cols={2}>
                <FormField label="Course / Degree">
                  <Input value={qualForm.title} onChange={(e) => setQualForm((f) => ({ ...f, title: e.target.value }))} placeholder="B.Com, Hotel Management…" className="h-11 rounded-lg border-zinc-200 px-3" />
                </FormField>
                <FormField label="School / College">
                  <Input value={qualForm.institution} onChange={(e) => setQualForm((f) => ({ ...f, institution: e.target.value }))} placeholder="University name" className="h-11 rounded-lg border-zinc-200 px-3" />
                </FormField>
                <FormField label="From date">
                  <Input type="date" value={qualForm.from_date} onChange={(e) => setQualForm((f) => ({ ...f, from_date: e.target.value }))} className="h-11 rounded-lg border-zinc-200 px-3" />
                </FormField>
                <FormField label="To date (optional)">
                  <Input type="date" value={qualForm.to_date} onChange={(e) => setQualForm((f) => ({ ...f, to_date: e.target.value }))} className="h-11 rounded-lg border-zinc-200 px-3" />
                </FormField>
                <FormField label="Description" className="sm:col-span-2">
                  <Input value={qualForm.description} onChange={(e) => setQualForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional notes" className="h-11 rounded-lg border-zinc-200 px-3" />
                </FormField>
              </FieldGrid>
              <div className="mt-4">
                <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800" onClick={() => addQualification('education')} disabled={qualSaving}>
                  {qualSaving ? 'Adding…' : 'Add education'}
                </Button>
              </div>
            </FormSection>

            <QualList
              items={educationQuals}
              emptyText="No educational records added yet."
              onRemove={removeQualification}
              icon={<GraduationCapIcon className="h-4 w-4 text-zinc-500" />}
            />

            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4">
              <Button variant="ghost" size="sm" className="text-zinc-400" onClick={() => moveStep('profile')}>← Back</Button>
              <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800" onClick={() => moveStep('experience')}>
                Next: Work experience
              </Button>
            </div>
          </div>
        )}

        {/* ── Experience step ── */}
        {activeStep === 'experience' && (
          <div className="space-y-6">
            <FormSection title="Add work experience" description="Previous roles, companies, and responsibilities.">
              <FieldGrid cols={2}>
                <FormField label="Role / Position">
                  <Input value={qualForm.title} onChange={(e) => setQualForm((f) => ({ ...f, title: e.target.value }))} placeholder="Banquet server, cashier…" className="h-11 rounded-lg border-zinc-200 px-3" />
                </FormField>
                <FormField label="Company">
                  <Input value={qualForm.institution} onChange={(e) => setQualForm((f) => ({ ...f, institution: e.target.value }))} placeholder="Company name" className="h-11 rounded-lg border-zinc-200 px-3" />
                </FormField>
                <FormField label="From date">
                  <Input type="date" value={qualForm.from_date} onChange={(e) => setQualForm((f) => ({ ...f, from_date: e.target.value }))} className="h-11 rounded-lg border-zinc-200 px-3" />
                </FormField>
                <FormField label="To date (optional)">
                  <Input type="date" value={qualForm.to_date} onChange={(e) => setQualForm((f) => ({ ...f, to_date: e.target.value }))} className="h-11 rounded-lg border-zinc-200 px-3" />
                </FormField>
                <FormField label="Description" className="sm:col-span-2">
                  <Input value={qualForm.description} onChange={(e) => setQualForm((f) => ({ ...f, description: e.target.value }))} placeholder="Responsibilities, tools…" className="h-11 rounded-lg border-zinc-200 px-3" />
                </FormField>
              </FieldGrid>
              <div className="mt-4">
                <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800" onClick={() => addQualification('work_experience')} disabled={qualSaving}>
                  {qualSaving ? 'Adding…' : 'Add experience'}
                </Button>
              </div>
            </FormSection>

            <QualList
              items={workQuals}
              emptyText="No work experience added yet."
              onRemove={removeQualification}
              icon={<BriefcaseBusinessIcon className="h-4 w-4 text-zinc-500" />}
            />

            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4">
              <Button variant="ghost" size="sm" className="text-zinc-400" onClick={() => moveStep('education')}>← Back</Button>
              <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800" onClick={() => navigate(`/workers/${workerId}`)}>
                Finish editing
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Shared layout components
// ──────────────────────────────────────────────

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-6 py-4">
        <p className="font-semibold text-zinc-900">{title}</p>
        {description && <p className="mt-0.5 text-xs text-zinc-400">{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function FieldGrid({ cols = 2, children }: { cols?: 2 | 3; children: React.ReactNode }) {
  return (
    <div className={cn('grid gap-4', cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
      {children}
    </div>
  )
}

function FormField({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs text-zinc-500">{label}</Label>
      {children}
    </div>
  )
}

function QualList({
  items,
  emptyText,
  onRemove,
  icon,
}: {
  items: WorkerQualification[]
  emptyText: string
  onRemove: (id: string) => void
  icon: React.ReactNode
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 px-6 py-8 text-center">
        <p className="text-sm text-zinc-400">{emptyText}</p>
      </div>
    )
  }
  return (
    <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
      {items.map((q) => (
        <div key={q.id} className="flex items-start justify-between gap-4 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-zinc-100 bg-zinc-50">
              {icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">{q.title}</p>
              <p className="text-xs text-zinc-500">{q.institution}</p>
              <p className="mt-0.5 text-xs text-zinc-400">
                {q.from_date}{q.to_date ? ` — ${q.to_date}` : ' — Present'}
              </p>
              {q.description && (
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{q.description}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRemove(q.id)}
            className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2Icon className="h-3 w-3" />
            Remove
          </button>
        </div>
      ))}
    </div>
  )
}