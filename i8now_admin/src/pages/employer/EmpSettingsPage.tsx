import { useEffect, useState } from 'react'
import { apiGet, apiPatch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Building2, Save, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface Profile {
  company_name?: string; industry?: string; website?: string; description?: string
  address?: string; city?: string; country?: string
  contact_email?: string; contact_phone?: string; employee_count?: string; founded_year?: string
}

const INDUSTRIES    = ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Construction', 'Hospitality', 'Education', 'Logistics', 'Other']
const EMPLOYEE_RANGES = ['1–10', '11–50', '51–200', '201–500', '500+']
const inputCls      = 'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-zinc-400'

function Section({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-zinc-400" />}
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      </div>
      {children}
    </div>
  )
}
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={cn('space-y-1.5', className)}><label className="text-xs font-medium text-zinc-700">{label}</label>{children}</div>
}

export function EmpSettingsPage() {
  const [form, setForm]       = useState<Profile>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    apiGet<{ data: { profile: Profile } }>('/employer/me')
      .then((r) => setForm(r.data?.profile ?? {}))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await apiPatch('/employer/me/profile', form)
      toast.success('Profile saved')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: any) { toast.error(e.message ?? 'Failed to save') }
    finally { setSaving(false) }
  }

  function set(key: keyof Profile, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  if (loading) return (
    <div className="mx-auto max-w-2xl p-6 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-100" />
      ))}
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Company Settings</h1>
        <p className="text-sm text-zinc-500">Update your company profile and contact information.</p>
      </div>

      <Section title="Company Information" icon={Building2}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name *">
            <input value={form.company_name ?? ''} onChange={(e) => set('company_name', e.target.value)} placeholder="Acme Corp" className={inputCls} />
          </Field>
          <Field label="Industry">
            <select value={form.industry ?? ''} onChange={(e) => set('industry', e.target.value)} className={inputCls}>
              <option value="">Select industry</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Website">
            <input value={form.website ?? ''} onChange={(e) => set('website', e.target.value)} placeholder="https://yourcompany.com" className={inputCls} />
          </Field>
          <Field label="Founded year">
            <input value={form.founded_year ?? ''} onChange={(e) => set('founded_year', e.target.value)} placeholder="2020" type="number" className={inputCls} />
          </Field>
          <Field label="Company size" className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {EMPLOYEE_RANGES.map((r) => (
                <button key={r} type="button" onClick={() => set('employee_count', r)}
                  className={cn('rounded-lg border px-3 py-2 text-xs font-medium transition',
                    form.employee_count === r ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400')}>
                  {r} employees
                </button>
              ))}
            </div>
          </Field>
        </div>
        <Field label="About the company">
          <textarea value={form.description ?? ''} onChange={(e) => set('description', e.target.value)}
            rows={4} placeholder="Tell candidates about your company…" className={`${inputCls} resize-none`} />
        </Field>
      </Section>

      <Section title="Location">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address" className="sm:col-span-2">
            <input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} placeholder="123 Business Park, Floor 4" className={inputCls} />
          </Field>
          <Field label="City">
            <input value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} placeholder="City" className={inputCls} />
          </Field>
          <Field label="Country">
            <input value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} placeholder="Country" className={inputCls} />
          </Field>
        </div>
      </Section>

      <Section title="Contact Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact email">
            <input type="email" value={form.contact_email ?? ''} onChange={(e) => set('contact_email', e.target.value)} placeholder="hr@yourcompany.com" className={inputCls} />
          </Field>
          <Field label="Contact phone">
            <input value={form.contact_phone ?? ''} onChange={(e) => set('contact_phone', e.target.value)} placeholder="+1 555 123 4567" className={inputCls} />
          </Field>
        </div>
      </Section>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50">
          {saved
            ? <><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Saved</>
            : saving ? 'Saving…'
            : <><Save className="h-4 w-4" /> Save Changes</>}
        </button>
      </div>
    </div>
  )
}
