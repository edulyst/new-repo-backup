import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiRequestError, apiPatch, apiPost, apiPostForm } from '@/lib/api'
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
  verified: boolean
  logo_fit: 'contain' | 'cover'
  status: 'active' | 'inactive'
}

export function EmployerCreatePage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('')
  const [locationPin, setLocationPin] = useState<{ lat: number; lng: number } | null>(null)
  const [form, setForm] = useState<Form>({
    company_name: '',
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
    verified: false,
    logo_fit: 'contain',
    status: 'active',
  })

  async function submit() {
    if (!form.company_name.trim() || !form.contact_name.trim() || !form.contact_email.trim()) {
      toast.error('Company name, contact name and contact email are required.')
      return
    }
    setSaving(true)
    try {
      const normalizedNotes = normalizeRichText(form.notes)
      const res = (await apiPost('/admin/employers', {
        company_name: form.company_name.trim(),
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
        verified: form.verified,
        logo_fit: form.logo_fit,
        status: form.status,
      })) as { data: { id: string } }
      if (logoFile) {
        const formData = new FormData()
        formData.append('kind', 'employer_logo')
        formData.append('file', logoFile)
        const uploadRes = (await apiPostForm(`/admin/employers/${res.data.id}/uploads/logo`, formData)) as {
          data: { file_url: string }
        }
        await apiPatch(`/admin/employers/${res.data.id}/profile`, { logo_url: uploadRes.data.file_url, logo_fit: form.logo_fit })
      }
      toast.success('Employer created.')
      navigate(`/employers/${res.data.id}`)
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not create employer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground" asChild>
          <Link to="/employers">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to employers
          </Link>
        </Button>
      </div>

      <section className="space-y-1 border-b pb-4">
        <h1 className="text-xl font-semibold tracking-tight">Add employer</h1>
        <p className="text-sm text-muted-foreground">Comprehensive employer profile for professional industry management.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Company information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name *"><Input className="h-11 px-3" value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} placeholder="Regal Events Pvt Ltd" /></Field>
          <Field label="Industry"><Input className="h-11 px-3" value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} placeholder="Events and Staffing" /></Field>
          <Field label="Company size"><Input className="h-11 px-3" value={form.company_size} onChange={(e) => setForm((f) => ({ ...f, company_size: e.target.value }))} placeholder="51-200 employees" /></Field>
          <Field label="Website"><Input className="h-11 px-3" value={form.website_url} onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))} placeholder="https://example.com" /></Field>
          <Field label="City"><Input className="h-11 px-3" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Mumbai" /></Field>
          <div className="sm:col-span-2">
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
          <Field label="Address line 2"><Input className="h-11 px-3" value={form.address_line2} onChange={(e) => setForm((f) => ({ ...f, address_line2: e.target.value }))} placeholder="Area, landmark" /></Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Branding</h2>
        <div className="rounded-xl border border-dashed bg-muted/20 p-4">
          <Label className="mb-2 block">Company logo upload</Label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted">
              <UploadCloudIcon className="h-4 w-4" />
              Choose logo file
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  setLogoFile(f)
                  setLogoPreviewUrl(f ? URL.createObjectURL(f) : '')
                }}
              />
            </label>
            {logoFile ? <span className="text-xs text-muted-foreground">{logoFile.name}</span> : <span className="text-xs text-muted-foreground">PNG/JPG/WebP supported. Uploaded to S3 after create.</span>}
            <Select value={form.logo_fit} onValueChange={(v: 'contain' | 'cover') => setForm((f) => ({ ...f, logo_fit: v }))}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contain">Fit: contain</SelectItem>
                <SelectItem value="cover">Fit: cover</SelectItem>
              </SelectContent>
            </Select>
            {logoFile ? (
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-destructive" onClick={() => { setLogoFile(null); setLogoPreviewUrl('') }}>
                <XIcon className="h-4 w-4" />
                Remove
              </Button>
            ) : null}
          </div>
          {logoPreviewUrl ? (
            <div className="mt-3">
              <div className="flex h-24 w-24 items-center justify-center rounded-md border bg-white p-1">
                <img src={logoPreviewUrl} alt="Logo preview" className={form.logo_fit === 'cover' ? 'h-full w-full rounded-sm object-cover' : 'h-full w-full rounded-sm object-contain'} />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Primary contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact name *"><Input className="h-11 px-3" value={form.contact_name} onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} placeholder="Operations Manager" /></Field>
          <Field label="Contact email *"><Input className="h-11 px-3" value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} placeholder="ops@company.com" /></Field>
          <Field label="Contact phone (E.164)"><Input className="h-11 px-3" value={form.contact_phone} onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} placeholder="+919999999999" /></Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Platform controls</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <Select value={form.status} onValueChange={(v: 'active' | 'inactive') => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="inactive">inactive</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="space-y-2">
            <Label>Verified badge</Label>
            <div className="flex h-11 items-center gap-3 rounded-md border px-3">
              <Switch checked={form.verified} onCheckedChange={(v) => setForm((f) => ({ ...f, verified: v }))} />
              <span className="text-sm text-muted-foreground">{form.verified ? 'Verified on platform' : 'Not verified'}</span>
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Notes</Label>
            <RichTextEditor
              value={form.notes}
              onChange={(value) => setForm((f) => ({ ...f, notes: value }))}
              placeholder="Commercial notes, onboarding context, compliance notes, and client preferences."
            />
          </div>
        </div>
      </section>

      <Separator />

      <div className="flex flex-wrap gap-2">
        <Button onClick={submit} disabled={saving}>{saving ? 'Creating...' : 'Create employer'}</Button>
        <Button variant="outline" asChild disabled={saving}><Link to="/employers">Cancel</Link></Button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function normalizeRichText(value: string) {
  const plain = value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  return plain ? value : ''
}
