import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiRequestError, apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'
import { fmtDateTime } from '@/lib/fmt'
import type { AdminUserDetail } from '@/types/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  ArrowLeftIcon,
  CopyIcon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
  RotateCcwIcon,
  ShieldIcon,
  Trash2Icon,
} from 'lucide-react'
import {
  DL,
  DR,
  RolePill,
  Section,
  StatusPill,
} from './userDirectoryShared'

type UserWrap = { status: string; data: { user: AdminUserDetail } }

function copyId(id: string) {
  void navigator.clipboard.writeText(id).then(
    () => toast.success('User ID copied'),
    () => toast.error('Could not copy'),
  )
}

function openMail(email: string) {
  window.location.href = `mailto:${encodeURIComponent(email)}`
}

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [user, setUser] = useState<AdminUserDetail | null>(null)

  const [saving, setSaving] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [draftPwdEnabled, setDraftPwdEnabled] = useState(true)
  const [totpOtpauthUrl, setTotpOtpauthUrl] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpBusy, setTotpBusy] = useState(false)

  const load = useCallback(() => {
    if (!userId) return
    setLoading(true)
    setErr(null)
    apiGet<UserWrap>(`/admin/users/${userId}`)
      .then((r) => {
        const u = r.data.user
        setUser(u)
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

  useEffect(() => {
    if (user) setDraftPwdEnabled(user.password_login_enabled)
  }, [user])

  async function deactivate() {
    if (!user) return
    if (
      !confirm(
        `Deactivate ${user.email ?? user.phone ?? user.id}? They will be unable to sign in and all sessions will end.`,
      )
    ) {
      return
    }
    setSaving(true)
    try {
      await apiDelete(`/admin/users/${user.id}`)
      toast.success('User deactivated.')
      navigate('/users')
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  async function restore() {
    if (!user) return
    setSaving(true)
    try {
      await apiPost(`/admin/users/${user.id}/restore`, {})
      toast.success('User restored.')
      load()
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  async function savePasswordSettings() {
    if (!user || user.deleted_at) return
    const patch: Record<string, string | boolean> = {}
    if (newPassword.length >= 8) {
      patch.password = newPassword
      patch.password_login_enabled = draftPwdEnabled
    } else if (draftPwdEnabled !== user.password_login_enabled) {
      patch.password_login_enabled = draftPwdEnabled
    }
    if (draftPwdEnabled && !user.password_set && newPassword.length < 8) {
      toast.error('Enter a new password (8+ characters) before enabling password sign-in.')
      return
    }
    if (!Object.keys(patch).length) {
      toast.message('No password changes to save.')
      return
    }
    setSaving(true)
    try {
      await apiPatch(`/admin/users/${user.id}`, patch)
      toast.success('Security settings saved.')
      setNewPassword('')
      load()
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function clearStoredPassword() {
    if (!user || user.deleted_at) return
    if (!confirm('Remove the stored password? Password sign-in will be disabled.')) return
    setSaving(true)
    try {
      await apiPatch(`/admin/users/${user.id}`, { clear_password: true })
      toast.success('Password removed.')
      setNewPassword('')
      setDraftPwdEnabled(false)
      load()
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  async function startTotpSetup() {
    if (!user || user.deleted_at) return
    setTotpBusy(true)
    try {
      const raw = (await apiPost(`/admin/users/${user.id}/totp/setup`, {})) as {
        data: { otpauth_url: string }
      }
      setTotpOtpauthUrl(raw.data.otpauth_url)
      setTotpCode('')
      toast.message('Scan the QR code, then enter a 6-digit code to confirm.')
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not start authenticator setup')
    } finally {
      setTotpBusy(false)
    }
  }

  async function confirmTotpSetup() {
    if (!user || user.deleted_at) return
    if (!/^\d{6}$/.test(totpCode)) {
      toast.error('Enter the 6-digit code from the app.')
      return
    }
    setTotpBusy(true)
    try {
      await apiPost(`/admin/users/${user.id}/totp/confirm`, { code: totpCode })
      toast.success('Authenticator linked.')
      setTotpOtpauthUrl(null)
      setTotpCode('')
      load()
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Confirmation failed')
    } finally {
      setTotpBusy(false)
    }
  }

  if (!userId) {
    return <div className="p-6 text-sm text-muted-foreground">Invalid route.</div>
  }
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-[480px] w-full rounded-2xl" />
      </div>
    )
  }
  if (err || !user) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-6">
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

  const displayName = user.email ?? user.phone ?? 'User'
  const isDeactivated = !!user.deleted_at
  const isAdminAccount = user.role === 'admin'

  return (
    <div className="flex w-full flex-col gap-6 p-4 pb-12 lg:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground" asChild>
          <Link to="/users">
            <ArrowLeftIcon className="h-4 w-4" />
            Users
          </Link>
        </Button>
      </div>

      {/* Single shell: header + tabs + content, separated by borders only */}
      <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-background">
        {/* Profile strip — no avatar image */}
        <div className="flex flex-col gap-4 border-b px-5 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-8">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold tracking-tight">{displayName}</h2>
              <RolePill role={user.role} />
              <StatusPill status={user.status} />
              {isDeactivated && (
                <Badge variant="secondary" className="text-xs">
                  Deactivated
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
              <span className="truncate">{user.id}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => copyId(user.id)}
                aria-label="Copy user ID"
              >
                <CopyIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2 self-start"
            onClick={() => navigate(`/users/${user.id}/edit`)}
            disabled={isDeactivated}
          >
            <PencilIcon className="h-4 w-4" />
            Edit details
          </Button>
        </div>

        <Tabs defaultValue="overview" className="gap-0">
          <div className="border-b px-4 py-4 sm:px-6">
            <TabsList className="flex h-auto min-h-11 w-full flex-wrap gap-2 rounded-xl bg-muted/50 p-2 sm:inline-flex sm:w-auto">
              <TabsTrigger
                value="overview"
                className="rounded-lg px-5 py-2.5 text-sm font-medium data-[state=active]:shadow-sm"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="access"
                className="rounded-lg px-5 py-2.5 text-sm font-medium data-[state=active]:shadow-sm"
              >
                Access &amp; role
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="rounded-lg px-5 py-2.5 text-sm font-medium data-[state=active]:shadow-sm"
              >
                Security
              </TabsTrigger>
              <TabsTrigger
                value="danger"
                className="rounded-lg px-5 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground"
              >
                Danger zone
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0 px-5 py-8 sm:px-8">
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Identity &amp; timeline</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Contact details and account timestamps. Use <strong className="font-medium text-foreground">Edit details</strong> to
                  change email or phone.
                </p>
              </div>
              <Section label="Contact">
                <DL>
                  <DR
                    label="Email"
                    value={
                      user.email ? (
                        <button
                          type="button"
                          onClick={() => openMail(user.email!)}
                          className="inline-flex items-center gap-1.5 text-left font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          <MailIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                          {user.email}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )
                    }
                  />
                  <DR
                    label="Phone"
                    value={
                      user.phone ? (
                        <a
                          href={`tel:${user.phone.replace(/\s/g, '')}`}
                          className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          <PhoneIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                          {user.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )
                    }
                  />
                </DL>
              </Section>
              <Separator />
              <Section label="Timestamps">
                <DL>
                  <DR label="Created" value={fmtDateTime(user.created_at)} />
                  <DR label="Last updated" value={fmtDateTime(user.updated_at)} />
                  {user.deleted_at && (
                    <DR label="Deactivated at" value={fmtDateTime(user.deleted_at)} cls="text-muted-foreground" />
                  )}
                </DL>
              </Section>
            </div>
          </TabsContent>

          <TabsContent value="access" className="mt-0 px-5 py-8 sm:px-8">
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Access &amp; lifecycle</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use <strong className="font-medium text-foreground">Edit details</strong> in the header to change role and status.
                </p>
              </div>
              <Section label="Current settings">
                <DL>
                  <DR label="Role" value={<RolePill role={user.role} />} />
                  <DR label="Status" value={<StatusPill status={user.status} />} />
                </DL>
              </Section>
            </div>
          </TabsContent>

          <TabsContent value="security" className="mt-0 px-5 py-8 sm:px-8">
            <div className="space-y-8">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldIcon className="h-4 w-4" />
                  Authentication
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Set an optional password for console or app sign-in, and enroll an authenticator app using the QR code.
                </p>
              </div>

              <div className="space-y-4 rounded-xl border border-foreground/10 bg-muted/20 p-5">
                <p className="text-sm font-medium text-foreground">Password sign-in</p>
                <p className="text-xs text-muted-foreground">
                  Password set:{' '}
                  <span className="font-medium text-foreground">{user.password_set ? 'Yes' : 'No'}</span>
                </p>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">Allow password sign-in</p>
                    <p className="text-xs text-muted-foreground">When off, only OTP can be used (unless policy changes).</p>
                  </div>
                  <Switch
                    checked={draftPwdEnabled}
                    onCheckedChange={setDraftPwdEnabled}
                    disabled={isDeactivated}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sec-new-pw">New password</Label>
                  <Input
                    id="sec-new-pw"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    disabled={isDeactivated}
                    className="max-w-md"
                  />
                  <p className="text-xs text-muted-foreground">Minimum 8 characters when changing.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={savePasswordSettings} disabled={saving || isDeactivated}>
                    Save password settings
                  </Button>
                  {user.password_set && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={clearStoredPassword}
                      disabled={saving || isDeactivated}
                    >
                      Remove password
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-foreground/10 bg-muted/20 p-5">
                <p className="text-sm font-medium text-foreground">Authenticator app (TOTP)</p>
                <p className="text-xs text-muted-foreground">
                  Status:{' '}
                  <span className="font-medium text-foreground">{user.totp_enabled ? 'Enabled' : 'Not enabled'}</span>
                  {user.role === 'admin' ? ' — required for admin MFA when platform policy demands it.' : ''}
                </p>
                {!user.totp_enabled && !totpOtpauthUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={startTotpSetup}
                    disabled={totpBusy || isDeactivated}
                  >
                    {totpBusy ? 'Preparing…' : 'Show setup QR'}
                  </Button>
                )}
                {totpOtpauthUrl && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Scan this QR in Google Authenticator, Authy, or another TOTP app.
                    </p>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(totpOtpauthUrl)}`}
                        alt="Authenticator setup QR"
                        className="rounded-lg border border-border bg-white p-2"
                        width={220}
                        height={220}
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Label htmlFor="totp-confirm">6-digit code</Label>
                        <Input
                          id="totp-confirm"
                          inputMode="numeric"
                          maxLength={6}
                          value={totpCode}
                          onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          className="max-w-[200px] font-mono tracking-widest"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" onClick={confirmTotpSetup} disabled={totpBusy}>
                            {totpBusy ? 'Confirming…' : 'Confirm'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setTotpOtpauthUrl(null)
                              setTotpCode('')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="danger" className="mt-0 px-5 py-8 sm:px-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Deactivate or restore</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Deactivation soft-deletes the account, revokes refresh tokens, and blocks sign-in.
                </p>
              </div>
              {isDeactivated ? (
                <div className="space-y-4 rounded-xl border border-foreground/10 bg-muted/10 p-5">
                  <p className="text-sm text-muted-foreground">
                    This account is deactivated. Restoring re-enables sign-in (subject to status and role).
                  </p>
                  <Button variant="outline" onClick={restore} disabled={saving} className="gap-2 border-foreground">
                    <RotateCcwIcon className="h-4 w-4" />
                    Restore account
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 rounded-xl border border-foreground/10 bg-muted/10 p-5">
                  {isAdminAccount ? (
                    <p className="text-sm text-muted-foreground">
                      Admin accounts cannot be deactivated from the panel.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      You can restore a deactivated user later from this same screen.
                    </p>
                  )}
                  <Button
                    variant="outline"
                    onClick={deactivate}
                    disabled={saving || isAdminAccount}
                    className="gap-2 border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background"
                  >
                    <Trash2Icon className="h-4 w-4" />
                    Deactivate account
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  )
}


