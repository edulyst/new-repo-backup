import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiRequestError, apiDeleteJson, apiGet, apiPatch, apiPostForm } from '@/lib/api'
import type { AdminEmployerDetail } from '@/types/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { AddressMapPicker } from '@/components/ui/address-map-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ArrowLeftIcon, UploadCloudIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'

type Form = {
  company_name: string
  logo_url: string
  logo_fit: 'contain' | 'cover'
  verified: boolean
  industry: string
  company_size: string
  website_url: string
  contact_name: string
  contact_email: string
  contact_phone: string
  city: string
  address_line1: string
  address_line2: string
  notes: string
  status: 'active' | 'inactive'
}

export function EmployerEditPage() {
  const { employerId } = useParams<{ employerId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoRemoving, setLogoRemoving] = useState(false)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('')
  const [locationPin, setLocationPin] = useState<{ lat: number; lng: number } | null>(null)
  const [form, setForm] = useState<Form>({
    company_name: '',
    logo_url: '',
    logo_fit: 'contain',
    verified: false,
    industry: '',
    company_size: '',
    website_url: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    city: '',
    address_line1: '',
    address_line2: '',
    notes: '',
    status: 'active',
  })

  useEffect(() => {
    if (!employerId) return
    setLoading(true)
    apiGet<{ data: AdminEmployerDetail }>(`/admin/employers/${employerId}`)
      .then((res) =>
        {
          setForm({
            company_name: res.data.company_name ?? '',
            logo_url: res.data.logo_url ?? '',
            logo_fit: res.data.logo_fit ?? 'contain',
            verified: !!res.data.verified,
            industry: res.data.industry ?? '',
            company_size: res.data.company_size ?? '',
            website_url: res.data.website_url ?? '',
            contact_name: res.data.contact_name ?? '',
            contact_email: res.data.contact_email ?? '',
            contact_phone: res.data.contact_phone ?? '',
            city: res.data.city ?? '',
            address_line1: res.data.address_line1 ?? '',
            address_line2: res.data.address_line2 ?? '',
            notes: res.data.notes ?? '',
            status: res.data.status ?? 'active',
          })
          setLogoPreviewUrl(res.data.logo_preview_url ?? res.data.logo_url ?? '')
        },
      )
      .catch((e) => toast.error(e instanceof ApiRequestError ? e.message : 'Failed to load employer'))
      .finally(() => setLoading(false))
  }, [employerId])

  async function submit() {
    if (!employerId) return
    if (!form.company_name.trim()) {
      toast.error('Company name is required.')
      return
    }
    setSaving(true)
    try {
      const normalizedNotes = normalizeRichText(form.notes)
      await apiPatch(`/admin/employers/${employerId}/profile`, {
        company_name: form.company_name.trim(),
        logo_url: form.logo_url.trim() || null,
        logo_fit: form.logo_fit,
        verified: form.verified,
        industry: form.industry.trim() || null,
        company_size: form.company_size.trim() || null,
        website_url: form.website_url.trim() || null,
        contact_name: form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        city: form.city.trim() || null,
        address_line1: form.address_line1.trim() || null,
        address_line2: form.address_line2.trim() || null,
        notes: normalizedNotes || null,
        status: form.status,
      })
      toast.success('Employer updated.')
      navigate(`/employers/${employerId}`)
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (!employerId) return <div className="p-6 text-sm text-muted-foreground">Invalid route.</div>
  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading employer...</div>

  return (
    <div className="flex w-full flex-col gap-0 bg-zinc-50 min-h-screen">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" asChild>
            <Link to={`/employers/${employerId}`}>
              <ArrowLeftIcon className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <h1 className="text-base font-semibold leading-tight">Edit employer</h1>
            <p className="text-xs text-muted-foreground">Company profile, branding &amp; verification</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild disabled={saving}><Link to={`/employers/${employerId}`}>Cancel</Link></Button>
          <Button onClick={submit} disabled={saving} className="px-6">{saving ? 'Saving...' : 'Save changes'}</Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="w-full space-y-4 p-6">

        {/* Company basics */}
        <div className="rounded-2xl border bg-white">
          <div className="border-b px-6 py-4">
            <p className="text-sm font-semibold text-zinc-800">Company basics</p>
            <p className="text-xs text-zinc-400">Core identifiers and account status.</p>
          </div>
          <div className="grid gap-5 p-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Company name</Label>
              <Input
                value={form.company_name}
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                className="h-[54px] rounded-xl px-4 text-sm"
                placeholder="Acme Staffing Ltd"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: 'active' | 'inactive') => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger className="h-[54px] rounded-xl px-4 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Industry</Label>
              <Input
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                className="h-[54px] rounded-xl px-4 text-sm"
                placeholder="Events and Staffing"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Company size</Label>
              <Input
                value={form.company_size}
                onChange={(e) => setForm((f) => ({ ...f, company_size: e.target.value }))}
                className="h-[54px] rounded-xl px-4 text-sm"
                placeholder="51–200 employees"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Website</Label>
              <Input
                value={form.website_url}
                onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
                className="h-[54px] rounded-xl px-4 text-sm"
                placeholder="https://example.com"
              />
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="rounded-2xl border bg-white">
          <div className="border-b px-6 py-4">
            <p className="text-sm font-semibold text-zinc-800">Branding</p>
            <p className="text-xs text-zinc-400">Company logo and display options.</p>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex h-[54px] cursor-pointer items-center gap-2 rounded-xl border bg-zinc-50 px-5 text-sm font-medium hover:bg-zinc-100 transition-colors">
                <UploadCloudIcon className="h-4 w-4" />
                Upload logo
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    setLogoUploading(true)
                    try {
                      const fd = new FormData()
                      fd.append('kind', 'employer_logo')
                      fd.append('file', f)
                      const uploadRes = (await apiPostForm(`/admin/employers/${employerId}/uploads/logo`, fd)) as {
                        data: { file_url: string; preview_url?: string }
                      }
                      await apiPatch(`/admin/employers/${employerId}/profile`, { logo_url: uploadRes.data.file_url })
                      setForm((x) => ({ ...x, logo_url: uploadRes.data.file_url }))
                      setLogoPreviewUrl(uploadRes.data.preview_url ?? uploadRes.data.file_url)
                      toast.success('Logo uploaded')
                    } catch (err) {
                      toast.error(err instanceof ApiRequestError ? err.message : 'Could not upload logo')
                    } finally {
                      setLogoUploading(false)
                    }
                  }}
                />
              </label>
              <Select value={form.logo_fit} onValueChange={(v: 'contain' | 'cover') => setForm((f) => ({ ...f, logo_fit: v }))}>
                <SelectTrigger className="h-[54px] w-[180px] rounded-xl px-4 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contain">Fit: contain</SelectItem>
                  <SelectItem value="cover">Fit: cover</SelectItem>
                </SelectContent>
              </Select>
              {(form.logo_url || logoPreviewUrl) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-[54px] px-4 text-destructive hover:bg-destructive/5"
                  disabled={logoRemoving}
                  onClick={async () => {
                    if (!form.logo_url) return
                    setLogoRemoving(true)
                    try {
                      if (/^https?:\/\//i.test(form.logo_url)) {
                        await apiDeleteJson(`/admin/employers/${employerId}/uploads/logo`, { file_url: form.logo_url })
                      }
                      await apiPatch(`/admin/employers/${employerId}/profile`, { logo_url: null })
                      setForm((x) => ({ ...x, logo_url: '' }))
                      setLogoPreviewUrl('')
                      toast.success('Logo removed')
                    } catch (err) {
                      toast.error(err instanceof ApiRequestError ? err.message : 'Could not remove logo')
                    } finally {
                      setLogoRemoving(false)
                    }
                  }}
                >
                  <XIcon className="mr-1.5 h-4 w-4" />
                  Remove
                </Button>
              ) : null}
            </div>
            {(logoPreviewUrl || form.logo_url) ? (
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border bg-white p-1.5 shadow-sm">
                  <img
                    src={logoPreviewUrl || form.logo_url}
                    alt="Employer logo"
                    className={form.logo_fit === 'cover' ? 'h-full w-full rounded-lg object-cover' : 'h-full w-full rounded-lg object-contain'}
                  />
                </div>
                <p className="text-xs text-zinc-400">PNG / JPG / WebP</p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-zinc-400">PNG / JPG / WebP supported.</p>
            )}
            {logoUploading && <p className="mt-2 text-xs text-muted-foreground">Uploading...</p>}
          </div>
        </div>

        {/* Contact & address */}
        <div className="rounded-2xl border bg-white">
          <div className="border-b px-6 py-4">
            <p className="text-sm font-semibold text-zinc-800">Contact &amp; address</p>
            <p className="text-xs text-zinc-400">Primary contact person and location details.</p>
          </div>
          <div className="grid gap-5 p-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Contact name</Label>
              <Input
                value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                className="h-[54px] rounded-xl px-4 text-sm"
                placeholder="Ops Manager"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact email</Label>
              <Input
                value={form.contact_email}
                onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                className="h-[54px] rounded-xl px-4 text-sm"
                placeholder="ops@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact phone</Label>
              <Input
                value={form.contact_phone}
                onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                className="h-[54px] rounded-xl px-4 text-sm"
                placeholder="+919999999999"
              />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="h-[54px] rounded-xl px-4 text-sm"
                placeholder="Mumbai"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <AddressMapPicker
                label="Address line 1"
                placeholder="Search company address"
                value={form.address_line1}
                lat={locationPin?.lat ?? null}
                lng={locationPin?.lng ?? null}
                onValueChange={(next) => setForm((f) => ({ ...f, address_line1: next }))}
                onLocationPick={({ address, lat, lng, suggestion }) => {
                  const cityFromSuggestion = suggestion?.address?.city ?? suggestion?.address?.town ?? suggestion?.address?.village ?? suggestion?.address?.state_district
                  setLocationPin({ lat, lng })
                  setForm((f) => ({
                    ...f,
                    address_line1: address || f.address_line1,
                    city: f.city || cityFromSuggestion || '',
                  }))
                }}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Address line 2</Label>
              <Input
                value={form.address_line2}
                onChange={(e) => setForm((f) => ({ ...f, address_line2: e.target.value }))}
                className="h-[54px] rounded-xl px-4 text-sm"
                placeholder="Area, landmark"
              />
            </div>
          </div>
        </div>

        {/* Trust & notes */}
        <div className="rounded-2xl border bg-white">
          <div className="border-b px-6 py-4">
            <p className="text-sm font-semibold text-zinc-800">Trust &amp; notes</p>
            <p className="text-xs text-zinc-400">Verification status and internal notes.</p>
          </div>
          <div className="space-y-5 p-6">
            <div className="flex items-center justify-between rounded-xl border bg-zinc-50 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-zinc-800">Platform verified</p>
                <p className="text-xs text-zinc-400">Mark this company as officially verified on i8now.</p>
              </div>
              <Switch checked={form.verified} onCheckedChange={(v) => setForm((f) => ({ ...f, verified: v }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Internal notes</Label>
              <RichTextEditor
                value={form.notes}
                onChange={(value) => setForm((f) => ({ ...f, notes: value }))}
                placeholder="Commercial notes, onboarding context, compliance notes, and client preferences."
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap justify-end gap-3 pb-8">
          <Button variant="outline" asChild disabled={saving}><Link to={`/employers/${employerId}`}>Cancel</Link></Button>
          <Button onClick={submit} disabled={saving} className="px-8">{saving ? 'Saving...' : 'Save changes'}</Button>
        </div>

      </div>
    </div>
  )
}

function normalizeRichText(value: string) {
  const plain = value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  return plain ? value : ''
}
