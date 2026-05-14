import { useState } from 'react'
import { cn, fmtDateTime } from '@/lib/utils'
import { CalendarCheck, Plus, Video, Phone, MapPin, Clock, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Interview {
  id: string
  candidate: string
  title: string
  scheduled_at: string
  duration_min: number
  mode: 'video' | 'phone' | 'in_person'
  status: 'scheduled' | 'completed' | 'cancelled'
  outcome: string | null
}

const MOCK_INTERVIEWS: Interview[] = [
  { id: 'i1', candidate: 'Priya Sharma', title: 'Retail Associate Screening', scheduled_at: new Date(Date.now() + 2 * 86400000).toISOString(), duration_min: 30, mode: 'video', status: 'scheduled', outcome: null },
  { id: 'i2', candidate: 'Rohan Mehta', title: 'Warehouse Operator Interview', scheduled_at: new Date(Date.now() + 5 * 86400000).toISOString(), duration_min: 45, mode: 'phone', status: 'scheduled', outcome: null },
  { id: 'i3', candidate: 'Anjali Gupta', title: 'Hospitality Staff', scheduled_at: new Date(Date.now() - 3 * 86400000).toISOString(), duration_min: 30, mode: 'in_person', status: 'completed', outcome: 'hired' },
  { id: 'i4', candidate: 'Arjun Kumar', title: 'Admin Role Assessment', scheduled_at: new Date(Date.now() - 7 * 86400000).toISOString(), duration_min: 60, mode: 'video', status: 'completed', outcome: 'rejected' },
]

const MODE_ICONS = { video: Video, phone: Phone, in_person: MapPin }

function statusBadge(s: string) {
  return s === 'scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : s === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-zinc-100 text-zinc-500 border-zinc-200'
}

function outcomeBadge(o: string | null) {
  if (!o) return null
  return o === 'hired' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
}

export function InterviewsPage() {
  const [interviews, setInterviews] = useState(MOCK_INTERVIEWS)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ candidate: '', title: '', scheduled_at: '', duration_min: 30, mode: 'video' as 'video' | 'phone' | 'in_person' })
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all')

  const filtered = filter === 'all' ? interviews : interviews.filter((i) => i.status === filter)

  function createInterview(e: React.FormEvent) {
    e.preventDefault()
    const newInterview: Interview = { id: `i${Date.now()}`, ...form, status: 'scheduled', outcome: null }
    setInterviews([newInterview, ...interviews])
    setShowForm(false)
    toast.success('Interview scheduled')
  }

  function cancelInterview(id: string) {
    setInterviews(interviews.map((i) => i.id === id ? { ...i, status: 'cancelled' } : i))
    toast.success('Interview cancelled')
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Interviews</h1>
          <p className="text-sm text-zinc-500">Manage candidate interview schedule</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
          <Plus className="h-4 w-4" /> Schedule Interview
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 w-fit">
        {(['all', 'scheduled', 'completed'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors', filter === f ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700')}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((iv) => {
          const ModeIcon = MODE_ICONS[iv.mode]
          return (
            <div key={iv.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
                    <CalendarCheck className="h-5 w-5 text-zinc-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900">{iv.title}</p>
                    <p className="text-sm text-zinc-500">{iv.candidate}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{fmtDateTime(iv.scheduled_at)}</span>
                      <span className="flex items-center gap-1"><ModeIcon className="h-3.5 w-3.5" />{iv.mode.replace('_', ' ')}</span>
                      <span>{iv.duration_min} min</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('rounded-md border px-2.5 py-0.5 text-xs font-medium capitalize', statusBadge(iv.status))}>{iv.status}</span>
                  {iv.outcome && (
                    <span className={cn('rounded-md border px-2.5 py-0.5 text-xs font-medium capitalize', outcomeBadge(iv.outcome))}>{iv.outcome}</span>
                  )}
                  {iv.status === 'scheduled' && (
                    <button onClick={() => cancelInterview(iv.id)} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Schedule Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
              <h2 className="font-semibold">Schedule Interview</h2>
              <button onClick={() => setShowForm(false)} className="rounded-md p-1.5 hover:bg-zinc-100"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={createInterview} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Candidate Name</label>
                <input required value={form.candidate} onChange={(e) => setForm({ ...form, candidate: e.target.value })} className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900" placeholder="Candidate name" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Interview Title</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900" placeholder="e.g. Retail Associate Screening" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Date & Time</label>
                  <input required type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Duration (min)</label>
                  <input type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: parseInt(e.target.value) })} className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Mode</label>
                <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as 'video' | 'phone' | 'in_person' })} className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900">
                  <option value="video">Video Call</option>
                  <option value="phone">Phone Call</option>
                  <option value="in_person">In Person</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50">Cancel</button>
                <button type="submit" className="flex-1 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
