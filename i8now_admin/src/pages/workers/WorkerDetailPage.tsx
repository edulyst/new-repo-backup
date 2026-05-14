import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiRequestError, apiDeleteJson, apiGet, apiPatch, apiPost, apiPostForm } from '@/lib/api'
import { fmtDate, fmtDateTime, fmtRating } from '@/lib/fmt'
import type { AdminWorkerDetail } from '@/types/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  ArrowLeftIcon,
  BriefcaseBusinessIcon,
  BriefcaseIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  CopyIcon,
  GraduationCapIcon,
  MapPinIcon,
  PencilIcon,
  Trash2Icon,
  UploadCloudIcon,
  StarIcon,
  UserRoundIcon,
  XCircleIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type DetailRes = { status: string; data: AdminWorkerDetail }

type ShiftHistoryItem = {
  application_id: string
  status: string
  applied_at: string
  shift: {
    id: string
    title: string
    date: string | null
    start_time: string
    end_time: string
    hourly_rate: number
    currency: string
    address: string
    employer_id: string
    employer_name: string
    employer_logo_url: string | null
    category_id: string
  } | null
  timesheet: {
    id: string
    status: string
    clock_in: string | null
    clock_out: string | null
    total_hours: number | null
    gross_amount: number | null
    net_to_worker: number | null
    approved_at: string | null
    worker_rating_employer: number | null
    employer_rating_worker: number | null
  } | null
}

const kycConfig: Record<string, { label: string; cls: string; dot: string }> = {
  unverified: {
    label: 'Unverified',
    cls: 'bg-zinc-100 text-zinc-600 border border-zinc-200',
    dot: 'bg-zinc-400',
  },
  pending: {
    label: 'Pending',
    cls: 'bg-amber-50 text-amber-700 border border-amber-200',
    dot: 'bg-amber-400',
  },
  approved: {
    label: 'Approved',
    cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    cls: 'bg-red-50 text-red-700 border border-red-200',
    dot: 'bg-red-500',
  },
}

function KycBadge({ status }: { status: string }) {
  const cfg = kycConfig[status] ?? kycConfig.unverified
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase', cfg.cls)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

function copyText(label: string, text: string) {
  void navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} copied`),
    () => toast.error('Could not copy'),
  )
}

export function WorkerDetailPage() {
  const { workerId } = useParams<{ workerId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [data, setData] = useState<AdminWorkerDetail | null>(null)

  const [kycStatus, setKycStatus] = useState('')
  const [kycNote, setKycNote] = useState('')
  const [hoverStars, setHoverStars] = useState(0)
  const [ratingSaving, setRatingSaving] = useState(false)
  const [docType, setDocType] = useState<'govt_id' | 'right_to_work' | 'background_check'>('govt_id')
  const [docUrl, setDocUrl] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('')
  const [docSaving, setDocSaving] = useState(false)
  const [docPreviewUrl, setDocPreviewUrl] = useState('')
  const [docFileName, setDocFileName] = useState('')
  const [avatarFileName, setAvatarFileName] = useState('')
  const panelRef = useRef<HTMLDivElement | null>(null)
  const headerAvatarInputRef = useRef<HTMLInputElement | null>(null)
  const [activePanel, setActivePanel] = useState<'profile' | 'documents' | 'kyc' | 'history'>('profile')
  const [shiftHistory, setShiftHistory] = useState<ShiftHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    city: '',
    radius_km: '',
    dob: '',
  })

  const load = useCallback(() => {
    if (!workerId) return
    setLoading(true)
    setErr(null)
    apiGet<DetailRes>(`/admin/workers/${workerId}`)
      .then((r) => {
        setData(r.data)
        setKycStatus(r.data.profile.kyc_status)
        setKycNote(r.data.profile.kyc_review_note ?? '')
        setAvatarUrl(r.data.profile.avatar_url ?? '')
        setAvatarPreviewUrl(r.data.profile.avatar_preview_url ?? r.data.profile.avatar_url ?? '')
        setProfileForm({
          full_name: r.data.profile.full_name ?? '',
          city: r.data.profile.city ?? '',
          radius_km: String(r.data.profile.radius_km ?? ''),
          dob: r.data.profile.dob ?? '',
        })
      })
      .catch((e: unknown) => {
        setErr(e instanceof ApiRequestError ? e.message : 'Failed to load worker')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [workerId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!workerId || activePanel !== 'history') return
    setHistoryLoading(true)
    apiGet<{ data: { history: ShiftHistoryItem[] } }>(`/admin/workers/${workerId}/shift-history`)
      .then((r) => setShiftHistory(r.data.history))
      .catch(() => { })
      .finally(() => setHistoryLoading(false))
  }, [workerId, activePanel])

  async function saveKyc() {
    if (!data) return
    setSaving(true)
    try {
      await apiPatch(`/admin/workers/${data.profile.id}/kyc`, {
        kyc_status: kycStatus,
        ...(kycNote.trim() ? { note: kycNote.trim() } : {}),
      })
      toast.success('KYC updated.')
      setData((d) => d ? { ...d, profile: { ...d.profile, kyc_status: kycStatus, kyc_review_note: kycNote.trim() || null } } : d)
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not save KYC')
    } finally {
      setSaving(false)
    }
  }

  async function addAdminRating(stars: number) {
    if (!data) return
    setRatingSaving(true)
    try {
      const res = (await apiPost(`/admin/workers/${data.profile.id}/rating`, { stars })) as { data: { rating_avg: number } }
      setData((d) => (d ? { ...d, profile: { ...d.profile, rating_avg: res.data.rating_avg } } : d))
      toast.success('Rating saved')
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not save rating')
    } finally {
      setRatingSaving(false)
    }
  }

  function switchPanel(panel: 'profile' | 'documents' | 'kyc') {
    setActivePanel(panel)
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function saveProfileBasics() {
    if (!data) return
    const radius = Number(profileForm.radius_km)
    if (!profileForm.full_name.trim() || !profileForm.city.trim() || !profileForm.dob || !Number.isFinite(radius)) {
      toast.error('Fill full name, city, DOB and valid radius.')
      return
    }
    setProfileSaving(true)
    try {
      await apiPatch(`/admin/workers/${data.profile.id}/profile`, {
        full_name: profileForm.full_name.trim(),
        city: profileForm.city.trim(),
        dob: profileForm.dob,
        radius_km: radius,
      })
      toast.success('Profile updated')
      load()
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not update profile')
    } finally {
      setProfileSaving(false)
    }
  }

  async function uploadWorkerDocument() {
    if (!data || !docUrl.trim()) {
      toast.error('Provide a document URL or upload a file.')
      return
    }
    setDocSaving(true)
    try {
      await apiPost(`/admin/workers/${data.profile.id}/documents`, { type: docType, file_url: docUrl.trim() })
      toast.success('Document uploaded')
      setDocUrl('')
      load()
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not upload document')
    } finally {
      setDocSaving(false)
    }
  }

  async function removeDraftDocument() {
    if (!data || !docUrl) return
    try {
      await apiDeleteJson(`/admin/workers/${data.profile.id}/uploads/file`, { file_url: docUrl })
      setDocUrl('')
      setDocFileName('')
      setDocPreviewUrl('')
      toast.success('Draft document removed')
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not remove file')
    }
  }

  async function uploadViaBackend(file: File, kind: 'worker_document' | 'worker_avatar'): Promise<{ file_url: string; preview_url?: string }> {
    if (!data) throw new Error('Worker missing')
    const form = new FormData()
    form.append('kind', kind)
    form.append('file', file)
    const res = (await apiPostForm(`/admin/workers/${data.profile.id}/uploads/file`, form)) as { data: { file_url: string; preview_url?: string } }
    return res.data
  }

  async function saveProfileImage() {
    if (!data || !avatarUrl.trim()) {
      toast.error('Provide profile image URL or upload a file.')
      return
    }
    setDocSaving(true)
    try {
      await apiPatch(`/admin/workers/${data.profile.id}/profile`, { avatar_url: avatarUrl.trim() })
      toast.success('Profile image updated')
      load()
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not save profile image')
    } finally {
      setDocSaving(false)
    }
  }

  async function removeProfileImage() {
    if (!data || !avatarUrl) return
    try {
      if (/^https?:\/\//i.test(avatarUrl)) {
        await apiDeleteJson(`/admin/workers/${data.profile.id}/uploads/file`, { file_url: avatarUrl })
      }
      await apiPatch(`/admin/workers/${data.profile.id}/profile`, { avatar_url: null })
      setAvatarUrl('')
      setAvatarPreviewUrl('')
      setAvatarFileName('')
      toast.success('Profile image removed')
      load()
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not remove image')
    }
  }

  async function uploadAndSaveProfileAvatar(file: File) {
    if (!data) return
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file (PNG, JPG, WebP).')
      return
    }
    setDocSaving(true)
    try {
      const uploaded = await uploadViaBackend(file, 'worker_avatar')
      await apiPatch(`/admin/workers/${data.profile.id}/profile`, { avatar_url: uploaded.file_url })
      setAvatarUrl(uploaded.file_url)
      setAvatarPreviewUrl(uploaded.preview_url ?? uploaded.file_url)
      setAvatarFileName(file.name)
      toast.success('Profile image uploaded to storage and saved.')
      load()
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not upload profile image')
    } finally {
      setDocSaving(false)
    }
  }

  async function reviewDocument(documentId: string, status: 'approved' | 'rejected' | 'pending') {
    if (!data) return
    try {
      await apiPatch(`/admin/workers/${data.profile.id}/documents/${documentId}`, { status })
      toast.success(`Document marked ${status}`)
      load()
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not update document')
    }
  }

  async function removeDocument(documentId: string) {
    if (!data) return
    try {
      await apiDeleteJson(`/admin/workers/${data.profile.id}/documents/${documentId}`, {})
      toast.success('Document removed')
      load()
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not remove document')
    }
  }

  if (!workerId) return <div className="p-8 text-sm text-zinc-400">Invalid route.</div>

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 p-4 pb-16 lg:p-6 lg:pb-16">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (err || !data) {
    return (
      <div className="w-full min-w-0 space-y-4 p-4 lg:p-6">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-zinc-500" asChild>
          <Link to="/workers"><ArrowLeftIcon className="h-4 w-4" />Back to workers</Link>
        </Button>
        <p className="text-sm text-red-600">{err ?? 'Worker not found.'}</p>
      </div>
    )
  }

  const effectiveStars = hoverStars || Math.round(data.profile.rating_avg)

  const step1Done = true
  const step2Done = (data.verification?.documents_uploaded ?? 0) > 0
  const step3Decided = data.profile.kyc_status === 'approved' || data.profile.kyc_status === 'rejected'
  /** Green only when both endpoints of the segment are satisfied; otherwise red (incomplete path). */
  const segmentAfter1Green = step1Done && step2Done
  const segmentAfter2Green = step2Done && step3Decided

  return (
    <div className="w-full min-w-0 space-y-6 p-4 pb-16 lg:p-6 lg:pb-16">

      {/* Breadcrumb */}
      <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-zinc-400 hover:text-zinc-900" asChild>
        <Link to="/workers"><ArrowLeftIcon className="h-3.5 w-3.5" />Workers</Link>
      </Button>

      {/* ?? Header card ?? */}
      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <input
              ref={headerAvatarInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={docSaving}
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void uploadAndSaveProfileAvatar(f)
              }}
            />
            <button
              type="button"
              disabled={docSaving}
              title="Upload profile photo (saved to storage)"
              onClick={() => headerAvatarInputRef.current?.click()}
              className="group relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 text-left transition hover:border-zinc-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-60"
            >
              {(avatarPreviewUrl || data.profile.avatar_preview_url || data.profile.avatar_url) ? (
                <img
                  src={avatarPreviewUrl || data.profile.avatar_preview_url || data.profile.avatar_url || ''}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRoundIcon className="h-7 w-7 text-zinc-400" />
              )}
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-zinc-900/55 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                <UploadCloudIcon className="h-4 w-4" />
                Photo
              </span>
            </button>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-zinc-900">{data.profile.full_name}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <KycBadge status={data.profile.kyc_status} />
                <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  {data.user.role}
                </span>
                <span className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide',
                  data.user.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                )}>
                  {data.user.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <span className="uppercase tracking-wide text-[10px] text-zinc-400">ID</span>
                  <span className="font-mono text-zinc-700">{data.user.id}</span>
                  <button
                    type="button"
                    className="rounded p-0.5 text-zinc-300 transition-colors hover:text-zinc-600"
                    onClick={() => copyText('User ID', data.user.id)}
                  >
                    <CopyIcon className="h-3 w-3" />
                  </button>
                </span>
                {data.user.email ? (
                  <>
                    <span className="text-zinc-300">|</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="uppercase tracking-wide text-[10px] text-zinc-400">Email</span>
                      <span className="text-zinc-700">{data.user.email}</span>
                    </span>
                  </>
                ) : null}
                {data.user.phone ? (
                  <>
                    <span className="text-zinc-300">|</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="uppercase tracking-wide text-[10px] text-zinc-400">Phone</span>
                      <span className="text-zinc-700">{data.user.phone}</span>
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-2 border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            onClick={() => navigate(`/workers/${data.profile.id}/edit`)}
          >
            <PencilIcon className="h-3.5 w-3.5" />
            Edit worker
          </Button>
        </div>

        {/* Admin rating */}
        <div className="border-t border-zinc-100 px-6 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Admin rating</p>
          <div className="flex items-center gap-1.5" onMouseLeave={() => setHoverStars(0)}>
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addAdminRating(s)}
                onMouseEnter={() => setHoverStars(s)}
                className="cursor-pointer rounded-md p-1 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed"
                disabled={ratingSaving || data.profile.admin_can_rate === false}
              >
                <StarIcon className={cn('h-5 w-5 transition-colors', s <= effectiveStars ? 'fill-amber-400 text-amber-400' : 'text-zinc-300')} />
              </button>
            ))}
            <span className="ml-1 text-sm text-zinc-400">
              {ratingSaving
                ? 'Saving...'
                : data.profile.admin_can_rate === false
                  ? `avg ${fmtRating(data.profile.rating_avg)} � already rated`
                  : `avg ${fmtRating(data.profile.rating_avg)}`}
            </span>
          </div>
        </div>

        <div className="border-t border-zinc-100 p-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Worker profile</p>
          <div className="overflow-hidden rounded-xl border border-zinc-100">
            <div className="grid md:grid-cols-3 md:divide-x md:divide-zinc-100">
              <ProfileGridItem label="City" value={<span className="inline-flex items-center gap-1"><MapPinIcon className="h-3.5 w-3.5 text-zinc-400" />{data.profile.city}</span>} />
              <ProfileGridItem label="Date of birth" value={fmtDate(data.profile.dob)} />
              <ProfileGridItem label="Radius" value={`${data.profile.radius_km} km`} />
            </div>
            <div className="border-t border-zinc-100 grid md:grid-cols-3 md:divide-x md:divide-zinc-100">
              <ProfileGridItem label="Total shifts" value={data.profile.total_shifts} />
              <ProfileGridItem label="Joined" value={fmtDateTime(data.profile.created_at)} />
              <ProfileGridItem label="Updated" value={fmtDateTime(data.profile.updated_at)} />
            </div>
          </div>
        </div>
      </div>

      {/* ?? Verification timeline ?? */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Verification timeline</p>
          <KycBadge status={data.profile.kyc_status} />
        </div>
        <div className="grid gap-0 md:grid-cols-[1fr_minmax(2rem,2.5rem)_1fr_minmax(2rem,2.5rem)_1fr] md:items-start">
          <TimelineStep
            number={1}
            done
            title="Profile created"
            subtitle={fmtDateTime(data.profile.created_at)}
            onClick={() => switchPanel('profile')}
          />
          <TimelineSegment complete={segmentAfter1Green} />
          <TimelineStep
            number={2}
            done={step2Done}
            title="Documents uploaded"
            subtitle={step2Done ? `${data.verification?.documents_uploaded ?? 0} document(s)` : 'No documents yet'}
            onClick={() => switchPanel('documents')}
          />
          <TimelineSegment complete={segmentAfter2Green} />
          <TimelineStep
            number={3}
            done={data.profile.kyc_status === 'approved'}
            rejected={data.profile.kyc_status === 'rejected'}
            title="Verification decision"
            subtitle={
              data.profile.kyc_status === 'approved' ? 'Approved' :
              data.profile.kyc_status === 'rejected' ? 'Rejected' : 'In progress'
            }
            note={data.profile.kyc_review_note ?? undefined}
            onClick={() => switchPanel('kyc')}
          />
        </div>
      </div>

      {/* ?? Panel tabs ?? */}
      <div ref={panelRef} className="rounded-2xl border border-zinc-200 bg-white">
        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-zinc-100">
          {(['profile', 'documents', 'kyc', 'history'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setActivePanel(p)}
              className={cn(
                'shrink-0 px-5 py-3.5 text-sm font-medium capitalize transition-colors',
                activePanel === p
                  ? 'border-b-2 border-zinc-900 text-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-700'
              )}
            >
              {p === 'history' ? 'Work history' : p}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Profile panel */}
          {activePanel === 'profile' && (
            <div className="space-y-5">
              <SectionHeading>Edit profile</SectionHeading>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Full name">
                  <Input value={profileForm.full_name} onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="John Worker" className="h-11 border-zinc-200 px-3 focus:ring-zinc-900" />
                </FormField>
                <FormField label="City">
                  <Input value={profileForm.city} onChange={(e) => setProfileForm((f) => ({ ...f, city: e.target.value }))} placeholder="London" className="h-11 border-zinc-200 px-3 focus:ring-zinc-900" />
                </FormField>
                <FormField label="Date of birth">
                  <Input value={profileForm.dob} onChange={(e) => setProfileForm((f) => ({ ...f, dob: e.target.value }))} placeholder="1998-10-23" className="h-11 border-zinc-200 px-3 focus:ring-zinc-900" />
                </FormField>
                <FormField label="Radius (km)">
                  <Input value={profileForm.radius_km} onChange={(e) => setProfileForm((f) => ({ ...f, radius_km: e.target.value }))} placeholder="10" className="h-11 border-zinc-200 px-3 focus:ring-zinc-900" />
                </FormField>
              </div>
              <div>
                <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800" onClick={saveProfileBasics} disabled={profileSaving}>
                  {profileSaving ? 'Saving�' : 'Save profile'}
                </Button>
              </div>
            </div>
          )}

          {/* History panel */}
          {activePanel === 'history' && (
            <WorkShiftHistoryPanel
              history={shiftHistory}
              loading={historyLoading}
              onNavigateShift={(shiftId) => navigate(`/shifts/${shiftId}`)}
            />
          )}

          {/* Documents panel */}
          {activePanel === 'documents' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <SectionHeading>Upload document</SectionHeading>
                <p className="text-sm text-zinc-400">Pending documents below are awaiting your review action.</p>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-52">
                    <Label className="mb-1.5 block text-xs text-zinc-500">Document type</Label>
                    <Select value={docType} onValueChange={(v: 'govt_id' | 'right_to_work' | 'background_check') => setDocType(v)}>
                      <SelectTrigger className="border-zinc-200 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="govt_id">govt_id</SelectItem>
                        <SelectItem value="right_to_work">right_to_work</SelectItem>
                        <SelectItem value="background_check">background_check</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" className="h-9 bg-zinc-900 text-white hover:bg-zinc-800" onClick={uploadWorkerDocument} disabled={docSaving}>
                    {docSaving ? 'Uploading�' : 'Upload'}
                  </Button>
                </div>

                <DropZone
                  label="Drop document here"
                  hint="PDF or image � uploaded to S3 via backend"
                  accept="image/*,.pdf"
                  saving={docSaving}
                  onFile={async (file) => {
                    setDocSaving(true)
                    try {
                      const uploaded = await uploadViaBackend(file, 'worker_document')
                      setDocUrl(uploaded.file_url)
                      setDocFileName(file.name)
                      setDocPreviewUrl(file.type.startsWith('image/') ? (uploaded.preview_url ?? uploaded.file_url) : '')
                      toast.success('Document uploaded to S3')
                    } catch { toast.error('Could not upload file') }
                    finally { setDocSaving(false) }
                  }}
                >
                  {(docFileName || docPreviewUrl) && (
                    <div className="mt-3 flex items-center gap-3">
                      {docPreviewUrl && <img src={docPreviewUrl} alt="Preview" className="h-12 w-12 rounded-lg border border-zinc-200 object-cover" />}
                      {docFileName && <span className="text-xs text-zinc-500">{docFileName}</span>}
                      {docUrl && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600" onClick={removeDraftDocument}>
                          <Trash2Icon className="h-3.5 w-3.5 mr-1" />Remove
                        </Button>
                      )}
                    </div>
                  )}
                </DropZone>
              </div>

              <div className="space-y-4">
                <SectionHeading>Profile image</SectionHeading>
                <DropZone
                  label="Drop profile image here"
                  hint="PNG / JPG / WebP recommended"
                  accept="image/*"
                  saving={docSaving}
                  onFile={async (file) => {
                    setDocSaving(true)
                    try {
                      const uploaded = await uploadViaBackend(file, 'worker_avatar')
                      setAvatarUrl(uploaded.file_url)
                      setAvatarPreviewUrl(uploaded.preview_url ?? uploaded.file_url)
                      setAvatarFileName(file.name)
                      toast.success('Profile image uploaded')
                    } catch { toast.error('Could not upload image') }
                    finally { setDocSaving(false) }
                  }}
                >
                  {(avatarFileName || avatarUrl) && (
                    <div className="mt-3 flex items-center gap-3">
                      {avatarPreviewUrl && <img src={avatarPreviewUrl} alt="Avatar" className="h-12 w-12 rounded-full border border-zinc-200 object-cover" />}
                      {avatarFileName && <span className="text-xs text-zinc-500">{avatarFileName}</span>}
                      {avatarUrl && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600" onClick={removeProfileImage}>
                          <Trash2Icon className="h-3.5 w-3.5 mr-1" />Remove
                        </Button>
                      )}
                    </div>
                  )}
                </DropZone>
                <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800" onClick={saveProfileImage} disabled={docSaving}>
                  {docSaving ? 'Saving�' : 'Save image'}
                </Button>
              </div>

              {(data.verification?.documents?.length ?? 0) > 0 && (
                <div className="space-y-3">
                  <SectionHeading>Uploaded documents</SectionHeading>
                  <div className="divide-y rounded-xl border border-zinc-200">
                    {data.verification?.documents?.map((d) => (
                      <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide',
                            d.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                            d.status === 'rejected' ? 'bg-red-50 text-red-600' :
                            'bg-zinc-100 text-zinc-500'
                          )}>
                            {d.status}
                          </span>
                          <span className="text-sm font-medium text-zinc-700">{d.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={d.preview_url ?? d.file_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-900">Preview</a>
                          {d.status !== 'approved' && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 border-zinc-200 px-2.5 text-xs" onClick={() => reviewDocument(d.id, 'approved')}>Approve</Button>
                              <Button size="sm" variant="outline" className="h-7 border-zinc-200 px-2.5 text-xs" onClick={() => reviewDocument(d.id, 'rejected')}>Reject</Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600" onClick={() => removeDocument(d.id)}>
                            <Trash2Icon className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* KYC panel */}
          {activePanel === 'kyc' && (
            <div className="space-y-5">
              <SectionHeading>KYC decision</SectionHeading>
              <div className="flex flex-wrap items-end gap-4">
                <div className="w-48">
                  <Label className="mb-1.5 block text-xs text-zinc-500">KYC status</Label>
                  <Select value={kycStatus} onValueChange={setKycStatus}>
                    <SelectTrigger className="border-zinc-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['unverified', 'pending', 'approved', 'rejected'] as const).map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-48">
                  <Label className="mb-1.5 block text-xs text-zinc-500">Review note</Label>
                  <Input value={kycNote} onChange={(e) => setKycNote(e.target.value)} placeholder="Reason for decision" className="border-zinc-200" />
                </div>
                <Button size="sm" className="h-9 bg-zinc-900 text-white hover:bg-zinc-800 shrink-0" onClick={saveKyc} disabled={saving}>
                  {saving ? 'Saving...' : 'Save KYC'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ?? Qualifications ?? */}
      <QualificationsEducationSection qualifications={data.qualifications ?? []} />
      <QualificationsWorkSection qualifications={data.qualifications ?? []} />
      <QualificationsCertificationsSection qualifications={data.qualifications ?? []} />
    </div>
  )
}

// ??????????????????????????????????????????????
// Shared layout components
// ??????????????????????????????????????????????

// ?????????????????????????????????????????????????????????????????????????????
// Work History Panel
// ?????????????????????????????????????????????????????????????????????????????

const APP_STATUS_STYLE: Record<string, string> = {
  applied: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  cancelled: 'bg-zinc-100 text-zinc-500 border-zinc-200',
}

const TS_STATUS_STYLE: Record<string, string> = {
  open: 'bg-zinc-100 text-zinc-500',
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  disputed: 'bg-red-50 text-red-600',
  paid: 'bg-blue-50 text-blue-700',
}

function StarRow({ label, stars }: { label: string; stars: number | null }) {
  if (stars == null) return null
  return (
    <div className="flex items-center gap-2">
      <span className="w-44 shrink-0 text-xs text-zinc-400">{label}</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <StarIcon
            key={i}
            className={cn('h-3.5 w-3.5', i <= stars ? 'fill-amber-400 text-amber-400' : 'text-zinc-200')}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-zinc-700">{stars}/5</span>
    </div>
  )
}

function shiftDurationHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMins = sh * 60 + (sm || 0)
  const endMins   = eh * 60 + (em || 0)
  const diff = endMins >= startMins ? endMins - startMins : 24 * 60 - startMins + endMins
  return diff / 60
}

function WorkShiftHistoryPanel({
  history,
  loading,
  onNavigateShift,
}: {
  history: ShiftHistoryItem[]
  loading: boolean
  onNavigateShift: (shiftId: string) => void
}) {
  const INR = '\u20B9'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-zinc-400">Loading work history...</p>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-sm font-semibold text-zinc-600">No shift history yet</p>
        <p className="text-xs text-zinc-400">Applied and completed shifts will appear here.</p>
      </div>
    )
  }

  const completedCount = history.filter((h) => h.status === 'completed').length

  const totalHours = history.reduce((sum, h) => {
    if (h.timesheet?.total_hours != null) return sum + h.timesheet.total_hours
    if (h.shift?.start_time && h.shift?.end_time) return sum + shiftDurationHours(h.shift.start_time, h.shift.end_time)
    return sum
  }, 0)

  const totalEarned = history.reduce((sum, h) => {
    if (h.timesheet?.net_to_worker != null) return sum + h.timesheet.net_to_worker
    if (h.shift) {
      const hrs = h.timesheet?.total_hours ?? (h.shift.start_time && h.shift.end_time
        ? shiftDurationHours(h.shift.start_time, h.shift.end_time) : 0)
      return sum + hrs * h.shift.hourly_rate
    }
    return sum
  }, 0)

  return (
    <div className="space-y-6">

      {/* ── Summary strip ── flat, no icons, big numbers */}
      <div className="flex divide-x divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
        <div className="flex-1 px-8 py-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">Shifts completed</p>
          <p className="text-4xl font-bold text-zinc-900">{completedCount}</p>
          <p className="mt-1 text-sm text-zinc-400">{history.length} total applications</p>
        </div>
        <div className="flex-1 px-8 py-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">Total hours</p>
          <p className="text-4xl font-bold text-zinc-900">{totalHours.toFixed(1)}</p>
          <p className="mt-1 text-sm text-zinc-400">hrs across all shifts</p>
        </div>
        <div className="flex-1 px-8 py-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">Total earned</p>
          <p className="text-4xl font-bold text-emerald-600">{INR}{totalEarned.toFixed(0)}</p>
          <p className="mt-1 text-sm text-zinc-400">incl. estimated</p>
        </div>
      </div>

      {/* ── Shift entries ── */}
      <div className="space-y-3">
        {history.map((item) => {
          const s = item.shift
          const ts = item.timesheet
          const appCls = APP_STATUS_STYLE[item.status] ?? APP_STATUS_STYLE.applied
          const tsCls  = ts ? (TS_STATUS_STYLE[ts.status] ?? TS_STATUS_STYLE.open) : ''

          const effectiveHours = ts?.total_hours != null
            ? ts.total_hours
            : (s?.start_time && s?.end_time ? shiftDurationHours(s.start_time, s.end_time) : null)
          const effectiveEarned = ts?.net_to_worker != null
            ? ts.net_to_worker
            : (effectiveHours != null && s ? effectiveHours * s.hourly_rate : null)
          const isActual = ts?.net_to_worker != null

          return (
            <div key={item.application_id} className="rounded-2xl border border-zinc-200 bg-white">

              {/* Top: title + meta + earnings */}
              <div className="flex items-start justify-between gap-6 px-6 py-5">
                <div className="min-w-0 flex-1 space-y-2">

                  {/* Title + status pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => s && onNavigateShift(s.id)}
                      className={cn(
                        'text-base font-semibold text-zinc-900 transition-colors hover:text-zinc-500 hover:underline underline-offset-2',
                        !s && 'cursor-default'
                      )}
                    >
                      {s?.title ?? 'Shift removed'}
                    </button>
                    <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', appCls)}>
                      {item.status}
                    </span>
                    {ts && (
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize', tsCls)}>
                        Timesheet: {ts.status}
                      </span>
                    )}
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
                    {s && (
                      <>
                        <span className="flex items-center gap-1.5">
                          <BriefcaseIcon className="h-3.5 w-3.5 text-zinc-400" />
                          {s.employer_name}
                        </span>
                        {s.date && (
                          <span className="flex items-center gap-1.5">
                            <CalendarIcon className="h-3.5 w-3.5 text-zinc-400" />
                            {s.date}
                          </span>
                        )}
                        {s.start_time && s.end_time && (
                          <span className="flex items-center gap-1.5">
                            <ClockIcon className="h-3.5 w-3.5 text-zinc-400" />
                            {s.start_time} - {s.end_time}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                          <span className="truncate max-w-[260px]">{s.address}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Rate + earnings */}
                {s && (
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-zinc-900">{INR}{s.hourly_rate}/hr</p>
                    {effectiveEarned != null && (
                      <p className={cn('mt-1 text-lg font-bold', isActual ? 'text-emerald-600' : 'text-zinc-400')}>
                        {INR}{effectiveEarned.toFixed(0)}
                      </p>
                    )}
                    <p className="text-[11px] text-zinc-400">{isActual ? 'net earned' : 'est. earnings'}</p>
                  </div>
                )}
              </div>

              {/* Stats strip */}
              {s && (
                <div className="grid grid-cols-3 divide-x divide-zinc-100 border-t border-zinc-100 bg-zinc-50/60">
                  <div className="px-6 py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Shift duration</p>
                    <p className="mt-0.5 text-sm font-semibold text-zinc-700">
                      {s.start_time && s.end_time
                        ? `${shiftDurationHours(s.start_time, s.end_time).toFixed(1)} hrs`
                        : 'Unknown'}
                    </p>
                  </div>
                  <div className="px-6 py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Hours {ts?.total_hours != null ? '(actual)' : '(scheduled)'}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-zinc-700">
                      {effectiveHours != null ? `${effectiveHours.toFixed(2)} hrs` : 'N/A'}
                    </p>
                  </div>
                  <div className="px-6 py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      {isActual ? 'Net earned' : 'Est. earnings'}
                    </p>
                    <p className={cn('mt-0.5 text-sm font-semibold', isActual ? 'text-emerald-600' : 'text-zinc-700')}>
                      {effectiveEarned != null ? `${INR}${effectiveEarned.toFixed(0)}` : 'N/A'}
                    </p>
                  </div>
                </div>
              )}

              {/* Timesheet detail */}
              {ts && (
                <div className="border-t border-zinc-100 px-6 py-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Timesheet</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-zinc-400">Clock in</p>
                      <p className="mt-0.5 text-sm font-semibold text-zinc-700">
                        {ts.clock_in
                          ? new Date(ts.clock_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                          : 'Not recorded'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Clock out</p>
                      <p className="mt-0.5 text-sm font-semibold text-zinc-700">
                        {ts.clock_out
                          ? new Date(ts.clock_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                          : 'Not recorded'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Hours worked</p>
                      <p className="mt-0.5 text-sm font-semibold text-zinc-700">
                        {ts.total_hours != null ? `${ts.total_hours.toFixed(2)} hrs` : 'Pending'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Gross / Net</p>
                      <p className="mt-0.5 text-sm font-semibold text-zinc-700">
                        {ts.gross_amount != null ? `${INR}${ts.gross_amount.toFixed(0)}` : 'Pending'}
                        {ts.net_to_worker != null ? ` / ${INR}${ts.net_to_worker.toFixed(0)}` : ''}
                      </p>
                    </div>
                  </div>

                  {(ts.worker_rating_employer != null || ts.employer_rating_worker != null) && (
                    <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
                      <StarRow label="Worker rated this employer" stars={ts.worker_rating_employer} />
                      <StarRow label="Employer rated this worker" stars={ts.employer_rating_worker} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProfileGridItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-zinc-700">{value}</p>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{children}</p>
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-500">{label}</Label>
      {children}
    </div>
  )
}

function TimelineSegment({ complete }: { complete: boolean }) {
  return (
    <div
      className="hidden min-h-8 self-start pt-0.5 md:flex md:h-[1.875rem] md:w-full md:min-w-[2rem] md:max-w-[2.5rem] md:flex-col md:justify-center"
      aria-hidden
    >
      <div
        className={cn(
          'h-0.5 w-full rounded-full',
          complete ? 'bg-emerald-500' : 'bg-red-400',
        )}
      />
    </div>
  )
}

function TimelineStep({
  number, done, rejected, title, subtitle, note, onClick,
}: {
  number: number
  done?: boolean
  rejected?: boolean
  title: string
  subtitle: string
  note?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      className="-m-1 flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border border-transparent p-2 text-left transition-colors hover:border-zinc-200 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
      onClick={onClick}
    >
      <div className={cn(
        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
        done ? 'bg-emerald-600 text-white' :
        rejected ? 'bg-red-500 text-white' :
        'bg-zinc-100 text-zinc-400'
      )}>
        {done ? <CheckCircle2Icon className="h-4 w-4" /> : rejected ? <XCircleIcon className="h-4 w-4" /> : number}
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-zinc-800">{title}</p>
        <p className="text-xs text-zinc-400">{subtitle}</p>
        {note && <p className="text-xs text-zinc-400 italic">{note}</p>}
      </div>
    </button>
  )
}

function DropZone({
  label, hint, accept, saving, onFile, children,
}: {
  label: string
  hint: string
  accept: string
  saving: boolean
  onFile: (file: File) => void
  children?: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-5 transition-colors hover:border-zinc-400"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100">
            <UploadCloudIcon className="h-4 w-4 text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-700">{label}</p>
            <p className="text-xs text-zinc-400">{hint}</p>
          </div>
        </div>
        <Input
          type="file"
          accept={accept}
          disabled={saving}
          className="max-w-[220px] border-zinc-200 text-xs"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
        />
      </div>
      {children}
    </div>
  )
}

// ??????????????????????????????????????????????
// Qualification sections
// ??????????????????????????????????????????????

function formatQualDateRange(fromDate: string, toDate: string | null, isCurrent: boolean) {
  const from = fmtDate(fromDate)
  if (!toDate && isCurrent) return `${from} � Present`
  if (!toDate) return from
  return `${from} � ${fmtDate(toDate)}`
}

function QualCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
      {children}
    </div>
  )
}

function QualificationsEducationSection({ qualifications }: { qualifications: NonNullable<AdminWorkerDetail['qualifications']> }) {
  const education = qualifications.filter((q) => q.type === 'education')
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Education</p>
      {education.length === 0
        ? <p className="text-sm text-zinc-400">No education added yet. Use Edit to add qualifications.</p>
        : (
          <QualCard>
            {education.map((q) => (
              <div key={q.id} className="flex gap-4 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-100 bg-zinc-50">
                  <GraduationCapIcon className="h-4 w-4 text-zinc-500" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-zinc-900">{q.title}</p>
                  <p className="text-sm text-zinc-500">{q.institution}</p>
                  <p className="text-xs text-zinc-400">{formatQualDateRange(q.from_date, q.to_date, q.is_currently_pursuing)}</p>
                  {q.description && <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 whitespace-pre-wrap">{stripQualDescription(q.description)}</p>}
                </div>
              </div>
            ))}
          </QualCard>
        )}
    </div>
  )
}

function QualificationsWorkSection({ qualifications }: { qualifications: NonNullable<AdminWorkerDetail['qualifications']> }) {
  const work = qualifications.filter((q) => q.type === 'work_experience')
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Work experience</p>
      {work.length === 0
        ? <p className="text-sm text-zinc-400">No work experience added yet. Use Edit to add qualifications.</p>
        : (
          <QualCard>
            {work.map((q) => (
              <div key={q.id} className="flex gap-4 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-100 bg-zinc-50">
                  <BriefcaseBusinessIcon className="h-4 w-4 text-zinc-500" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-zinc-900">{q.title}</p>
                  <p className="text-sm text-zinc-500">{q.institution}</p>
                  <p className="text-xs text-zinc-400">{formatQualDateRange(q.from_date, q.to_date, q.is_currently_pursuing)}</p>
                  {q.description && <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 whitespace-pre-wrap">{stripQualDescription(q.description)}</p>}
                </div>
              </div>
            ))}
          </QualCard>
        )}
    </div>
  )
}

function QualificationsCertificationsSection({ qualifications }: { qualifications: NonNullable<AdminWorkerDetail['qualifications']> }) {
  const certs = qualifications.filter((q) => q.type === 'certification')
  if (certs.length === 0) return null
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Licenses & certifications</p>
      <QualCard>
        {certs.map((q) => (
          <div key={q.id} className="px-5 py-4 space-y-0.5">
            <p className="font-semibold text-zinc-900">{q.title}</p>
            <p className="text-sm text-zinc-500">{q.institution}</p>
            <p className="text-xs text-zinc-400">{formatQualDateRange(q.from_date, q.to_date, q.is_currently_pursuing)}</p>
            {q.description && <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 whitespace-pre-wrap">{stripQualDescription(q.description)}</p>}
          </div>
        ))}
      </QualCard>
    </div>
  )
}

function stripQualDescription(raw: string) {
  const t = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return t || raw
}