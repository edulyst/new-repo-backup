import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiRequestError, apiGet, publicPost } from '@/lib/api'
import { clearTokens, getAccessToken, setTokens } from '@/lib/auth-storage'
import { getOrCreateDeviceId } from '@/lib/device-id'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRightIcon, KeyRoundIcon, MailIcon, ShieldCheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type UserInfo = { role: string }

type VerifyOtpData = {
  access_token?: string
  refresh_token?: string
  mfa_required?: boolean
  mfa_token?: string
  user: UserInfo
}

type Flow =
  | { mode: 'otp'; step: 'email' | 'otp' | 'mfa' }
  | { mode: 'password'; step: 'pwd' | 'mfa' }

type LoginUiConfig = {
  site_display_name: string
  login_left_image_url: string | null
  login_left_heading: string
  login_left_caption: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [totp, setTotp] = useState('')
  const [mfaToken, setMfaToken] = useState<string | null>(null)
  const [flow, setFlow] = useState<Flow>({ mode: 'otp', step: 'email' })
  const [busy, setBusy] = useState(false)
  const [loginUi, setLoginUi] = useState<LoginUiConfig>({
    site_display_name: 'i8now',
    login_left_image_url: null,
    login_left_heading: 'Operations command centre',
    login_left_caption: 'Manage workers, employers, timesheets, and platform settings from one place.',
  })

  useEffect(() => {
    apiGet<{ status: string; data: LoginUiConfig }>('/auth/login-ui')
      .then((r) => setLoginUi(r.data))
      .catch(() => null)
  }, [])

  if (getAccessToken()) return <Navigate to="/" replace />

  const stepMeta =
    flow.mode === 'otp'
      ? [
          { key: 'a', label: 'Email' },
          { key: 'b', label: 'Code' },
          { key: 'c', label: 'Authenticator' },
        ]
      : [
          { key: 'p1', label: 'Password' },
          { key: 'p2', label: 'Authenticator' },
        ]

  const currentStepIndex =
    flow.mode === 'otp'
      ? flow.step === 'email'
        ? 0
        : flow.step === 'otp'
          ? 1
          : 2
      : flow.step === 'pwd'
        ? 0
        : 1

  function setAuthMode(mode: 'otp' | 'password') {
    setOtp('')
    setTotp('')
    setMfaToken(null)
    setPassword('')
    setFlow(mode === 'otp' ? { mode: 'otp', step: 'email' } : { mode: 'password', step: 'pwd' })
  }

  async function sendOtp() {
    if (!email.trim()) {
      toast.error('Enter your admin email.')
      return
    }
    setBusy(true)
    try {
      await publicPost('/auth/request-otp', {
        email: email.trim().toLowerCase(),
        device_id: getOrCreateDeviceId(),
      })
      toast.success('Code sent — check your inbox.')
      setFlow({ mode: 'otp', step: 'otp' })
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not send code')
    } finally {
      setBusy(false)
    }
  }

  function finishLogin(access: string, refresh: string, role: string) {
    setTokens(access, refresh, role)
    toast.success('Welcome back!')
    navigate(role === 'employer' ? '/emp' : (from === '/emp' ? '/' : from), { replace: true })
  }

  async function verifyEmailOtp() {
    if (!/^\d{6}$/.test(otp)) {
      toast.error('Enter the 6-digit code.')
      return
    }
    setBusy(true)
    try {
      clearTokens()
      const raw = await publicPost('/auth/verify-otp', {
        email: email.trim().toLowerCase(),
        otp,
        device_id: getOrCreateDeviceId(),
      })
      const body = raw as { data: VerifyOtpData }
      const d = body.data
      if (d.user.role !== 'admin' && d.user.role !== 'employer') {
        toast.error('No access — admin or employer account required.')
        return
      }
      if (d.mfa_required === true && typeof d.mfa_token === 'string') {
        setMfaToken(d.mfa_token)
        setFlow({ mode: 'otp', step: 'mfa' })
        toast.message('Enter the code from your authenticator app.')
        return
      }
      if (typeof d.access_token === 'string' && typeof d.refresh_token === 'string') {
        finishLogin(d.access_token, d.refresh_token, d.user.role)
        return
      }
      toast.error('Unexpected response from server.')
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  async function submitPassword() {
    if (!email.trim()) {
      toast.error('Enter your email.')
      return
    }
    if (!password) {
      toast.error('Enter your password.')
      return
    }
    setBusy(true)
    try {
      clearTokens()
      const raw = await publicPost('/auth/login-password', {
        email: email.trim().toLowerCase(),
        password,
        device_id: getOrCreateDeviceId(),
      })
      const body = raw as { data: VerifyOtpData }
      const d = body.data
      if (d.user.role !== 'admin' && d.user.role !== 'employer') {
        toast.error('No access — admin or employer account required.')
        return
      }
      if (d.mfa_required === true && typeof d.mfa_token === 'string') {
        setMfaToken(d.mfa_token)
        setFlow({ mode: 'password', step: 'mfa' })
        toast.message('Enter the code from your authenticator app.')
        return
      }
      if (typeof d.access_token === 'string' && typeof d.refresh_token === 'string') {
        finishLogin(d.access_token, d.refresh_token, d.user.role)
        return
      }
      toast.error('Unexpected response from server.')
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  async function verifyAuthenticator() {
    if (!mfaToken) {
      toast.error('Session expired — start again.')
      setFlow(flow.mode === 'otp' ? { mode: 'otp', step: 'otp' } : { mode: 'password', step: 'pwd' })
      return
    }
    if (!/^\d{6}$/.test(totp)) {
      toast.error('Enter the 6-digit authenticator code.')
      return
    }
    setBusy(true)
    try {
      const raw = await publicPost('/auth/verify-admin-totp', { mfa_token: mfaToken, totp })
      const body = raw as { data: { access_token: string; refresh_token: string; user: { role: string } } }
      finishLogin(body.data.access_token, body.data.refresh_token, body.data.user?.role ?? 'admin')
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Authenticator check failed')
    } finally {
      setBusy(false)
    }
  }

  function handleKey(fn: () => void) {
    return (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') fn()
    }
  }

  const onIdentifierStep = flow.mode === 'otp' ? flow.step === 'email' : flow.step === 'pwd'
  const showMfaField =
    (flow.mode === 'otp' && flow.step === 'mfa') || (flow.mode === 'password' && flow.step === 'mfa')
  const showEmailField =
    !showMfaField &&
    (flow.mode === 'password' ? flow.step === 'pwd' : flow.step === 'email' || flow.step === 'otp')
  const showPasswordField = flow.mode === 'password' && flow.step === 'pwd'
  const showOtpField = flow.mode === 'otp' && flow.step === 'otp'

  const heading =
    flow.mode === 'password' && flow.step === 'pwd'
      ? 'Sign in with password'
      : flow.mode === 'otp' && flow.step === 'email'
        ? 'Sign in'
        : flow.mode === 'otp' && flow.step === 'otp'
          ? 'Check your email'
          : 'Two-factor auth'

  const sub =
    flow.mode === 'password' && flow.step === 'pwd'
      ? 'Use the password set for this admin account (enable password sign-in in Users if needed).'
      : flow.mode === 'otp' && flow.step === 'email'
        ? 'Choose email code or password, then continue.'
        : flow.mode === 'otp' && flow.step === 'otp'
          ? <>We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.</>
          : 'Open your authenticator app and enter the 6-digit code.'

  return (
    <div className="flex h-svh w-full overflow-hidden">
      <div
        className="relative hidden flex-col justify-between bg-zinc-950 p-10 text-white lg:flex lg:w-[42%] xl:w-[38%]"
        style={
          loginUi.login_left_image_url
            ? {
                backgroundImage: `linear-gradient(rgba(9,9,11,0.72), rgba(9,9,11,0.72)), url(${loginUi.login_left_image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
          <svg className="absolute inset-0 h-full w-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950 shadow-lg">
            <span className="text-sm font-bold tracking-tight">i8</span>
          </div>
          <div>
            <div className="text-sm font-semibold">{loginUi.site_display_name || 'i8now'}</div>
            <div className="text-xs text-zinc-400">Admin Console</div>
          </div>
        </div>

        <div className="relative space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
              {loginUi.login_left_heading || 'Operations command centre'}
            </h1>
            <p className="text-sm leading-relaxed text-zinc-400">
              {loginUi.login_left_caption || 'Manage workers, employers, timesheets, and platform settings from one place.'}
            </p>
          </div>
          <div className="space-y-3">
            {[
              { icon: ShieldCheckIcon, label: 'Email OTP, password, or optional TOTP 2FA' },
              { icon: KeyRoundIcon, label: 'Role-based access control' },
              { icon: MailIcon, label: 'Real-time platform management' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <Icon className="h-4 w-4 text-zinc-300" />
                </div>
                <span className="text-sm text-zinc-300">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-zinc-600">
          i8now platform · {new Date().getFullYear()}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-background p-6 sm:p-10">
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground">
            <span className="text-sm font-bold text-background">i8</span>
          </div>
          <span className="text-lg font-semibold">{(loginUi.site_display_name || 'i8now')} Admin</span>
        </div>

        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              {stepMeta.map((s, i) => (
                <div key={s.key} className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200',
                      i < currentStepIndex
                        ? 'bg-foreground text-background'
                        : i === currentStepIndex
                          ? 'bg-foreground text-background ring-4 ring-foreground/15'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {i < currentStepIndex ? '✓' : i + 1}
                  </div>
                  {i < stepMeta.length - 1 && (
                    <div
                      className={cn(
                        'h-px w-8 transition-all duration-300',
                        i < currentStepIndex ? 'bg-foreground' : 'bg-border',
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Step {currentStepIndex + 1} of {stepMeta.length} · {stepMeta[currentStepIndex]?.label}
            </p>
          </div>

          {onIdentifierStep && (
            <div className="flex rounded-xl border border-border bg-muted/30 p-1">
              <button
                type="button"
                className={cn(
                  'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
                  flow.mode === 'otp' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setAuthMode('otp')}
              >
                Email code
              </button>
              <button
                type="button"
                className={cn(
                  'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
                  flow.mode === 'password' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setAuthMode('password')}
              >
                Password
              </button>
            </div>
          )}

          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">{heading}</h2>
            <p className="text-sm text-muted-foreground">{sub}</p>
          </div>

          <div className="space-y-5">
            {showEmailField && (
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKey(flow.mode === 'otp' ? sendOtp : submitPassword)}
                  disabled={busy}
                  readOnly={flow.mode === 'otp' && flow.step === 'otp'}
                  placeholder="admin@company.com"
                  className="h-11"
                />
              </div>
            )}

            {showPasswordField && (
              <div className="space-y-2">
                <Label htmlFor="pw">Password</Label>
                <Input
                  id="pw"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKey(submitPassword)}
                  disabled={busy}
                  className="h-11"
                />
              </div>
            )}

            {showOtpField && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="otp">Email code</Label>
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={busy}
                    className="text-xs text-foreground underline-offset-4 hover:underline disabled:opacity-50"
                  >
                    Resend
                  </button>
                </div>
                <Input
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={handleKey(verifyEmailOtp)}
                  placeholder="000000"
                  className="h-11 text-center text-lg font-mono tracking-[0.5em]"
                  autoFocus
                />
              </div>
            )}

            {showMfaField && (
              <div className="space-y-2">
                <Label htmlFor="totp">Authenticator code</Label>
                <Input
                  id="totp"
                  inputMode="numeric"
                  maxLength={6}
                  value={totp}
                  onChange={(e) => setTotp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={handleKey(verifyAuthenticator)}
                  placeholder="000000"
                  className="h-11 text-center text-lg font-mono tracking-[0.5em]"
                  autoFocus
                />
              </div>
            )}

            <div className="space-y-2.5">
              {flow.mode === 'otp' && flow.step === 'email' && (
                <Button className="h-11 w-full gap-2" onClick={sendOtp} disabled={busy}>
                  {busy ? 'Sending…' : (
                    <>
                      Send code <ArrowRightIcon className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
              {flow.mode === 'otp' && flow.step === 'otp' && (
                <>
                  <Button className="h-11 w-full gap-2" onClick={verifyEmailOtp} disabled={busy}>
                    {busy ? 'Verifying…' : (
                      <>
                        Continue <ArrowRightIcon className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-10 w-full"
                    onClick={() => {
                      setFlow({ mode: 'otp', step: 'email' })
                      setOtp('')
                    }}
                    disabled={busy}
                  >
                    ← Use a different email
                  </Button>
                </>
              )}
              {flow.mode === 'password' && flow.step === 'pwd' && (
                <>
                  <Button className="h-11 w-full gap-2" onClick={submitPassword} disabled={busy}>
                    {busy ? 'Signing in…' : (
                      <>
                        Sign in <ArrowRightIcon className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-10 w-full"
                    onClick={() => setAuthMode('otp')}
                    disabled={busy}
                  >
                    ← Use email code instead
                  </Button>
                </>
              )}
              {showMfaField && (
                <>
                  <Button className="h-11 w-full gap-2" onClick={verifyAuthenticator} disabled={busy}>
                    {busy ? 'Signing in…' : (
                      <>
                        Sign in <ArrowRightIcon className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-10 w-full"
                    onClick={() => {
                      setMfaToken(null)
                      setTotp('')
                      if (flow.mode === 'otp') setFlow({ mode: 'otp', step: 'otp' })
                      else setFlow({ mode: 'password', step: 'pwd' })
                    }}
                    disabled={busy}
                  >
                    ← Back
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
