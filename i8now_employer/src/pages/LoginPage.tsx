import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { setToken } from '@/lib/api'
import { Building2, Loader2, Mail, Phone, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEVICE_ID = (() => {
  const key = 'emp_device_id'
  let id = localStorage.getItem(key)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id) }
  return id
})()

type Mode = 'email' | 'phone'

export function LoginPage() {
  const navigate           = useNavigate()
  const [step, setStep]    = useState<'input' | 'otp'>('input')
  const [mode, setMode]    = useState<Mode>('email')
  const [value, setValue]  = useState('')
  const [otp, setOtp]      = useState('')
  const [loading, setLoading] = useState(false)

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) { toast.error('Please enter your email or phone'); return }
    setLoading(true)
    try {
      const body = mode === 'email'
        ? { email: value.trim().toLowerCase(), device_id: DEVICE_ID }
        : { phone: value.trim(), device_id: DEVICE_ID }

      const res = await fetch('/api/v1/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.status === 'error') throw new Error(json.message)
      toast.success(mode === 'email' ? 'Check your inbox for the OTP' : 'OTP sent to your phone')
      setStep('otp')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) { toast.error('Enter the 6-digit code'); return }
    setLoading(true)
    try {
      const body = mode === 'email'
        ? { email: value.trim().toLowerCase(), otp, device_id: DEVICE_ID }
        : { phone: value.trim(), otp, device_id: DEVICE_ID }

      const res = await fetch('/api/v1/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.status === 'error') throw new Error(json.message)
      const accessToken = json.data?.access_token
      if (!accessToken) throw new Error('Authentication failed — no token received')
      if (json.data?.user?.role !== 'employer') throw new Error('This portal is for employer accounts only')
      setToken(accessToken)
      navigate('/')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Left panel */}
      <div className="hidden w-[420px] shrink-0 flex-col justify-between bg-zinc-900 p-10 lg:flex">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">i8now Employer</span>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold leading-snug text-white">
            Hire smarter.<br />Manage better.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Post shifts, manage your workforce, track tasks, and pay workers — all from one place.
          </p>
          <div className="mt-8 space-y-3">
            {[
              'Post and fill shifts instantly',
              'Browse & shortlist verified candidates',
              'Assign tasks and track progress',
              'Pay workers directly from your wallet',
            ].map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                <span className="text-xs text-zinc-400">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-zinc-600">© {new Date().getFullYear()} i8now. All rights reserved.</p>
      </div>

      {/* Right: form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Logo (mobile) */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-zinc-900">i8now Employer</span>
          </div>

          {step === 'input' ? (
            <>
              <div className="mb-7">
                <h1 className="text-xl font-semibold text-zinc-900">Sign in</h1>
                <p className="mt-1 text-sm text-zinc-500">Enter your email or phone to receive a one-time code.</p>
              </div>

              {/* Mode toggle */}
              <div className="mb-5 flex gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                <button type="button" onClick={() => { setMode('email'); setValue('') }}
                  className={cn('flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors',
                    mode === 'email' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700')}>
                  <Mail className="h-3.5 w-3.5" /> Email
                </button>
                <button type="button" onClick={() => { setMode('phone'); setValue('') }}
                  className={cn('flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors',
                    mode === 'phone' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700')}>
                  <Phone className="h-3.5 w-3.5" /> Phone
                </button>
              </div>

              <form onSubmit={requestOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">
                    {mode === 'email' ? 'Email address' : 'Phone number'}
                  </label>
                  <input
                    type={mode === 'email' ? 'email' : 'tel'}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={mode === 'email' ? 'you@company.com' : '+91 98765 43210'}
                    required
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-50">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Sending…' : 'Send OTP'}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-zinc-400">
                Don't have an account? Contact your i8now admin to get set up.
              </p>
            </>
          ) : (
            <>
              <div className="mb-7">
                <button onClick={() => { setStep('input'); setOtp('') }}
                  className="mb-4 flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <h1 className="text-xl font-semibold text-zinc-900">Enter your code</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  We sent a 6-digit code to <span className="font-medium text-zinc-700">{value}</span>
                </p>
              </div>

              <form onSubmit={verifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">One-time code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    required
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center text-xl font-mono tracking-[0.6em] outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                  />
                </div>
                <button type="submit" disabled={loading || otp.length < 6}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-50">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Verifying…' : 'Sign in'}
                </button>
              </form>

              <p className="mt-4 text-center text-xs text-zinc-400">
                Didn't receive it?{' '}
                <button onClick={() => setStep('input')} className="font-medium text-zinc-700 hover:underline">
                  Resend
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
