import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'

type MeUser = {
  id: string
  email: string | null
  phone: string | null
  role: string
  status: string
  totp_enabled: boolean
  onboarding_step: number
}

type MeResponse = {
  status: string
  data: { user: MeUser }
}

export function useMe() {
  const [user, setUser] = useState<MeUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<MeResponse>('/admin/me')
      .then((r) => setUser(r.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  return { user, loading }
}
