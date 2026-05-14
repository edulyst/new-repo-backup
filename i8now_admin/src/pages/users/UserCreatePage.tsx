import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiRequestError, apiPost } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeftIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { USER_ROLES, USER_STATUSES } from './userDirectoryShared'

type CreateForm = {
  loginType: 'email' | 'phone'
  loginValue: string
  role: string
  status: string
  password: string
  password_login_enabled: boolean
}

export function UserCreatePage() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<CreateForm>({
    loginType: 'email',
    loginValue: '',
    role: 'worker',
    status: 'active',
    password: '',
    password_login_enabled: true,
  })

  async function submit() {
    if (!form.loginValue.trim()) {
      toast.error(`Enter a valid ${form.loginType}.`)
      return
    }
    if (form.password && form.password.length < 8) {
      toast.error('Password must be at least 8 characters, or leave it empty.')
      return
    }
    setCreating(true)
    try {
      const body: Record<string, string | number | boolean> = {
        role: form.role,
        status: form.status,
      }
      if (form.loginType === 'email') body.email = form.loginValue.trim().toLowerCase()
      else body.phone = form.loginValue.trim()
      if (form.password.length >= 8) {
        body.password = form.password
        body.password_login_enabled = form.password_login_enabled
      }
      const res = (await apiPost('/admin/users', body)) as { data: { user: { id: string } } }
      toast.success('User created.')
      navigate(`/users/${res.data.user.id}`, { replace: true })
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
          <Link to="/users">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to directory
          </Link>
        </Button>
      </div>

      <section className="space-y-1 border-b pb-4">
        <h1 className="text-xl font-semibold tracking-tight">Add user</h1>
        <p className="text-sm text-muted-foreground">
          Provision an account. They can sign in with OTP using the email or phone you provide, and optionally
          with a password if you set one and enable password sign-in.
        </p>
      </section>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Login identifier</Label>
          <div className="inline-flex w-full max-w-xl gap-2">
            {(['email', 'phone'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, loginType: t, loginValue: '' }))}
                className={cn(
                  'min-w-[140px] rounded-lg border px-4 py-2.5 text-sm font-medium capitalize transition-colors',
                  form.loginType === t
                    ? 'border-foreground bg-muted text-foreground'
                    : 'hover:bg-muted/60',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="create-login">
            {form.loginType === 'email' ? 'Email address' : 'Phone (E.164, e.g. +91...)'}
          </Label>
          <Input
            id="create-login"
            type={form.loginType === 'email' ? 'email' : 'tel'}
            autoComplete="off"
            placeholder={form.loginType === 'email' ? 'user@example.com' : '+919876543210'}
            value={form.loginValue}
            onChange={(e) => setForm((f) => ({ ...f, loginValue: e.target.value }))}
            className="h-11 max-w-lg px-3"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="create-role">Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
              <SelectTrigger id="create-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-status">Account status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger id="create-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {USER_STATUSES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Password sign-in (optional)</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Minimum 8 characters. Leave empty if the user will only use email/SMS codes.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-password">Initial password</Label>
            <Input
              id="create-password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="........"
              className="h-11 max-w-lg px-3"
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-foreground/10 bg-muted/20 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Allow password sign-in</p>
              <p className="text-xs text-muted-foreground">
                When off, OTP remains the only sign-in method even if a password is stored.
              </p>
            </div>
            <Switch
              checked={form.password_login_enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, password_login_enabled: v }))}
            />
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button onClick={submit} disabled={creating}>
            {creating ? 'Creating...' : 'Create user'}
          </Button>
          <Button variant="outline" asChild disabled={creating}>
            <Link to="/users">Cancel</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
