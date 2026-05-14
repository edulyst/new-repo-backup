import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { cn, fmtDate, fmtDateTime } from '@/lib/utils'
import { CalendarCheck, MapPin, Clock } from 'lucide-react'

interface Interview {
  _id: string; candidate_name?: string; position?: string
  scheduled_at?: string; location?: string; type?: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
}

const STATUS_STYLE: Record<string, string> = {
  scheduled:  'bg-blue-50 text-blue-700 border-blue-200',
  completed:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled:  'bg-red-50 text-red-600 border-red-200',
  no_show:    'bg-zinc-100 text-zinc-500 border-zinc-200',
}

export function EmpInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    apiGet<{ data: { interviews: Interview[] } }>('/employer/interviews')
      .then((r) => setInterviews(r.data?.interviews ?? []))
      .catch(() => setInterviews([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Interviews</h1>
        <p className="text-sm text-zinc-500">Track your scheduled candidate interviews.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-100" />
          ))}
        </div>
      ) : interviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
            <CalendarCheck className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-700">No interviews scheduled</p>
          <p className="mt-1 text-xs text-zinc-400">Interviews you schedule with candidates will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {interviews.map((iv) => (
            <div key={iv._id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-900">{iv.candidate_name ?? 'Candidate'}</p>
                  {iv.position && <p className="text-xs text-zinc-400">{iv.position}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                    {iv.scheduled_at && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDateTime(iv.scheduled_at)}</span>
                    )}
                    {iv.location && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{iv.location}</span>
                    )}
                  </div>
                </div>
                <span className={cn('shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium capitalize', STATUS_STYLE[iv.status] ?? STATUS_STYLE.scheduled)}>
                  {iv.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
