import { useEffect, useState, useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import { cn, initials } from '@/lib/utils'
import { Users, Search, BookmarkPlus, MessageSquare, Star } from 'lucide-react'
import { toast } from 'sonner'

interface Candidate {
  _id: string; user_id: string; full_name: string; headline?: string
  bio?: string; skills?: string[]; kyc_status?: string; rating?: number; avatar_url?: string
}

function KycBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    verified:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending:    'bg-amber-50 text-amber-700 border-amber-200',
    rejected:   'bg-red-50 text-red-600 border-red-200',
    unverified: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  }
  return (
    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize', map[status ?? 'unverified'] ?? map.unverified)}>
      {status ?? 'unverified'}
    </span>
  )
}

export function EmpCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading]       = useState(false)
  const [search, setSearch]         = useState('')
  const [kycFilter, setKycFilter]   = useState('')
  const [total, setTotal]           = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '24' })
      if (search) params.set('q', search)
      if (kycFilter) params.set('kyc_status', kycFilter)
      const r = await apiGet<{ data: Candidate[]; meta: { total: number } }>(`/employer/candidates?${params}`)
      setCandidates(r.data ?? [])
      setTotal(r.meta?.total ?? 0)
    } catch { setCandidates([]) }
    finally { setLoading(false) }
  }, [search, kycFilter])

  useEffect(() => {
    const t = setTimeout(() => { void load() }, 300)
    return () => clearTimeout(t)
  }, [load])

  async function handleShortlist(c: Candidate) {
    try {
      const sRes = await apiGet<{ data: { shortlists: { _id: string }[] } }>('/employer/shortlists')
      let listId: string
      if ((sRes.data?.shortlists ?? []).length === 0) {
        const newList = await apiPost('/employer/shortlists', { name: 'My Shortlist' }) as { data: { shortlist: { _id: string } } }
        listId = newList.data?.shortlist?._id
      } else {
        listId = sRes.data.shortlists[0]._id
      }
      await apiPost(`/employer/shortlists/${listId}/candidates/${c.user_id}`, {})
      toast.success(`${c.full_name} added to shortlist`)
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
  }

  async function handleMessage(c: Candidate) {
    try {
      await apiPost('/employer/conversations', { worker_id: c.user_id })
      toast.success(`Conversation started with ${c.full_name}`)
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Candidates</h1>
          <p className="text-sm text-zinc-500">Browse available talent on the platform.</p>
        </div>
        <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">{total} results</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or skill…"
            className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-zinc-400" />
        </div>
        <select value={kycFilter} onChange={(e) => setKycFilter(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 outline-none focus:border-zinc-400">
          <option value="">All KYC status</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-zinc-100 h-52" />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
            <Users className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-700">No candidates found</p>
          <p className="mt-1 text-xs text-zinc-400">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {candidates.map((c) => (
            <div key={c._id} className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                  {initials(c.full_name ?? 'C')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">{c.full_name}</p>
                  {c.headline && <p className="truncate text-xs text-zinc-400">{c.headline}</p>}
                  <div className="mt-1"><KycBadge status={c.kyc_status} /></div>
                </div>
              </div>

              {c.rating && (
                <div className="mb-3 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium text-zinc-700">{c.rating.toFixed(1)}</span>
                </div>
              )}

              {c.bio && <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-zinc-400">{c.bio}</p>}

              {(c.skills ?? []).length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1">
                  {(c.skills ?? []).slice(0, 3).map((s) => (
                    <span key={s} className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">{s}</span>
                  ))}
                  {(c.skills ?? []).length > 3 && (
                    <span className="text-[10px] text-zinc-400">+{(c.skills ?? []).length - 3} more</span>
                  )}
                </div>
              )}

              <div className="mt-auto flex gap-2">
                <button onClick={() => handleShortlist(c)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50">
                  <BookmarkPlus className="h-3.5 w-3.5" /> Shortlist
                </button>
                <button onClick={() => handleMessage(c)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 py-2 text-xs font-medium text-white transition hover:bg-zinc-700">
                  <MessageSquare className="h-3.5 w-3.5" /> Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
