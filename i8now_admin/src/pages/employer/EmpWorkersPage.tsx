import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost } from '@/lib/api'
import { cn, initials, fmtDate } from '@/lib/utils'
import { Briefcase, Search, Star, MessageSquare, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

interface Worker {
  _id: string; user_id: string; full_name: string; headline?: string
  avatar_url?: string; skills?: string[]; kyc_status?: string
  rating?: number; created_at?: string
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-zinc-100', className)} />
}

function KycBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    verified:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending:    'bg-amber-50 text-amber-700 border-amber-200',
    rejected:   'bg-red-50 text-red-700 border-red-200',
    unverified: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  }
  return (
    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize', map[status ?? 'unverified'] ?? map.unverified)}>
      {status ?? 'unverified'}
    </span>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-sm font-semibold text-zinc-900">{title}</h3>
        {children}
      </div>
    </div>
  )
}

export function EmpWorkersPage() {
  const [workers, setWorkers]   = useState<Worker[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [rateTarget, setRateTarget] = useState<Worker | null>(null)
  const [rating, setRating]     = useState(5)
  const [comment, setComment]   = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiGet<{ data: { workers: Worker[] } }>('/employer/workers')
      .then((r) => setWorkers(r.data?.workers ?? []))
      .catch(() => setWorkers([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = workers.filter((w) =>
    !search || w.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    w.skills?.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  )

  async function handleRate() {
    if (!rateTarget) return
    setSubmitting(true)
    try {
      await apiPost(`/employer/workers/${rateTarget.user_id}/rate`, { rating, comment })
      toast.success('Rating submitted')
      setRateTarget(null); setRating(5); setComment('')
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">My Workers</h1>
          <p className="text-sm text-zinc-500">Workers hired through your shifts.</p>
        </div>
        <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
          {workers.length} total
        </span>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or skill…"
          className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-zinc-400" />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
            <Briefcase className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-700">No workers yet</p>
          <p className="mt-1 text-xs text-zinc-400">Workers who accept your shifts will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((w) => (
            <div key={w._id} className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                  {initials(w.full_name ?? 'W')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">{w.full_name}</p>
                  <p className="truncate text-xs text-zinc-400">{w.headline ?? 'Worker'}</p>
                  <KycBadge status={w.kyc_status} />
                </div>
              </div>

              {(w.skills ?? []).length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1">
                  {(w.skills ?? []).slice(0, 4).map((s) => (
                    <span key={s} className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">{s}</span>
                  ))}
                  {(w.skills ?? []).length > 4 && (
                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-400">+{(w.skills ?? []).length - 4}</span>
                  )}
                </div>
              )}

              <p className="mb-4 text-[11px] text-zinc-400">Joined {fmtDate(w.created_at)}</p>

              <div className="mt-auto flex gap-2">
                <button onClick={() => setRateTarget(w)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50">
                  <Star className="h-3.5 w-3.5" /> Rate
                </button>
                <Link to="/emp/messages"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50">
                  <MessageSquare className="h-3.5 w-3.5" /> Message
                </Link>
                <Link to={`/emp/workers/${w.user_id}`}
                  className="flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-zinc-700">
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {rateTarget && (
        <Modal title={`Rate ${rateTarget.full_name}`} onClose={() => setRateTarget(null)}>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">Rating (1–5)</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)}
                    className={cn('flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold transition',
                      rating >= n ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-400 hover:border-zinc-400')}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">Comment (optional)</label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
                placeholder="Share your experience…"
                className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-400" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setRateTarget(null)} className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50">Cancel</button>
              <button onClick={handleRate} disabled={submitting} className="flex-1 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
                {submitting ? 'Submitting…' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
