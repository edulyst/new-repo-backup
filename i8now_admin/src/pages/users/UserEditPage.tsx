import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiRequestError, apiGet, apiPatch } from '@/lib/api'
import type { AdminUserDetail } from '@/types/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ArrowLeftIcon } from 'lucide-react'
import { USER_ROLES, USER_STATUSES } from './userDirectoryShared'

type UserWrap = { status: string; data: { user: AdminUserDetail } }

const E164_HINT = /^\+[1-9]\d{1,14}$/

export function UserEditPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('worker')
  const [status, setStatus] = useState('active')
  const [user, setUser] = useState<AdminUserDetail | null>(null)

  const load = useCallback(() => {
    if (!userId) return
    setLoading(true)
    setErr(null)
    apiGet<UserWrap>(`/admin/users/${userId}`)
      .then((r) => {
        const u = r.data.user
        setUser(u)
        setEmail(u.email ?? '')
        setPhone(u.phone ?? '')
        setRole(u.role)
        setStatus(u.status)
      })
      .catch((e: unknown) => {
        setErr(e instanceof ApiRequestError ? e.message : 'Failed to load user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  async function save() {
    if (!user) return

    const nextEmail = email.trim() === '' ? '' : email.trim().toLowerCase()
    const nextPhone = phone.trim() === '' ? '' : phone.trim()

    if (!nextEmail && !nextPhone) {
      toast.error('Provide at least one email or phone.')
      return
    }
    if (nextEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      toast.error('Enter a valid email or leave empty if using phone only.')
      return
    }
    if (nextPhone && !E164_HINT.test(nextPhone)) {
      toast.error('Phone must be in E.164 format (e.g. +919876543210).')
      return
    }

    const patch: Record<string, string | number> = {}
    if (role !== user.role) patch.role = role
    if (status !== user.status) patch.status = status

    const prevEmail = user.email ?? ''
    const prevPhone = user.phone ?? ''
    if (nextEmail !== prevEmail) patch.email = nextEmail
    if (nextPhone !== prevPhone) patch.phone = nextPhone

    if (!Object.keys(patch).length) {
      toast.message('No changes to save.')
      navigate(`/users/${user.id}`)
      return
    }

    setSaving(true)
    try {
      await apiPatch(`/admin/users/${user.id}`, patch)
      toast.success('User updated.')
      navigate(`/users/${user.id}`, { replace: true })
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!userId) return <div className="p-6 text-sm text-muted-foreground">Invalid route.</div>

  if (loading) {
    return (
      <div className="space-y-3 p-4 lg:p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (err || !user) {
    return (
      <div className="space-y-3 p-4 lg:p-6">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" asChild>
          <Link to="/users">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to directory
          </Link>
        </Button>
        <p className="text-sm text-destructive">{err ?? 'User not found.'}</p>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground" asChild>
          <Link to={`/users/${user.id}`}>
            <ArrowLeftIcon className="h-4 w-4" />
            Back to user
          </Link>
        </Button>
      </div>

      <section className="space-y-1 border-b pb-4">
        <h1 className="text-xl font-semibold tracking-tight">Edit user</h1>
        <p className="text-sm text-muted-foreground">
          Update login identifiers (E.164 phone), role, and status. At least one of email or phone is required.
        </p>
      </section>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="edit-email">Email</Label>
          <Input
            id="edit-email"
            type="email"
            autoComplete="off"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="max-w-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-phone">Phone (E.164)</Label>
          <Input
            id="edit-phone"
            type="tel"
            autoComplete="off"
            placeholder="+919876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="max-w-xl"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {USER_STATUSES.filter((s) => !(role === 'admin' && s === 'suspended')).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(`/users/${user.id}`)} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
