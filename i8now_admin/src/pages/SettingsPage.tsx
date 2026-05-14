import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiRequestError, apiGet, apiPatch, apiPost } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAdminSettings } from '@/hooks/use-admin-settings'
import {
  ACCENT_PRESETS,
  DEFAULT_NAV_ITEMS,
  FONT_FAMILIES,
  FONT_FAMILY_LABELS,
  FONT_SIZE_LABELS,
  FONT_SIZE_VALUES,
  LETTER_SPACING_VALUES,
  RADIUS_LABELS,
  RADIUS_VALUES,
  type AccentPreset,
  type AdminSettings,
  type FontFamily,
  type FontSize,
  type LetterSpacing,
  type NavItemConfig,
  type NavItemId,
  type RadiusPreset,
  type ThemeMode,
} from '@/lib/admin-settings'
import {
  BriefcaseBusinessIcon,
  Building2Icon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardListIcon,
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
  ImageIcon,
  LayoutDashboardIcon,
  MailIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  PhoneIcon,
  QrCodeIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SmartphoneIcon,
  SunIcon,
  TextCursorInputIcon,
  Trash2Icon,
  TypeIcon,
  UploadCloudIcon,
  UserCircleIcon,
  UsersIcon,
  UserRoundIcon,
  XCircleIcon,
} from 'lucide-react'

// ─── Backend types ────────────────────────────────────────────────────────────

type MeUser = {
  id: string
  email: string | null
  phone: string | null
  role: string
  status: string
  totp_enabled: boolean
}

type PlatformSettings = {
  login_email_enabled: boolean
  login_phone_enabled: boolean
  admin_totp_required: boolean
  site_display_name: string
  updated_at: string | null
}

// ─── Nav item metadata ────────────────────────────────────────────────────────

const NAV_META: Record<NavItemId, { label: string; icon: React.ElementType; path: string }> = {
  overview: { label: 'Overview', icon: LayoutDashboardIcon, path: '/' },
  users: { label: 'Users', icon: UsersIcon, path: '/users' },
  workers: { label: 'Workers', icon: UserRoundIcon, path: '/workers' },
  employers: { label: 'Employers', icon: Building2Icon, path: '/employers' },
  shifts: { label: 'Shifts', icon: BriefcaseBusinessIcon, path: '/shifts' },
  timesheets: { label: 'Timesheets', icon: CalendarClockIcon, path: '/timesheets' },
  applications: { label: 'Applications', icon: ClipboardListIcon, path: '/applications' },
}

// ─── Section definitions ──────────────────────────────────────────────────────

type Section = {
  id: string
  label: string
  icon: React.ElementType
}

const SECTIONS: Section[] = [
  { id: 'branding', label: 'Branding', icon: ImageIcon },
  { id: 'appearance', label: 'Appearance', icon: PaletteIcon },
  { id: 'typography', label: 'Typography', icon: TypeIcon },
  { id: 'navigation', label: 'Navigation', icon: Settings2Icon },
  { id: 'platform', label: 'Platform', icon: MonitorIcon },
  { id: 'security', label: 'Security', icon: ShieldCheckIcon },
  { id: 'account', label: 'Account', icon: UserCircleIcon },
]

// ─── Main ────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState('branding')
  const { settings, update } = useAdminSettings()

  // Backend state
  const [meUser, setMeUser] = useState<MeUser | null>(null)
  const [platform, setPlatform] = useState<PlatformSettings | null>(null)
  const [platformLoading, setPlatformLoading] = useState(true)
  const [platformSaving, setPlatformSaving] = useState(false)
  const [siteNameDraft, setSiteNameDraft] = useState('')
  const [totpSetup, setTotpSetup] = useState<{ otpauth_url: string; secret_base32: string } | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpBusy, setTotpBusy] = useState(false)

  const reloadMe = useCallback(async () => {
    const r = await apiGet<{ status: string; data: { user: MeUser } }>('/admin/me')
    setMeUser(r.data.user)
  }, [])

  useEffect(() => {
    reloadMe().catch(() => null)

    apiGet<{ status: string; data: PlatformSettings }>('/admin/platform-settings')
      .then((r) => {
        setPlatform(r.data)
        setSiteNameDraft(r.data.site_display_name)
      })
      .catch(() => toast.error('Could not load platform settings.'))
      .finally(() => setPlatformLoading(false))
  }, [reloadMe])

  async function patchPlatform(patch: Partial<PlatformSettings>) {
    if (!platform) return false
    const prev = platform
    setPlatform((p) => (p ? { ...p, ...patch } : p))
    setPlatformSaving(true)
    try {
      const raw = (await apiPatch('/admin/platform-settings', patch)) as {
        data: PlatformSettings
      }
      setPlatform(raw.data)
      setSiteNameDraft(raw.data.site_display_name)
      return true
    } catch (e) {
      setPlatform(prev)
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not save')
      return false
    } finally {
      setPlatformSaving(false)
    }
  }

  async function startTotpSetup() {
    setTotpBusy(true)
    try {
      const raw = (await apiPost('/admin/me/totp/setup', {})) as {
        data: { otpauth_url: string; secret_base32: string }
      }
      setTotpSetup(raw.data)
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Setup failed')
    } finally {
      setTotpBusy(false)
    }
  }

  async function confirmTotpSetup() {
    if (!/^\d{6}$/.test(totpCode)) {
      toast.error('Enter the 6-digit code from your app.')
      return
    }
    setTotpBusy(true)
    try {
      await apiPost('/admin/me/totp/confirm', { code: totpCode })
      setMeUser((u) => (u ? { ...u, totp_enabled: true } : u))
      setTotpSetup(null)
      setTotpCode('')
      toast.success('Two-factor authentication is now active.')
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not confirm')
    } finally {
      setTotpBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Left sidebar nav ── */}
      <aside className="hidden w-56 shrink-0 border-r bg-zinc-50/60 lg:block">
        <div className="sticky top-0 p-4">
          <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            Settings
          </p>
          <nav className="space-y-0.5">
            {SECTIONS.map((s) => {
              const Icon = s.icon
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                    activeSection === s.id
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {s.label}
                </button>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* ── Mobile top nav ── */}
      <div className="lg:hidden w-full border-b bg-zinc-50/60">
        <div className="flex gap-1 overflow-x-auto px-4 py-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  activeSection === s.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-zinc-500 hover:bg-zinc-100',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="w-full px-6 py-8 space-y-8 xl:px-10">

          {/* ── BRANDING ── */}
          {activeSection === 'branding' && (
            <BrandingSection settings={settings} update={update} />
          )}

          {/* ── APPEARANCE ── */}
          {activeSection === 'appearance' && (
            <AppearanceSection settings={settings} update={update} />
          )}

          {/* ── TYPOGRAPHY ── */}
          {activeSection === 'typography' && (
            <TypographySection settings={settings} update={update} />
          )}

          {/* ── NAVIGATION ── */}
          {activeSection === 'navigation' && (
            <NavigationSection settings={settings} update={update} />
          )}

          {/* ── PLATFORM ── */}
          {activeSection === 'platform' && (
            <PlatformSection
              platform={platform}
              loading={platformLoading}
              saving={platformSaving}
              siteNameDraft={siteNameDraft}
              setSiteNameDraft={setSiteNameDraft}
              patchPlatform={patchPlatform}
            />
          )}

          {/* ── SECURITY ── */}
          {activeSection === 'security' && (
            <SecuritySection
              meUser={meUser}
              totpSetup={totpSetup}
              totpCode={totpCode}
              setTotpCode={setTotpCode}
              totpBusy={totpBusy}
              startTotpSetup={startTotpSetup}
              confirmTotpSetup={confirmTotpSetup}
              cancelTotpSetup={() => setTotpSetup(null)}
            />
          )}

          {/* ── ACCOUNT ── */}
          {activeSection === 'account' && <AccountSection meUser={meUser} onRefreshMe={reloadMe} />}
        </div>
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI primitives
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b pb-5">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Branding
// ─────────────────────────────────────────────────────────────────────────────

function BrandingSection({
  settings,
  update,
}: {
  settings: AdminSettings
  update: (p: Partial<AdminSettings>) => Promise<boolean>
}) {
  const [nameDraft, setNameDraft] = useState(settings.site_name)
  const [subtitleDraft, setSubtitleDraft] = useState(settings.site_subtitle)
  const [loginHeadingDraft, setLoginHeadingDraft] = useState(settings.login_left_heading)
  const [loginCaptionDraft, setLoginCaptionDraft] = useState(settings.login_left_caption)

  useEffect(() => {
    setNameDraft(settings.site_name)
  }, [settings.site_name])

  useEffect(() => {
    setSubtitleDraft(settings.site_subtitle)
  }, [settings.site_subtitle])

  useEffect(() => {
    setLoginHeadingDraft(settings.login_left_heading)
  }, [settings.login_left_heading])

  useEffect(() => {
    setLoginCaptionDraft(settings.login_left_caption)
  }, [settings.login_left_caption])

  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const loginImageInputRef = useRef<HTMLInputElement | null>(null)

  function handleLogoUpload(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      const ok = await update({ logo_data_url: dataUrl })
      if (ok) toast.success('Logo updated.')
      else toast.error('Could not save logo. Please try again.')
    }
    reader.readAsDataURL(file)
  }

  function handleLoginImageUpload(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Login image must be under 4 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      const ok = await update({ login_left_image_url: dataUrl })
      if (ok) toast.success('Login page image updated.')
      else toast.error('Could not save login image. Please try again.')
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Branding"
        description="Customize the admin panel's identity — name, subtitle, and logo."
      />

      {/* Logo */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-700">Panel Logo</h3>
        <div className="flex items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50">
            {settings.logo_data_url ? (
              <img
                src={settings.logo_data_url}
                alt="Logo"
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background shadow-sm">
                <span className="text-xs font-bold">i8</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={logoInputRef}
              type="file"
              className="hidden"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={(e) => handleLogoUpload(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => logoInputRef.current?.click()}
            >
              <UploadCloudIcon className="h-4 w-4" />
              Upload logo
            </Button>
            {settings.logo_data_url && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={async () => {
                  const ok = await update({ logo_data_url: null })
                  if (ok) toast.success('Logo removed.')
                  else toast.error('Could not remove logo.')
                }}
              >
                <Trash2Icon className="h-3.5 w-3.5" />
                Remove
              </Button>
            )}
            <p className="text-xs text-muted-foreground">PNG, SVG, JPEG or WebP. Max 2 MB.</p>
          </div>
        </div>
      </div>

      {/* Panel name */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-700">Panel Identity</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup label="Panel name" hint="Shown in the sidebar header.">
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="i8now Admin"
              className="h-11"
            />
          </FieldGroup>
          <FieldGroup label="Subtitle" hint="Shown below the name in the sidebar.">
            <Input
              value={subtitleDraft}
              onChange={(e) => setSubtitleDraft(e.target.value)}
              placeholder="Operations"
              className="h-11"
            />
          </FieldGroup>
        </div>
        <Button
          type="button"
          disabled={nameDraft.trim() === settings.site_name && subtitleDraft.trim() === settings.site_subtitle}
          onClick={async () => {
            if (!nameDraft.trim()) { toast.error('Enter a panel name.'); return }
            const ok = await update({ site_name: nameDraft.trim(), site_subtitle: subtitleDraft.trim() })
            if (ok) toast.success('Branding saved.')
            else toast.error('Could not save branding.')
          }}
        >
          Save branding
        </Button>
      </div>

      <div className="space-y-4 rounded-xl border bg-white p-5">
        <h3 className="text-sm font-semibold text-zinc-700">Login Left Panel</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>Left panel image</Label>
            <div className="flex items-center gap-3">
              <input
                ref={loginImageInputRef}
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => handleLoginImageUpload(e.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => loginImageInputRef.current?.click()}>
                <UploadCloudIcon className="h-4 w-4" />
                Upload image
              </Button>
              {settings.login_left_image_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={async () => {
                    const ok = await update({ login_left_image_url: null })
                    if (!ok) toast.error('Could not remove login image.')
                  }}
                >
                  <Trash2Icon className="h-3.5 w-3.5" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">JPG/PNG/WebP. Max 4 MB.</p>
          </div>
          <div className="space-y-2">
            <FieldGroup label="Login heading">
              <Input value={loginHeadingDraft} onChange={(e) => setLoginHeadingDraft(e.target.value)} className="h-11" />
            </FieldGroup>
            <FieldGroup label="Login caption">
              <Input value={loginCaptionDraft} onChange={(e) => setLoginCaptionDraft(e.target.value)} className="h-11" />
            </FieldGroup>
            <Button
              type="button"
              onClick={async () => {
                if (!loginHeadingDraft.trim() || !loginCaptionDraft.trim()) {
                  toast.error('Heading and caption are required.')
                  return
                }
                const ok = await update({
                  login_left_heading: loginHeadingDraft.trim(),
                  login_left_caption: loginCaptionDraft.trim(),
                })
                if (ok) toast.success('Login panel text saved.')
                else toast.error('Could not save login panel text.')
              }}
            >
              Save login panel text
            </Button>
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Live preview</p>
        <div className="inline-flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-foreground text-background shadow-sm">
            {settings.logo_data_url ? (
              <img src={settings.logo_data_url} alt="" className="h-full w-full object-contain p-0.5" />
            ) : (
              <span className="text-xs font-bold">i8</span>
            )}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">{nameDraft || 'i8now Admin'}</div>
            <div className="text-xs text-muted-foreground">{subtitleDraft || 'Operations'}</div>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border bg-zinc-950 text-white">
          <div
            className="relative min-h-36 p-5"
            style={
              settings.login_left_image_url
                ? {
                    backgroundImage: `linear-gradient(rgba(10,10,10,0.72), rgba(10,10,10,0.72)), url(${settings.login_left_image_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          >
            <p className="text-lg font-semibold">{loginHeadingDraft || 'Operations command centre'}</p>
            <p className="mt-1 text-sm text-zinc-300">
              {loginCaptionDraft || 'Manage workers, employers, timesheets, and platform settings from one place.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Appearance
// ─────────────────────────────────────────────────────────────────────────────

function AppearanceSection({
  settings,
  update,
}: {
  settings: AdminSettings
  update: (p: Partial<AdminSettings>) => Promise<boolean>
}) {
  return (
    <div className="space-y-8">
      <SectionHeader
        title="Appearance"
        description="Control the color theme, accent palette, and corner radius of the admin panel."
      />

      {/* Theme mode */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-700">Theme Mode</h3>
        <div className="flex gap-2">
          {(
            [
              { id: 'light', label: 'Light', icon: SunIcon },
              { id: 'dark', label: 'Dark', icon: MoonIcon },
              { id: 'system', label: 'System', icon: MonitorIcon },
            ] as { id: ThemeMode; label: string; icon: React.ElementType }[]
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => update({ theme: id })}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all',
                settings.theme === id
                  ? 'border-primary bg-primary text-primary-foreground shadow'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Accent colors */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-700">Accent Color</h3>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {(Object.entries(ACCENT_PRESETS) as [AccentPreset, (typeof ACCENT_PRESETS)[AccentPreset]][]).map(
            ([id, preset]) => (
              <button
                key={id}
                type="button"
                title={preset.label}
                onClick={() => update({ accent: id })}
                className={cn(
                  'group flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-all',
                  settings.accent === id
                    ? 'border-primary shadow-md shadow-primary/20 scale-105'
                    : 'border-transparent hover:border-zinc-200',
                )}
              >
                <div
                  className="h-8 w-8 rounded-full shadow-sm ring-1 ring-black/10"
                  style={{ background: preset.swatch }}
                />
                <span className="text-[10px] text-zinc-500">{preset.label}</span>
              </button>
            ),
          )}
        </div>
      </div>

      {/* Border radius */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-700">Border Radius</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(RADIUS_VALUES) as RadiusPreset[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => update({ radius: id })}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all',
                settings.radius === id
                  ? 'border-primary bg-primary/5'
                  : 'border-zinc-200 hover:border-zinc-300',
              )}
            >
              <div
                className="h-8 w-8 border-2 border-zinc-400 bg-zinc-100"
                style={{ borderRadius: RADIUS_VALUES[id] }}
              />
              <span className={cn('text-xs font-medium', settings.radius === id ? 'text-primary' : 'text-zinc-500')}>
                {RADIUS_LABELS[id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Live preview</p>
        <div className="flex flex-wrap gap-3 rounded-xl border bg-zinc-50 p-4">
          <button
            className="rounded px-4 py-2 text-sm font-medium text-white transition"
            style={{ background: ACCENT_PRESETS[settings.accent].swatch, borderRadius: RADIUS_VALUES[settings.radius] }}
          >
            Primary button
          </button>
          <button
            className="rounded border-2 px-4 py-2 text-sm font-medium transition"
            style={{ borderColor: ACCENT_PRESETS[settings.accent].swatch, borderRadius: RADIUS_VALUES[settings.radius], color: ACCENT_PRESETS[settings.accent].swatch }}
          >
            Outline
          </button>
          <span
            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-white"
            style={{ background: ACCENT_PRESETS[settings.accent].swatch, borderRadius: RADIUS_VALUES[settings.radius] }}
          >
            Badge
          </span>
          <div
            className="w-12 h-8 border-2 border-dashed border-zinc-300 bg-white"
            style={{ borderRadius: RADIUS_VALUES[settings.radius] }}
          />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Typography
// ─────────────────────────────────────────────────────────────────────────────

function TypographySection({
  settings,
  update,
}: {
  settings: AdminSettings
  update: (p: Partial<AdminSettings>) => Promise<boolean>
}) {
  return (
    <div className="space-y-8">
      <SectionHeader
        title="Typography"
        description="Change the font family, base font size, and letter spacing used throughout the panel."
      />

      {/* Font family */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-700">Font Family</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(FONT_FAMILIES) as FontFamily[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => update({ font_family: id })}
              className={cn(
                'flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all',
                settings.font_family === id
                  ? 'border-primary bg-primary/5'
                  : 'border-zinc-200 bg-white hover:border-zinc-300',
              )}
            >
              <div>
                <div
                  className={cn('text-sm font-semibold', settings.font_family === id ? 'text-primary' : 'text-zinc-800')}
                  style={{ fontFamily: FONT_FAMILIES[id] }}
                >
                  {FONT_FAMILY_LABELS[id]}
                </div>
                <div
                  className="text-xs text-zinc-400"
                  style={{ fontFamily: FONT_FAMILIES[id] }}
                >
                  The quick brown fox jumps
                </div>
              </div>
              {settings.font_family === id && (
                <CheckCircle2Icon className="h-4 w-4 shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Base font size */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-700">Base Font Size</h3>
        <div className="flex gap-2">
          {(Object.keys(FONT_SIZE_VALUES) as FontSize[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => update({ font_size: id })}
              className={cn(
                'flex-1 rounded-xl border-2 py-3 text-center transition-all',
                settings.font_size === id
                  ? 'border-primary bg-primary/5 text-primary font-semibold'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300',
              )}
            >
              <div style={{ fontSize: FONT_SIZE_VALUES[id] }}>Aa</div>
              <div className="mt-1 text-xs text-zinc-400">{FONT_SIZE_LABELS[id]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Letter spacing */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-700">Letter Spacing</h3>
        <div className="flex gap-2">
          {(
            [
              { id: 'tight', label: 'Tight' },
              { id: 'normal', label: 'Normal' },
              { id: 'wide', label: 'Wide' },
            ] as { id: LetterSpacing; label: string }[]
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => update({ letter_spacing: id })}
              className={cn(
                'flex-1 rounded-xl border-2 px-4 py-3 transition-all',
                settings.letter_spacing === id
                  ? 'border-primary bg-primary/5 text-primary font-semibold'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300',
              )}
            >
              <div
                className="text-sm"
                style={{ letterSpacing: LETTER_SPACING_VALUES[id] }}
              >
                {label}
              </div>
              <div className="mt-0.5 text-xs text-zinc-400" style={{ letterSpacing: LETTER_SPACING_VALUES[id] }}>
                Sample text
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Typography preview */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Live preview</p>
        <div
          className="space-y-3 rounded-xl border bg-white p-6"
          style={{
            fontFamily: FONT_FAMILIES[settings.font_family],
            fontSize: FONT_SIZE_VALUES[settings.font_size],
            letterSpacing: LETTER_SPACING_VALUES[settings.letter_spacing],
          }}
        >
          <div className="text-2xl font-bold text-zinc-900">Dashboard Heading</div>
          <div className="text-base font-semibold text-zinc-800">Section Title</div>
          <p className="text-sm leading-relaxed text-zinc-500">
            This is body text. The quick brown fox jumps over the lazy dog. All typography settings
            apply platform-wide including font family, size, and letter spacing.
          </p>
          <div className="flex gap-3 text-xs text-zinc-400">
            <span>Caption text</span>
            <span className="font-mono">ID: usr_a1b2c3</span>
          </div>
        </div>
      </div>

      {/* Reset */}
      <div className="pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            update({ font_family: 'geist', font_size: 'md', letter_spacing: 'normal' })
            toast.success('Typography reset to defaults.')
          }}
        >
          Reset to defaults
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────────────────────

function NavigationSection({
  settings,
  update,
}: {
  settings: AdminSettings
  update: (p: Partial<AdminSettings>) => Promise<boolean>
}) {
  const [items, setItems] = useState<NavItemConfig[]>(() => {
    // Ensure all default items exist
    const stored = settings.nav_items
    const storedIds = new Set(stored.map((n) => n.id))
    const extras = DEFAULT_NAV_ITEMS.filter((n) => !storedIds.has(n.id))
    return [...stored, ...extras]
  })

  function moveItem(idx: number, dir: -1 | 1) {
    const next = [...items]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setItems(next)
  }

  function toggleVisible(id: NavItemId) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, visible: !n.visible } : n)))
  }

  function saveNavigation() {
    update({ nav_items: items })
    toast.success('Navigation order saved.')
  }

  function resetNavigation() {
    const reset = [...DEFAULT_NAV_ITEMS]
    setItems(reset)
    update({ nav_items: reset })
    toast.success('Navigation reset to defaults.')
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Navigation"
        description="Reorder sidebar menu items and show or hide them. Changes apply immediately after saving."
      />

      <div className="space-y-1 rounded-xl border bg-white overflow-hidden">
        {items.map((item, idx) => {
          const meta = NAV_META[item.id]
          const Icon = meta.icon
          return (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-3 border-b last:border-0 px-4 py-3 transition-colors',
                !item.visible && 'opacity-50',
              )}
            >
              <GripVerticalIcon className="h-4 w-4 text-zinc-300 shrink-0 cursor-grab" />
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg border bg-zinc-50')}>
                <Icon className="h-4 w-4 text-zinc-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-800">{meta.label}</div>
                <div className="text-xs text-zinc-400">{meta.path}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveItem(idx, -1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                >
                  <ChevronUpIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={idx === items.length - 1}
                  onClick={() => moveItem(idx, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleVisible(item.id)}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100',
                    item.visible ? 'text-zinc-500 hover:text-zinc-800' : 'text-zinc-300 hover:text-zinc-500',
                  )}
                  title={item.visible ? 'Hide item' : 'Show item'}
                >
                  {item.visible ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-3">
        <Button type="button" onClick={saveNavigation}>
          Save navigation
        </Button>
        <Button type="button" variant="outline" onClick={resetNavigation}>
          Reset to defaults
        </Button>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        <span className="font-medium">Tip:</span> Hidden items are removed from the sidebar but the
        pages remain accessible via direct URL.
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform
// ─────────────────────────────────────────────────────────────────────────────

function PlatformSection({
  platform,
  loading,
  saving,
  siteNameDraft,
  setSiteNameDraft,
  patchPlatform,
}: {
  platform: PlatformSettings | null
  loading: boolean
  saving: boolean
  siteNameDraft: string
  setSiteNameDraft: (v: string) => void
  patchPlatform: (p: Partial<PlatformSettings>) => Promise<boolean>
}) {
  return (
    <div className="space-y-8">
      <SectionHeader
        title="Platform"
        description="Backend-stored settings enforced by the API — login channels, TOTP enforcement, and site identity."
      />

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      )}

      {!loading && platform && (
        <div className="space-y-6">
          {/* Site display name */}
          <div className="rounded-xl border bg-white p-5 space-y-4">
            <div>
              <div className="text-sm font-semibold">Site display name</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Used in the API and optionally by client apps.
              </div>
            </div>
            <div className="flex gap-3">
              <Input
                value={siteNameDraft}
                onChange={(e) => setSiteNameDraft(e.target.value)}
                placeholder="i8now"
                className="h-11 max-w-sm"
              />
              <Button
                type="button"
                disabled={saving || siteNameDraft.trim() === platform.site_display_name}
                onClick={async () => {
                  if (!siteNameDraft.trim()) { toast.error('Enter a site name.'); return }
                  const ok = await patchPlatform({ site_display_name: siteNameDraft.trim() })
                  if (ok) toast.success('Site name saved.')
                }}
              >
                Save
              </Button>
            </div>
          </div>

          {/* Login channels */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-zinc-700">Sign-in Channels</div>
            <p className="text-xs text-muted-foreground">
              Disable a channel to block <code className="rounded bg-muted px-1">/auth/request-otp</code> for that
              identifier. At least one must stay on.
            </p>
            <div className="space-y-2 pt-1">
              <ToggleRow
                icon={MailIcon}
                title="Email OTP"
                description="Users can sign in with a 6-digit code sent to their email."
                checked={platform.login_email_enabled}
                disabled={saving}
                onChange={(on) => {
                  if (!on && !platform.login_phone_enabled) {
                    toast.error('Keep phone OTP on if you disable email.')
                    return
                  }
                  void patchPlatform({ login_email_enabled: on })
                }}
              />
              <ToggleRow
                icon={PhoneIcon}
                title="Phone OTP"
                description="Users can sign in with a 6-digit SMS code."
                checked={platform.login_phone_enabled}
                disabled={saving}
                onChange={(on) => {
                  if (!on && !platform.login_email_enabled) {
                    toast.error('Keep email OTP on if you disable phone.')
                    return
                  }
                  void patchPlatform({ login_phone_enabled: on })
                }}
              />
            </div>
          </div>

          {/* TOTP enforcement */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-zinc-700">Admin Authenticator</div>
            <ToggleRow
              icon={SmartphoneIcon}
              title="Require TOTP for admins"
              description="Admins with 2FA enrolled must enter an authenticator code after email OTP."
              checked={platform.admin_totp_required}
              disabled={saving}
              onChange={(on) => void patchPlatform({ admin_totp_required: on })}
            />
          </div>

          {/* ENV note */}
          <div className="rounded-xl border border-dashed p-5 space-y-2">
            <div className="text-sm font-semibold">Bootstrap admin (environment variable)</div>
            <p className="text-xs text-muted-foreground">
              The initial admin is promoted via the backend <code className="rounded bg-muted px-1">ADMIN_PROMOTE_EMAIL</code> env var. Not editable here.
            </p>
            <code className="block rounded-lg bg-muted px-4 py-3 text-sm font-mono">
              ADMIN_PROMOTE_EMAIL=admin@yourcompany.com
            </code>
          </div>

          {platform.updated_at && (
            <p className="text-xs text-muted-foreground">
              Last updated {new Date(platform.updated_at).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  icon: React.ElementType
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-white px-5 py-4">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-zinc-50">
          <Icon className="h-4 w-4 text-zinc-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{title}</span>
            <Badge variant={checked ? 'default' : 'secondary'} className="text-[10px]">
              {checked ? 'On' : 'Off'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={title} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Security
// ─────────────────────────────────────────────────────────────────────────────

function SecuritySection({
  meUser,
  totpSetup,
  totpCode,
  setTotpCode,
  totpBusy,
  startTotpSetup,
  confirmTotpSetup,
  cancelTotpSetup,
}: {
  meUser: MeUser | null
  totpSetup: { otpauth_url: string; secret_base32: string } | null
  totpCode: string
  setTotpCode: (v: string) => void
  totpBusy: boolean
  startTotpSetup: () => void
  confirmTotpSetup: () => void
  cancelTotpSetup: () => void
}) {
  const qrSrc = totpSetup?.otpauth_url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpSetup.otpauth_url)}`
    : null

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Security"
        description="Manage two-factor authentication for your admin account."
      />

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-zinc-50">
              <SmartphoneIcon className="h-4 w-4 text-zinc-500" />
            </div>
            <div>
              <div className="text-sm font-semibold">Authenticator app (TOTP)</div>
              <div className="text-xs text-muted-foreground">Google Authenticator, Authy, 1Password…</div>
            </div>
          </div>
          {meUser !== null && (
            <Badge variant={meUser.totp_enabled ? 'default' : 'secondary'}>
              {meUser.totp_enabled ? (
                <><CheckCircle2Icon className="mr-1 h-3 w-3" />Enabled</>
              ) : (
                <><XCircleIcon className="mr-1 h-3 w-3" />Disabled</>
              )}
            </Badge>
          )}
        </div>

        <div className="p-5 space-y-4">
          {meUser?.totp_enabled === false && !totpSetup && (
            <Button type="button" onClick={startTotpSetup} disabled={totpBusy} className="gap-2">
              <QrCodeIcon className="h-4 w-4" />
              {totpBusy ? 'Working…' : 'Set up authenticator'}
            </Button>
          )}

          {totpSetup && (
            <div className="space-y-5">
              <div className="rounded-xl border bg-zinc-50 p-5">
                <p className="mb-4 text-sm font-medium">1. Scan this QR code in your authenticator app</p>
                {qrSrc && (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <img
                      src={qrSrc}
                      alt="Authenticator QR"
                      className="rounded-lg border bg-white p-2 shadow-sm"
                      width={180}
                      height={180}
                    />
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Or enter this secret manually:</p>
                      <code className="block break-all rounded-lg bg-white border px-3 py-2.5 text-xs font-mono">
                        {totpSetup.secret_base32}
                      </code>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <Label>2. Enter the 6-digit code from your app to confirm</Label>
                <div className="flex gap-2">
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="h-11 w-40 text-center font-mono tracking-widest"
                  />
                  <Button type="button" onClick={confirmTotpSetup} disabled={totpBusy}>
                    {totpBusy ? 'Confirming…' : 'Enable 2FA'}
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelTotpSetup} disabled={totpBusy}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {meUser?.totp_enabled === true && (
            <div className="flex items-start gap-3 rounded-xl border bg-zinc-50 p-4">
              <CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <p className="text-sm text-zinc-700">
                2FA is active. Every sign-in requires your email OTP followed by your authenticator code.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Account
// ─────────────────────────────────────────────────────────────────────────────

function AccountSection({
  meUser,
  onRefreshMe,
}: {
  meUser: MeUser | null
  onRefreshMe: () => Promise<void>
}) {
  const [email, setEmail] = useState(meUser?.email ?? '')
  const [phone, setPhone] = useState(meUser?.phone ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEmail(meUser?.email ?? '')
    setPhone(meUser?.phone ?? '')
  }, [meUser?.email, meUser?.phone])

  async function saveAccount() {
    if (newPassword && newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }
    if (!email.trim() && !phone.trim()) {
      toast.error('Email or phone is required.')
      return
    }

    setSaving(true)
    try {
      await apiPatch('/admin/me/account', {
        email: email.trim(),
        phone: phone.trim(),
        ...(newPassword ? { password: newPassword } : {}),
      })
      await onRefreshMe()
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Account details updated.')
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not update account')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Account Management"
        description="Update your admin contact and password settings."
      />

      {!meUser ? (
        <div className="p-5 space-y-2 rounded-xl border bg-white">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <div className="rounded-xl border bg-white p-6 space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <FieldGroup label="Email" hint="Used for admin OTP and sign-in.">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@company.com" className="h-11" />
            </FieldGroup>
            <FieldGroup label="Phone" hint="Optional E.164 number, e.g. +919999999999">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919999999999" className="h-11" />
            </FieldGroup>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <FieldGroup label="New password" hint="Leave empty if you do not want to change.">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11"
              />
            </FieldGroup>
            <FieldGroup label="Confirm password" hint="Must match new password.">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11"
              />
            </FieldGroup>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
            <p className="text-sm text-muted-foreground">Admin ID: <code className="rounded bg-white px-1.5 py-0.5 text-xs">{meUser.id}</code></p>
            <Button onClick={saveAccount} disabled={saving}>
              {saving ? 'Saving...' : 'Save account changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
