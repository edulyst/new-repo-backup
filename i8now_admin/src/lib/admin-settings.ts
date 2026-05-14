// ─── Types ───────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system'
export type AccentPreset = 'zinc' | 'blue' | 'violet' | 'green' | 'rose' | 'amber' | 'orange' | 'cyan'
export type FontFamily = 'geist' | 'inter' | 'dm-sans' | 'system' | 'mono'
export type FontSize = 'sm' | 'md' | 'lg'
export type LetterSpacing = 'tight' | 'normal' | 'wide'
export type RadiusPreset = 'none' | 'sm' | 'md' | 'lg' | 'xl'

export type NavItemId =
  | 'overview'
  | 'users'
  | 'workers'
  | 'employers'
  | 'shifts'
  | 'timesheets'
  | 'applications'

export type NavItemConfig = { id: NavItemId; visible: boolean }

export type AdminSettings = {
  // Branding
  site_name: string
  site_subtitle: string
  logo_data_url: string | null
  login_left_image_url: string | null
  login_left_heading: string
  login_left_caption: string
  // Appearance
  theme: ThemeMode
  accent: AccentPreset
  radius: RadiusPreset
  // Typography
  font_family: FontFamily
  font_size: FontSize
  letter_spacing: LetterSpacing
  // Navigation
  nav_items: NavItemConfig[]
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_NAV_ITEMS: NavItemConfig[] = [
  { id: 'overview', visible: true },
  { id: 'users', visible: true },
  { id: 'workers', visible: true },
  { id: 'employers', visible: true },
  { id: 'shifts', visible: true },
  { id: 'timesheets', visible: true },
  { id: 'applications', visible: true },
]

export const DEFAULT_SETTINGS: AdminSettings = {
  site_name: 'i8now Admin',
  site_subtitle: 'Operations',
  logo_data_url: null,
  login_left_image_url: null,
  login_left_heading: 'Operations command centre',
  login_left_caption: 'Manage workers, employers, timesheets, and platform settings from one place.',
  theme: 'light',
  accent: 'zinc',
  radius: 'lg',
  font_family: 'geist',
  font_size: 'md',
  letter_spacing: 'normal',
  nav_items: DEFAULT_NAV_ITEMS,
}

// ─── Presets ─────────────────────────────────────────────────────────────────

export type AccentConfig = {
  label: string
  swatch: string // CSS color for the UI swatch
  light: { primary: string; primaryFg: string; ring: string }
  dark: { primary: string; primaryFg: string; ring: string }
}

export const ACCENT_PRESETS: Record<AccentPreset, AccentConfig> = {
  zinc: {
    label: 'Zinc',
    swatch: '#18181b',
    light: {
      primary: 'oklch(0.205 0 0)',
      primaryFg: 'oklch(0.985 0 0)',
      ring: 'oklch(0.708 0 0)',
    },
    dark: {
      primary: 'oklch(0.922 0 0)',
      primaryFg: 'oklch(0.205 0 0)',
      ring: 'oklch(0.556 0 0)',
    },
  },
  blue: {
    label: 'Blue',
    swatch: '#2563eb',
    light: {
      primary: 'oklch(0.546 0.245 262.881)',
      primaryFg: 'oklch(0.985 0 0)',
      ring: 'oklch(0.623 0.214 259.815)',
    },
    dark: {
      primary: 'oklch(0.623 0.214 259.815)',
      primaryFg: 'oklch(0.985 0 0)',
      ring: 'oklch(0.546 0.245 262.881)',
    },
  },
  violet: {
    label: 'Violet',
    swatch: '#7c3aed',
    light: {
      primary: 'oklch(0.491 0.27 292.581)',
      primaryFg: 'oklch(0.985 0 0)',
      ring: 'oklch(0.585 0.233 277.117)',
    },
    dark: {
      primary: 'oklch(0.585 0.233 277.117)',
      primaryFg: 'oklch(0.985 0 0)',
      ring: 'oklch(0.491 0.27 292.581)',
    },
  },
  green: {
    label: 'Green',
    swatch: '#16a34a',
    light: {
      primary: 'oklch(0.527 0.154 150.069)',
      primaryFg: 'oklch(0.985 0 0)',
      ring: 'oklch(0.627 0.194 149.579)',
    },
    dark: {
      primary: 'oklch(0.627 0.194 149.579)',
      primaryFg: 'oklch(0.985 0 0)',
      ring: 'oklch(0.527 0.154 150.069)',
    },
  },
  rose: {
    label: 'Rose',
    swatch: '#e11d48',
    light: {
      primary: 'oklch(0.585 0.233 17.267)',
      primaryFg: 'oklch(0.985 0 0)',
      ring: 'oklch(0.637 0.237 17.0)',
    },
    dark: {
      primary: 'oklch(0.637 0.237 17.0)',
      primaryFg: 'oklch(0.985 0 0)',
      ring: 'oklch(0.585 0.233 17.267)',
    },
  },
  amber: {
    label: 'Amber',
    swatch: '#d97706',
    light: {
      primary: 'oklch(0.769 0.188 80.504)',
      primaryFg: 'oklch(0.205 0 0)',
      ring: 'oklch(0.769 0.188 80.504)',
    },
    dark: {
      primary: 'oklch(0.769 0.188 80.504)',
      primaryFg: 'oklch(0.205 0 0)',
      ring: 'oklch(0.669 0.188 80.504)',
    },
  },
  orange: {
    label: 'Orange',
    swatch: '#ea580c',
    light: {
      primary: 'oklch(0.655 0.24 41.788)',
      primaryFg: 'oklch(0.985 0 0)',
      ring: 'oklch(0.7 0.213 47.604)',
    },
    dark: {
      primary: 'oklch(0.7 0.213 47.604)',
      primaryFg: 'oklch(0.985 0 0)',
      ring: 'oklch(0.655 0.24 41.788)',
    },
  },
  cyan: {
    label: 'Cyan',
    swatch: '#0891b2',
    light: {
      primary: 'oklch(0.541 0.157 207.42)',
      primaryFg: 'oklch(0.985 0 0)',
      ring: 'oklch(0.641 0.157 207)',
    },
    dark: {
      primary: 'oklch(0.641 0.157 207)',
      primaryFg: 'oklch(0.985 0 0)',
      ring: 'oklch(0.541 0.157 207)',
    },
  },
}

export const RADIUS_VALUES: Record<RadiusPreset, string> = {
  none: '0rem',
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.625rem',
  xl: '1rem',
}

export const RADIUS_LABELS: Record<RadiusPreset, string> = {
  none: 'Square',
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
  xl: 'Pill',
}

export const FONT_FAMILIES: Record<FontFamily, string> = {
  geist: "'Geist Variable', sans-serif",
  inter: "'Inter', system-ui, sans-serif",
  'dm-sans': "'DM Sans', system-ui, sans-serif",
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "'Fira Code', 'JetBrains Mono', 'Courier New', monospace",
}

export const FONT_FAMILY_LABELS: Record<FontFamily, string> = {
  geist: 'Geist',
  inter: 'Inter',
  'dm-sans': 'DM Sans',
  system: 'System UI',
  mono: 'Monospace',
}

export const FONT_SIZE_VALUES: Record<FontSize, string> = {
  sm: '13px',
  md: '14px',
  lg: '16px',
}

export const FONT_SIZE_LABELS: Record<FontSize, string> = {
  sm: 'Small (13px)',
  md: 'Medium (14px)',
  lg: 'Large (16px)',
}

export const LETTER_SPACING_VALUES: Record<LetterSpacing, string> = {
  tight: '-0.02em',
  normal: '0em',
  wide: '0.025em',
}

// ─── API mapping / normalization ─────────────────────────────────────────────

export function normalizeSettings(raw?: Partial<AdminSettings> | null): AdminSettings {
  const parsed = raw ?? {}
  const merged = { ...DEFAULT_SETTINGS, ...parsed }
  const incoming = Array.isArray(parsed.nav_items) ? parsed.nav_items : DEFAULT_NAV_ITEMS
  const known = new Set(incoming.map((n) => n.id))
  const appended = DEFAULT_NAV_ITEMS.filter((n) => !known.has(n.id))
  return {
    ...merged,
    nav_items: [...incoming, ...appended],
  }
}

// ─── Apply to DOM ─────────────────────────────────────────────────────────────

function injectFont(family: FontFamily) {
  const GOOGLE_FONTS: Partial<Record<FontFamily, string>> = {
    inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@300..700&display=swap',
    'dm-sans': 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700&display=swap',
  }
  const url = GOOGLE_FONTS[family]
  if (!url) return
  const id = `gfont-${family}`
  if (!document.getElementById(id)) {
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = url
    document.head.appendChild(link)
  }
}

export function applySettings(settings: AdminSettings): void {
  const root = document.documentElement

  // 1. Theme mode
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark =
    settings.theme === 'dark' || (settings.theme === 'system' && prefersDark)
  root.classList.toggle('dark', isDark)

  // 2. Font injection (Google Fonts)
  injectFont(settings.font_family)

  // 3. CSS variable overrides via injected <style>
  const accent = ACCENT_PRESETS[settings.accent] ?? ACCENT_PRESETS.zinc
  const radius = RADIUS_VALUES[settings.radius] ?? RADIUS_VALUES.lg
  const fontStack = FONT_FAMILIES[settings.font_family] ?? FONT_FAMILIES.geist
  const fontSize = FONT_SIZE_VALUES[settings.font_size] ?? FONT_SIZE_VALUES.md
  const letterSpacing = LETTER_SPACING_VALUES[settings.letter_spacing] ?? '0em'

  let styleEl = document.getElementById('admin-theme-overrides') as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'admin-theme-overrides'
    document.head.appendChild(styleEl)
  }

  styleEl.textContent = `
    :root {
      --primary: ${accent.light.primary};
      --primary-foreground: ${accent.light.primaryFg};
      --ring: ${accent.light.ring};
      --sidebar-primary: ${accent.light.primary};
      --sidebar-primary-foreground: ${accent.light.primaryFg};
      --radius: ${radius};
    }
    .dark {
      --primary: ${accent.dark.primary};
      --primary-foreground: ${accent.dark.primaryFg};
      --ring: ${accent.dark.ring};
      --sidebar-primary: ${accent.dark.primary};
      --sidebar-primary-foreground: ${accent.dark.primaryFg};
    }
    html {
      font-family: ${fontStack} !important;
      font-size: ${fontSize};
      letter-spacing: ${letterSpacing};
    }
  `
}
