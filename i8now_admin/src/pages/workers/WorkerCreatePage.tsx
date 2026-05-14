import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiRequestError, apiPost } from '@/lib/api'
import type { AdminWorkerDetail } from '@/types/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ArrowLeftIcon, CalendarIcon } from 'lucide-react'
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

type WorkerCreateForm = {
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
  password: string
  password_login_enabled: boolean
}

export function WorkerCreatePage() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<WorkerCreateForm>({
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
    password: '',
    password_login_enabled: true,
  })

  async function submit() {
    if (!form.loginValue.trim() || !form.full_name.trim() || !form.dob || !form.city.trim()) {
      toast.error('Please fill login, full name, DOB, and city.')
      return
    }
    const lat = Number(form.location_lat)
    const lng = Number(form.location_lng)
    const radius = Number(form.radius_km)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius)) {
      toast.error('Enter valid latitude, longitude, and radius.')
      return
    }
    if (form.password && form.password.length < 8) {
      toast.error('Password must be at least 8 characters, or leave it empty.')
      return
    }

    setCreating(true)
    try {
      const body: Record<string, string | number | boolean> = {
        full_name: form.full_name.trim(),
        dob: form.dob,
        city: form.city.trim(),
        location_lat: lat,
        location_lng: lng,
        radius_km: radius,
        status: form.status,
      }
      if (form.loginType === 'email') body.email = form.loginValue.trim().toLowerCase()
      else body.phone = form.loginValue.trim()
      if (form.bio.trim()) body.bio = form.bio.trim()
      if (form.password.trim()) {
        body.password = form.password
        body.password_login_enabled = form.password_login_enabled
      }

      const res = (await apiPost('/admin/workers', body)) as { data: AdminWorkerDetail }
      toast.success('Worker created.')
      navigate(`/workers/${res.data.profile.id}/edit?step=education`, { replace: true })
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground" asChild>
          <Link to="/workers">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to workers
          </Link>
        </Button>
      </div>

      <section className="space-y-1 border-b pb-4">
        <h1 className="text-xl font-semibold tracking-tight">Create worker</h1>
        <p className="text-sm text-muted-foreground">Create login identity and worker profile from admin panel.</p>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Login type</Label>
          <div className="inline-flex gap-2">
            <Button type="button" size="sm" variant={form.loginType === 'email' ? 'default' : 'outline'} onClick={() => setForm((f) => ({ ...f, loginType: 'email', loginValue: '' }))}>Email</Button>
            <Button type="button" size="sm" variant={form.loginType === 'phone' ? 'default' : 'outline'} onClick={() => setForm((f) => ({ ...f, loginType: 'phone', loginValue: '' }))}>Phone</Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{form.loginType === 'email' ? 'Email address' : 'Phone (E.164)'}</Label>
          <Input value={form.loginValue} onChange={(e) => setForm((f) => ({ ...f, loginValue: e.target.value }))} className="h-11 px-3" placeholder={form.loginType === 'email' ? 'worker@example.com' : '+447700900123'} />
        </div>
        <div className="space-y-2">
          <Label>Full name</Label>
          <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className="h-11 px-3" placeholder="John Worker" />
        </div>

        <div className="space-y-2">
          <Label>Date of birth</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn('h-11 w-full justify-start px-3 text-left font-normal', !form.dob && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.dob || 'Select date of birth'}
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
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="h-11 px-3" placeholder="London" />
        </div>

        <div className="space-y-2">
          <Label>Latitude</Label>
          <Input value={form.location_lat} onChange={(e) => setForm((f) => ({ ...f, location_lat: e.target.value }))} className="h-11 px-3" placeholder="51.5074" />
        </div>
        <div className="space-y-2">
          <Label>Longitude</Label>
          <Input value={form.location_lng} onChange={(e) => setForm((f) => ({ ...f, location_lng: e.target.value }))} className="h-11 px-3" placeholder="-0.1278" />
        </div>

        <div className="space-y-2">
          <Label>Radius (km)</Label>
          <Input value={form.radius_km} onChange={(e) => setForm((f) => ({ ...f, radius_km: e.target.value }))} className="h-11 px-3" placeholder="10" />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v: WorkerCreateForm['status']) => setForm((f) => ({ ...f, status: v }))}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">pending</SelectItem>
              <SelectItem value="active">active</SelectItem>
              <SelectItem value="suspended">suspended</SelectItem>
              <SelectItem value="banned">banned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Bio (optional)</Label>
          <Input value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} className="h-11 px-3" placeholder="Short profile summary" />
        </div>

        <Separator className="sm:col-span-2" />

        <div className="space-y-2">
          <Label>Initial password (optional)</Label>
          <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="h-11 px-3" placeholder="Minimum 8 characters" />
        </div>
        <div className="flex items-end gap-3 pb-1">
          <Switch checked={form.password_login_enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, password_login_enabled: v }))} />
          <Label>Enable password login</Label>
        </div>
      </div>

      <Separator />

      <div className="flex flex-wrap gap-2">
        <Button onClick={submit} disabled={creating}>{creating ? 'Creating...' : 'Create worker'}</Button>
        <Button variant="outline" asChild disabled={creating}><Link to="/workers">Cancel</Link></Button>
      </div>
    </div>
  )
}
