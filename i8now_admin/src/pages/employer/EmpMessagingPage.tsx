import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { cn, initials, fmtDate } from '@/lib/utils'
import { MessageSquare } from 'lucide-react'

interface Conversation {
  _id: string; worker_name?: string; last_message?: string; last_message_at?: string; unread_count?: number
}

export function EmpMessagingPage() {
  const [convos, setConvos]   = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<{ data: { conversations: Conversation[] } }>('/employer/conversations')
      .then((r) => setConvos(r.data?.conversations ?? []))
      .catch(() => setConvos([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Messages</h1>
        <p className="text-sm text-zinc-500">Direct conversations with workers and candidates.</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100" />
          ))}
        </div>
      ) : convos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
            <MessageSquare className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-700">No messages yet</p>
          <p className="mt-1 text-xs text-zinc-400">Start a conversation from the Candidates page.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-50">
          {convos.map((c) => (
            <div key={c._id} className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 transition-colors cursor-pointer">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                {initials(c.worker_name ?? 'W')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900">{c.worker_name ?? 'Worker'}</p>
                <p className="truncate text-xs text-zinc-400">{c.last_message ?? 'No messages yet'}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <p className="text-[10px] text-zinc-400">{fmtDate(c.last_message_at)}</p>
                {(c.unread_count ?? 0) > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[9px] font-bold text-white">
                    {c.unread_count}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
