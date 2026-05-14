import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiRequestError, apiDeleteJson, apiGet, apiPatch, apiPost } from '@/lib/api'
import { fmtDateTime, fmtRating } from '@/lib/fmt'
import type { AdminEmployerDetail } from '@/types/admin'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  ArrowLeftIcon,
  BadgeCheckIcon,
  Building2Icon,
  CopyIcon,
  ExternalLinkIcon,
  PencilIcon,
  StarIcon,
  Trash2Icon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type DetailRes = { status: string; data: AdminEmployerDetail }

function copyText(label: string, text: string) {
  void navigator.clipboard
    .writeText(text)
    .then(() => toast.success(`${label} copied`), () => toast.error('Could not copy'))
}

export function EmployerDetailPage() {
  const { employerId } = useParams<{ employerId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [data, setData] = useState<AdminEmployerDetail | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [hoverStars, setHoverStars] = useState(0)
  const [ratingSaving, setRatingSaving] = useState(false)

  const load = useCallback(() => {
    if (!employerId) return
    setLoading(true)
    setErr(null)
    apiGet<DetailRes>(`/admin/employers/${employerId}`)
      .then((r) => setData(r.data))
      .catch((e: unknown) => setErr(e instanceof ApiRequestError ? e.message : 'Failed to load employer'))
      .finally(() => setLoading(false))
  }, [employerId])

  useEffect(() => { load() }, [load])

  async function toggleVerified(verified: boolean) {
    if (!data) return
    setSaving(true)
    try {
      await apiPatch(`/admin/employers/${data.id}/verification`, { verified })
      setData((d) => (d ? { ...d, verified } : d))
      toast.success(verified ? 'Employer verified' : 'Employer unverified')
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  async function addAdminRating(stars: number) {
    if (!data) return
    setRatingSaving(true)
    try {
      const res = (await apiPost(`/admin/employers/${data.id}/rating`, { stars })) as { data: { rating_avg: number } }
      setData((d) => (d ? { ...d, rating_avg: res.data.rating_avg } : d))
      toast.success('Rating saved')
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not save rating')
    } finally {
      setRatingSaving(false)
    }
  }

  if (!employerId) return <div className="p-8 text-sm text-zinc-400">Invalid route.</div>
  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-sm text-zinc-400">Loading employer…</p>
    </div>
  )
  if (err || !data) return <div className="p-8 text-sm text-red-500">{err ?? 'Not found'}</div>

  const effectiveStars = hoverStars || Math.round(data.rating_avg)
  const canAdminRate = (data as { admin_can_rate?: boolean }).admin_can_rate !== false

  return (
    <div className="w-full">

      {/* ── Top bar ── */}
      <div className="border-b border-zinc-200 bg-white px-4 py-4 lg:px-6">
        <div className="flex w-full min-w-0 flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-zinc-400 hover:text-zinc-900" asChild>
            <Link to="/employers">
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Employers
            </Link>
          </Button>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <Button variant="outline" size="sm" className="gap-1.5 border-zinc-200 text-zinc-600 hover:bg-zinc-50" onClick={() => copyText('Employer ID', data.id)}>
              <CopyIcon className="h-3.5 w-3.5" />
              Copy ID
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 border-zinc-200 text-zinc-600 hover:bg-zinc-50" onClick={() => navigate(`/employers/${data.id}/edit`)}>
              <PencilIcon className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50" onClick={() => setDeleteOpen(true)}>
              <Trash2Icon className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 px-4 py-8 lg:px-6 space-y-8">

        {/* ── Hero identity row ── */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            {/* Logo */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
              {data.logo_preview_url || data.logo_url ? (
                <img
                  src={data.logo_preview_url ?? data.logo_url ?? ''}
                  alt={data.company_name}
                  className={cn('h-full w-full rounded-xl', (data.logo_fit ?? 'contain') === 'cover' ? 'object-cover' : 'object-contain')}
                />
              ) : (
                <Building2Icon className="h-8 w-8 text-zinc-300" />
              )}
            </div>
            {/* Name + meta */}
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="truncate text-xl font-semibold text-zinc-900 sm:text-2xl">{data.company_name}</h1>
                {data.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <BadgeCheckIcon className="h-3 w-3" />
                    Verified
                  </span>
                )}
                {!data.verified && (
                  <span className="inline-flex items-center rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-[11px] font-medium text-zinc-500">
                    Unverified
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                {data.industry && <span>{data.industry}</span>}
                {data.industry && data.city && <span className="h-3 w-px bg-zinc-200" />}
                {data.city && <span>{data.city}</span>}
                {data.company_size && <><span className="h-3 w-px bg-zinc-200" /><span>{data.company_size}</span></>}
                {data.website_url && (
                  <>
                    <span className="h-3 w-px bg-zinc-200" />
                    <a href={data.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 transition-colors">
                      <ExternalLinkIcon className="h-3 w-3" />
                      Website
                    </a>
                  </>
                )}
              </div>
              <p className="font-mono text-[11px] text-zinc-300">{data.id}</p>
            </div>
          </div>

          {/* Status pill */}
          <span className={cn(
            'self-start rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider',
            data.status === 'active'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
          )}>
            {data.status}
          </span>
        </div>

        {/* ── 3-stat strip ── */}
        <div className="grid grid-cols-1 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Rating</p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-zinc-900">{fmtRating(data.rating_avg)}</span>
              <span className="text-sm text-zinc-400">/ 5</span>
            </p>
          </div>
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Shifts posted</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{data.total_shifts_posted}</p>
          </div>
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Trust badge</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{data.verified ? 'Yes' : 'No'}</p>
          </div>
        </div>

        {/* ── Main content: two columns ── */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">

          {/* Left column */}
          <div className="space-y-6">

            {/* Company snapshot */}
            <div className="rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-6 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Company snapshot</p>
              </div>
              <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
                <KeyValueItem label="Company name" value={data.company_name} />
                <KeyValueItem label="Industry" value={data.industry} />
                <KeyValueItem label="Company size" value={data.company_size} />
                <KeyValueItem label="City" value={data.city} />
                <KeyValueItem label="Address line 1" value={data.address_line1} />
                <KeyValueItem label="Address line 2" value={data.address_line2} />
              </div>
              {data.website_url ? (
                <div className="border-t border-zinc-100 px-6 py-3.5">
                  <a href={data.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-700 hover:text-zinc-900">
                    {data.website_url}
                    <ExternalLinkIcon className="h-3.5 w-3.5 text-zinc-400" />
                  </a>
                </div>
              ) : null}
            </div>

            {/* Primary contact compact */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Primary contact</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <ContactPill label="Name" value={data.contact_name} />
                <ContactPill label="Email" value={data.contact_email} copy={data.contact_email ?? undefined} />
                <ContactPill label="Phone" value={data.contact_phone} copy={data.contact_phone ?? undefined} />
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-6 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Notes</p>
              </div>
              <div className="px-6 py-4">
                {data.notes ? (
                  <div
                    className="text-sm leading-relaxed text-zinc-600"
                    dangerouslySetInnerHTML={{ __html: data.notes }}
                  />
                ) : (
                  <p className="text-sm text-zinc-400">No notes added yet.</p>
                )}
              </div>
            </div>

          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Admin rating widget */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Set admin rating</p>
              <div className="flex items-center gap-1" onMouseLeave={() => setHoverStars(0)}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addAdminRating(s)}
                    onMouseEnter={() => setHoverStars(s)}
                    disabled={ratingSaving || !canAdminRate}
                    className="rounded-md p-1.5 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <StarIcon className={cn('h-5 w-5 transition-colors', s <= effectiveStars ? 'fill-amber-400 text-amber-400' : 'text-zinc-200')} />
                  </button>
                ))}
              </div>
              <p className="text-xs text-zinc-400">
                {ratingSaving
                  ? 'Saving…'
                  : !canAdminRate
                    ? `Current avg: ${fmtRating(data.rating_avg)} • You already rated once`
                    : `Current avg: ${fmtRating(data.rating_avg)}`}
              </p>
            </div>

            {/* Verification toggle */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Verification</p>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-zinc-900">Trust badge</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Visible to workers in shift discovery.</p>
                </div>
                <Switch
                  id="employer-verified-toggle"
                  checked={data.verified}
                  disabled={saving}
                  onCheckedChange={toggleVerified}
                />
              </div>
              <div className={cn(
                'rounded-lg px-3 py-2 text-xs font-medium',
                data.verified ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
              )}>
                {data.verified ? '✓ This employer is verified and trusted.' : 'Employer is not yet verified.'}
              </div>
            </div>

            {/* Audit info */}
            <div className="rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Audit</p>
              </div>
              <div className="divide-y divide-zinc-100">
                <AuditRow label="Created" value={fmtDateTime(data.created_at)} />
                <AuditRow label="Last updated" value={fmtDateTime(data.updated_at)} />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Delete dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete employer permanently?</DialogTitle>
            <DialogDescription>
              This cannot be undone. Type <span className="font-semibold text-zinc-900">{data.company_name}</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs text-zinc-500">Confirmation</Label>
            <Input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder={data.company_name}
              className="border-zinc-200"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-200" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleting || deleteText.trim() !== data.company_name}
              onClick={async () => {
                setDeleting(true)
                try {
                  await apiDeleteJson(`/admin/employers/${data.id}`, { confirmation: deleteText.trim() })
                  toast.success('Employer deleted')
                  navigate('/employers')
                } catch (e) {
                  toast.error(e instanceof ApiRequestError ? e.message : 'Could not delete employer')
                } finally {
                  setDeleting(false)
                }
              }}
            >
              {deleting ? 'Deleting…' : 'Delete employer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ──────────────────────────────────────────────
// Shared components
// ──────────────────────────────────────────────

function KeyValueItem({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-100 px-6 py-3.5 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1.5 text-sm font-medium text-zinc-800 break-words">{value ?? '—'}</p>
    </div>
  )
}

function ContactPill({ label, value, copy }: { label: string; value?: React.ReactNode; copy?: string }) {
  return (
    <div className="flex w-full min-w-0 items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 sm:inline-flex sm:w-auto">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</span>
      <span className="min-w-0 truncate text-sm font-medium text-zinc-700">{value ?? '—'}</span>
      {copy ? (
        <button
          type="button"
          onClick={() => copyText(label, copy)}
          className="rounded p-0.5 text-zinc-300 transition-colors hover:text-zinc-600"
        >
          <CopyIcon className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  )
}

function AuditRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className="text-xs font-medium text-zinc-600 break-words">{value}</span>
    </div>
  )
}