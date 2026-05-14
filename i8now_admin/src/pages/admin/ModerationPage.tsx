import { useState } from 'react'
import { cn } from '@/lib/utils'
import { fmtDate } from '@/lib/fmt'
import { Shield, AlertTriangle, Flag, CheckCircle2, XCircle, Clock, Search, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface Report {
  id: string; type: 'user' | 'employer' | 'shift' | 'review'
  reporter: string; reported: string; reason: string; description: string
  status: 'open' | 'under_review' | 'resolved' | 'dismissed'
  severity: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
}

const MOCK: Report[] = [
  { id: 'r1', type: 'employer', reporter: 'Priya Sharma', reported: 'FakeJobs Corp', reason: 'Fraudulent job posting', description: 'This employer posted a job that required upfront payment. Classic scam.', status: 'open', severity: 'critical', created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'r2', type: 'review', reporter: 'Acme Corp', reported: 'Rohan Mehta', reason: 'Fake review', description: 'This review is from an account that never worked with us.', status: 'under_review', severity: 'medium', created_at: new Date(Date.now() - 8 * 3600000).toISOString() },
  { id: 'r3', type: 'user', reporter: 'System', reported: 'Suspicious_User_42', reason: 'Multiple account detection', description: 'This account was flagged for creating duplicate profiles.', status: 'open', severity: 'high', created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: 'r4', type: 'shift', reporter: 'Anjali Gupta', reported: 'Nexus Retail', reason: 'Non-payment of wages', description: 'Completed 3 shifts but was never paid despite multiple follow-ups.', status: 'under_review', severity: 'high', created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'r5', type: 'user', reporter: 'Arjun Kumar', reported: 'Event Masters', reason: 'Hostile work environment', description: 'Supervisor was aggressive and created an unsafe work environment.', status: 'resolved', severity: 'high', created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'r6', type: 'review', reporter: 'TechSupport Co', reported: 'Neha Patel', reason: 'Inappropriate content', description: 'The review contains offensive language.', status: 'dismissed', severity: 'low', created_at: new Date(Date.now() - 7 * 86400000).toISOString() },
]

const SEVERITY_COLOR: Record<string, string> = {
  low: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
}

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-red-50 text-red-700 border-red-200',
  under_review: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  dismissed: 'bg-zinc-100 text-zinc-500 border-zinc-200',
}

const TYPE_COLOR: Record<string, string> = {
  user: 'bg-purple-50 text-purple-700',
  employer: 'bg-blue-50 text-blue-700',
  shift: 'bg-orange-50 text-orange-700',
  review: 'bg-zinc-100 text-zinc-600',
}

export function ModerationPage() {
  const [reports, setReports] = useState(MOCK)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')

  function updateStatus(id: string, status: Report['status']) {
    setReports(reports.map((r) => r.id === id ? { ...r, status } : r))
    toast.success(`Report ${status === 'resolved' ? 'resolved' : 'updated'}`)
  }

  const filtered = reports.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !search || r.reporter.toLowerCase().includes(q) || r.reported.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    const matchSeverity = severityFilter === 'all' || r.severity === severityFilter
    return matchSearch && matchStatus && matchSeverity
  })

  const openCount = reports.filter(r => r.status === 'open').length
  const criticalCount = reports.filter(r => r.severity === 'critical' && r.status === 'open').length

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Moderation</h1>
        <p className="text-sm text-muted-foreground">Review reports, flags, and platform policy violations</p>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: 'Open Reports', value: openCount, icon: Flag, color: 'text-red-500' },
          { label: 'Under Review', value: reports.filter(r => r.status === 'under_review').length, icon: Clock, color: 'text-amber-500' },
          { label: 'Critical', value: criticalCount, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Resolved (30d)', value: reports.filter(r => r.status === 'resolved').length, icon: CheckCircle2, color: 'text-emerald-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className={cn('h-4 w-4', s.color)} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-5 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reports..." className="w-full rounded-lg border bg-background py-2.5 pl-9 pr-4 text-sm outline-none focus:border-foreground" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border bg-background px-3 py-2.5 text-sm outline-none">
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="under_review">Under Review</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="rounded-lg border bg-background px-3 py-2.5 text-sm outline-none">
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Reports */}
      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className={cn('rounded-xl border bg-card p-5 shadow-sm', r.severity === 'critical' && r.status === 'open' && 'border-red-200 bg-red-50/30')}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', r.severity === 'critical' ? 'bg-red-100' : 'bg-zinc-100')}>
                  <Shield className={cn('h-5 w-5', r.severity === 'critical' ? 'text-red-600' : 'text-zinc-500')} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold">{r.reason}</p>
                    <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium capitalize', TYPE_COLOR[r.type])}>{r.type}</span>
                    <span className={cn('rounded-md border px-2 py-0.5 text-xs font-medium capitalize', SEVERITY_COLOR[r.severity])}>{r.severity}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{r.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>Reporter: <span className="font-medium text-foreground">{r.reporter}</span></span>
                    <span>Reported: <span className="font-medium text-foreground">{r.reported}</span></span>
                    <span>{fmtDate(r.created_at)}</span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={cn('rounded-md border px-2.5 py-0.5 text-xs font-medium capitalize', STATUS_COLOR[r.status])}>
                  {r.status.replace('_', ' ')}
                </span>
                {r.status === 'open' && (
                  <>
                    <button onClick={() => updateStatus(r.id, 'under_review')} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors">
                      Review
                    </button>
                    <button onClick={() => updateStatus(r.id, 'resolved')} className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
                      Resolve
                    </button>
                    <button onClick={() => updateStatus(r.id, 'dismissed')} className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                      Dismiss
                    </button>
                  </>
                )}
                {r.status === 'under_review' && (
                  <>
                    <button onClick={() => updateStatus(r.id, 'resolved')} className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
                      Resolve
                    </button>
                    <button onClick={() => updateStatus(r.id, 'dismissed')} className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
