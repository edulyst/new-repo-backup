import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { cn, fmtDate } from '@/lib/utils'
import { ArrowLeft, Star, Award, TrendingUp, CheckCircle2, Clock, X } from 'lucide-react'
import { toast } from 'sonner'

const MOCK_WORKER = {
  id: 'w1', name: 'Priya Sharma', role: 'Retail Associate', department: 'Sales',
  avg_rating: 4.8, kpi_score: 92, tasks_completed: 18, tasks_total: 22, badges: 3,
  status: 'active', start_date: '2024-10-01', bio: 'Hardworking and reliable with excellent customer service skills.',
  tasks: [
    { id: 't1', title: 'Onboarding documentation', status: 'completed', due_date: '2024-10-05', priority: 'high' },
    { id: 't2', title: 'Floor training module', status: 'completed', due_date: '2024-10-10', priority: 'medium' },
    { id: 't3', title: 'Monthly sales report', status: 'in_progress', due_date: new Date(Date.now() + 3 * 86400000).toISOString(), priority: 'high' },
    { id: 't4', title: 'Customer satisfaction survey', status: 'pending', due_date: new Date(Date.now() + 7 * 86400000).toISOString(), priority: 'low' },
  ],
  badges_list: [
    { name: 'Top Performer', icon: '🏆', date: '2024-11-01' },
    { name: 'Punctuality Star', icon: '⭐', date: '2024-10-15' },
    { name: 'Team Player', icon: '🤝', date: '2024-10-20' },
  ],
  kpi_history: [
    { period: 'Oct 2024', score: 88, tasks: 6, completed: 6, rating: 4.7 },
    { period: 'Nov 2024', score: 91, tasks: 8, completed: 7, rating: 4.8 },
    { period: 'Dec 2024', score: 95, tasks: 8, completed: 7, rating: 4.9 },
  ],
}

const STATUS_COLOR: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700',
  in_progress: 'bg-blue-50 text-blue-700',
  pending: 'bg-zinc-100 text-zinc-500',
}

export function WorkerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showRating, setShowRating] = useState(false)
  const [showBadge, setShowBadge] = useState(false)
  const [rating, setRating] = useState(5)
  const [ratingNote, setRatingNote] = useState('')
  const [activeTab, setActiveTab] = useState<'tasks' | 'kpis' | 'badges'>('tasks')

  function submitRating(e: React.FormEvent) {
    e.preventDefault()
    toast.success(`Rating of ${rating}/5 submitted for ${MOCK_WORKER.name}`)
    setShowRating(false)
  }

  function awardBadge(e: React.FormEvent) {
    e.preventDefault()
    toast.success('Badge awarded!')
    setShowBadge(false)
  }

  return (
    <div className="p-6">
      <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="h-4 w-4" /> Back to Workers
      </button>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Profile Card */}
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-xl font-bold text-white">
              {MOCK_WORKER.name.split(' ').map((x) => x[0]).join('')}
            </div>
            <h2 className="font-semibold">{MOCK_WORKER.name}</h2>
            <p className="text-sm text-zinc-500">{MOCK_WORKER.role}</p>
            <p className="text-xs text-zinc-400 mt-1">{MOCK_WORKER.department} · Since {fmtDate(MOCK_WORKER.start_date)}</p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-zinc-50 p-2">
                <p className="text-lg font-bold">{MOCK_WORKER.kpi_score}%</p>
                <p className="text-xs text-zinc-400">KPI</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-2">
                <p className="text-lg font-bold">{MOCK_WORKER.avg_rating}</p>
                <p className="text-xs text-zinc-400">Rating</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-2">
                <p className="text-lg font-bold">{MOCK_WORKER.badges}</p>
                <p className="text-xs text-zinc-400">Badges</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <button onClick={() => setShowRating(true)} className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">Rate Worker</button>
              <button onClick={() => setShowBadge(true)} className="w-full rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">Award Badge</button>
            </div>
          </div>

          {/* Task Progress */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Task Completion</h3>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-zinc-500">{MOCK_WORKER.tasks_completed}/{MOCK_WORKER.tasks_total} tasks</span>
              <span className="font-medium">{Math.round((MOCK_WORKER.tasks_completed / MOCK_WORKER.tasks_total) * 100)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-zinc-900 transition-all" style={{ width: `${(MOCK_WORKER.tasks_completed / MOCK_WORKER.tasks_total) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Tabs */}
          <div className="mb-5 flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 w-fit">
            {(['tasks', 'kpis', 'badges'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={cn('rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors', activeTab === tab ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700')}>
                {tab === 'kpis' ? 'KPI History' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'tasks' && (
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 text-xs text-zinc-400">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Task</th>
                    <th className="px-5 py-3 text-left font-medium">Priority</th>
                    <th className="px-5 py-3 text-left font-medium">Due</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {MOCK_WORKER.tasks.map((t) => (
                    <tr key={t.id}>
                      <td className="px-5 py-3 font-medium">{t.title}</td>
                      <td className="px-5 py-3 capitalize text-zinc-500">{t.priority}</td>
                      <td className="px-5 py-3 text-zinc-500">{fmtDate(t.due_date)}</td>
                      <td className="px-5 py-3">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', STATUS_COLOR[t.status])}>{t.status.replace('_', ' ')}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'kpis' && (
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 text-xs text-zinc-400">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Period</th>
                    <th className="px-5 py-3 text-left font-medium">KPI Score</th>
                    <th className="px-5 py-3 text-left font-medium">Tasks</th>
                    <th className="px-5 py-3 text-left font-medium">Avg Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {MOCK_WORKER.kpi_history.map((k) => (
                    <tr key={k.period}>
                      <td className="px-5 py-3 font-medium">{k.period}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-zinc-100">
                            <div className="h-full rounded-full bg-zinc-900" style={{ width: `${k.score}%` }} />
                          </div>
                          <span className="font-medium">{k.score}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-zinc-500">{k.completed}/{k.tasks}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {k.rating}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'badges' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MOCK_WORKER.badges_list.map((b) => (
                <div key={b.name} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm text-center">
                  <div className="mx-auto mb-3 text-4xl">{b.icon}</div>
                  <p className="font-semibold">{b.name}</p>
                  <p className="text-xs text-zinc-400 mt-1">Awarded {fmtDate(b.date)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rate Modal */}
      {showRating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
              <h2 className="font-semibold">Rate {MOCK_WORKER.name}</h2>
              <button onClick={() => setShowRating(false)}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={submitRating} className="p-6 space-y-4">
              <div>
                <label className="mb-3 block text-sm font-medium">Rating</label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setRating(s)} className={cn('text-3xl transition-transform hover:scale-110', s <= rating ? 'opacity-100' : 'opacity-30')}>⭐</button>
                  ))}
                </div>
                <p className="mt-2 text-center text-sm font-medium">{rating} / 5</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Feedback (optional)</label>
                <textarea value={ratingNote} onChange={(e) => setRatingNote(e.target.value)} rows={3} className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900 resize-none" placeholder="Add feedback..." />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowRating(false)} className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600">Cancel</button>
                <button type="submit" className="flex-1 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Badge Modal */}
      {showBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
              <h2 className="font-semibold">Award Badge</h2>
              <button onClick={() => setShowBadge(false)}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={awardBadge} className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Badge</label>
                <select className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900">
                  <option>🏆 Top Performer</option>
                  <option>⭐ Punctuality Star</option>
                  <option>🤝 Team Player</option>
                  <option>💡 Problem Solver</option>
                  <option>🚀 Fast Learner</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Reason</label>
                <textarea rows={3} className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900 resize-none" placeholder="Why are you awarding this badge?" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowBadge(false)} className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600">Cancel</button>
                <button type="submit" className="flex-1 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">Award</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
