import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiRequestError, apiGet, apiPost } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { AddressMapPicker } from '@/components/ui/address-map-picker'
import { ArrowLeftIcon, CalendarIcon, Clock3Icon } from 'lucide-react'
import { toast } from 'sonner'

type EmployerOption = { id: string; company_name: string }
type CategoryOption = { id: string; name: string }

export function ShiftCreatePage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
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
    currency: 'INR',
    slots_total: '1',
    address: '',
    location_lat: '',
    location_lng: '',
    geofence_radius_m: '200',
    status: 'open' as 'open' | 'filled' | 'cancelled',
  })
  const timeOptions = useMemo(() => buildTimeOptions(), [])

  useEffect(() => {
    apiGet<{ data: { employers: EmployerOption[] } }>('/admin/employers?page=1&limit=100')
      .then((r) => setEmployers(r.data.employers))
      .catch(() => {})
    apiGet<{ data: { categories: CategoryOption[] } }>('/admin/shifts-categories')
      .then((r) => setCategories(r.data.categories))
      .catch(() => {})
  }, [])

  async function submit() {
    if (!form.employer_id || !form.category_id || !form.title.trim() || !form.date || !form.start_time || !form.end_time) {
      toast.error('Fill required fields.')
      return
    }
    if (!form.address.trim() || form.location_lat === '' || form.location_lng === '') {
      toast.error('Select shift location from address suggestions or map.')
      return
    }
    setSaving(true)
    try {
      const normalizedDescription = normalizeRichText(form.description)
      const res = (await apiPost('/admin/shifts', {
        employer_id: form.employer_id,
        category_id: form.category_id,
        title: form.title.trim(),
        description: normalizedDescription,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        hourly_rate: Number(form.hourly_rate),
        currency: form.currency,
        slots_total: Number(form.slots_total),
        address: form.address.trim(),
        location_lat: Number(form.location_lat),
        location_lng: Number(form.location_lng),
        geofence_radius_m: Number(form.geofence_radius_m),
        status: form.status,
      })) as { data: { id: string } }
      toast.success('Shift created')
      navigate(`/shifts/${res.data.id}`)
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not create shift')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 p-4 lg:p-6">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit gap-1.5 text-muted-foreground" asChild>
        <Link to="/shifts"><ArrowLeftIcon className="h-4 w-4" />Back to shifts</Link>
      </Button>
      <section className="space-y-1 border-b pb-4">
        <h1 className="text-xl font-semibold tracking-tight">Create shift</h1>
        <p className="text-sm text-muted-foreground">Add a shift with full operations fields.</p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Employer"><Select value={form.employer_id} onValueChange={(v) => setForm((f) => ({ ...f, employer_id: v }))}><SelectTrigger className="h-11"><SelectValue placeholder="Select employer" /></SelectTrigger><SelectContent>{employers.map((e) => <SelectItem key={e.id} value={e.id}>{e.company_name}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Category"><Select value={form.category_id} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}><SelectTrigger className="h-11"><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Title"><Input className="h-11 px-3" placeholder="e.g. Morning warehouse loading shift" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></Field>
        <Field label="Description">
          <RichTextEditor
            value={form.description}
            onChange={(value) => setForm((f) => ({ ...f, description: value }))}
            placeholder="Shift summary, worker instructions, and reporting notes."
          />
        </Field>
        <Field label="Date">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="h-11 w-full justify-between px-3 font-normal">
                <span className={form.date ? 'text-foreground' : 'text-muted-foreground'}>{form.date || 'Select shift date'}</span>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={form.date ? new Date(`${form.date}T00:00:00`) : undefined} onSelect={(d) => setForm((f) => ({ ...f, date: d ? toYmd(d) : '' }))} />
            </PopoverContent>
          </Popover>
        </Field>
        <Field label="Start time">
          <Select value={form.start_time} onValueChange={(v) => setForm((f) => ({ ...f, start_time: v }))}>
            <SelectTrigger className="h-11 px-3">
              <Clock3Icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Select start time" />
            </SelectTrigger>
            <SelectContent>{timeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="End time">
          <Select value={form.end_time} onValueChange={(v) => setForm((f) => ({ ...f, end_time: v }))}>
            <SelectTrigger className="h-11 px-3">
              <Clock3Icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Select end time" />
            </SelectTrigger>
            <SelectContent>{timeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Hourly rate"><Input type="number" className="h-11 px-3" placeholder="e.g. 180" value={form.hourly_rate} onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))} /></Field>
        <Field label="Currency"><Input className="h-11 px-3" placeholder="e.g. INR" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} /></Field>
        <Field label="Slots total"><Input type="number" className="h-11 px-3" placeholder="e.g. 8" value={form.slots_total} onChange={(e) => setForm((f) => ({ ...f, slots_total: e.target.value }))} /></Field>
        <div className="sm:col-span-2">
          <AddressMapPicker
            label="Shift location"
            placeholder="Search venue address"
            value={form.address}
            lat={form.location_lat ? Number(form.location_lat) : null}
            lng={form.location_lng ? Number(form.location_lng) : null}
            onValueChange={(next) => setForm((f) => ({ ...f, address: next }))}
            onLocationPick={({ address, lat, lng }) =>
              setForm((f) => ({ ...f, address: address || f.address, location_lat: String(lat), location_lng: String(lng) }))
            }
          />
        </div>
        <Field label="Geofence (m)"><Input type="number" className="h-11 px-3" placeholder="e.g. 200" value={form.geofence_radius_m} onChange={(e) => setForm((f) => ({ ...f, geofence_radius_m: e.target.value }))} /></Field>
      </div>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving}>{saving ? 'Creating...' : 'Create shift'}</Button>
        <Button variant="outline" asChild><Link to="/shifts">Cancel</Link></Button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}

function buildTimeOptions() {
  const list: string[] = []
  for (let h = 0; h < 24; h += 1) {
    for (const m of [0, 30]) {
      list.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return list
}

function toYmd(value: Date) {
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, '0')
  const d = String(value.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function normalizeRichText(value: string) {
  const plain = value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  return plain ? value : ''
}
