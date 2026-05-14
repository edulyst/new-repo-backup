import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPatch } from '@/lib/api'
import {
  type AdminSettings,
  applySettings,
  DEFAULT_SETTINGS,
  normalizeSettings,
} from '@/lib/admin-settings'

const SETTINGS_SYNC_EVENT = 'admin-settings-sync'

export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings>(() => DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    apiGet<{ status: string; data: { ui_settings?: Partial<AdminSettings> } }>('/admin/platform-settings')
      .then((res) => {
        if (!mounted) return
        const normalized = normalizeSettings(res.data.ui_settings)
        setSettings(normalized)
        applySettings(normalized)
      })
      .catch(() => null)
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const handler = (evt: Event) => {
      const next = (evt as CustomEvent<AdminSettings>).detail
      setSettings(next)
      applySettings(next)
    }
    window.addEventListener(SETTINGS_SYNC_EVENT, handler)
    return () => window.removeEventListener(SETTINGS_SYNC_EVENT, handler)
  }, [])

  const update = useCallback(
    async (patch: Partial<AdminSettings>) => {
      const prev = settings
      const next = normalizeSettings({ ...settings, ...patch })
      setSettings(next)
      applySettings(next)
      window.dispatchEvent(new CustomEvent(SETTINGS_SYNC_EVENT, { detail: next }))
      try {
        await apiPatch('/admin/platform-settings', { ui_settings: next })
        return true
      } catch (err) {
        setSettings(prev)
        applySettings(prev)
        window.dispatchEvent(new CustomEvent(SETTINGS_SYNC_EVENT, { detail: prev }))
        return false
      }
    },
    [settings],
  )

  return { settings, update, loading }
}
