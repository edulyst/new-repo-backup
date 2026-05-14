import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarOffIcon,
  CheckCircle2Icon,
  ChevronsUpDownIcon,
  ClockIcon,
  HeartPulseIcon,
  PalmtreeIcon,
  SearchIcon,
  StarIcon,
  UmbrellaIcon,
  XCircleIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────
type LeaveType   = 'sick' | 'casual' | 'annual' | 'maternity' | 'emergency' | 'unpaid'
type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

type LeaveRequest = {
  id: string
  employee: string
  department: string
  type: LeaveType
  from: string
  to: string
  days: number
  reason: string
  applied_on: string
  status: LeaveStatus
  approved_by: string | null
}

type LeaveBalance = {
  employee: string
  sick: { used: number; total: number }
  casual: { used: number; total: number }
  annual: { used: number; total: number }
}

type SortState = { col: string; dir: 'asc' | 'desc' | null }

// ─── Mock Data ───────────────────────────────────────────────
const LEAVE_REQUESTS: LeaveRequest[] = [
  { id: 'lr001', employee: 'Priya Verma',    department: 'Hospitality', type: 'sick',      from: '2026-04-17', to: '2026-04-18', days: 2,  reason: 'Fever and cold',              applied_on: '2026-04-16', status: 'pending',  approved_by: null },
  { id: 'lr002', employee: 'Rahul Singh',    department: 'Events',      type: 'casual',    from: '2026-04-20', to: '2026-04-20', days: 1,  reason: 'Personal work',               applied_on: '2026-04-15', status: 'approved', approved_by: 'Pooja Mehta' },
  { id: 'lr003', employee: 'Meera Nair',     department: 'Logistics',   type: 'annual',    from: '2026-04-22', to: '2026-04-30', days: 9,  reason: 'Family vacation',             applied_on: '2026-04-10', status: 'approved', approved_by: 'Pooja Mehta' },
  { id: 'lr004', employee: 'Sunita Kumari',  department: 'Facilities',  type: 'sick',      from: '2026-04-16', to: '2026-04-16', days: 1,  reason: 'Medical appointment',         applied_on: '2026-04-16', status: 'pending',  approved_by: null },
  { id: 'lr005', employee: 'Anjali Gupta',   department: 'Hospitality', type: 'sick',      from: '2026-04-15', to: '2026-04-17', days: 3,  reason: 'High fever',                  applied_on: '2026-04-14', status: 'approved', approved_by: 'Pooja Mehta' },
  { id: 'lr006', employee: 'Kavya Reddy',    department: 'Events',      type: 'casual',    from: '2026-04-24', to: '2026-04-24', days: 1,  reason: 'Marriage in family',          applied_on: '2026-04-12', status: 'pending',  approved_by: null },
  { id: 'lr007', employee: 'Manoj Kumar',    department: 'Logistics',   type: 'emergency', from: '2026-04-10', to: '2026-04-11', days: 2,  reason: 'Family emergency',            applied_on: '2026-04-10', status: 'approved', approved_by: 'Pooja Mehta' },
  { id: 'lr008', employee: 'Sanjay Tiwari',  department: 'Maintenance', type: 'unpaid',    from: '2026-04-14', to: '2026-04-14', days: 1,  reason: 'Personal reason',             applied_on: '2026-04-13', status: 'rejected', approved_by: 'Pooja Mehta' },
  { id: 'lr009', employee: 'Vikram Patel',   department: 'Logistics',   type: 'casual',    from: '2026-05-05', to: '2026-05-05', days: 1,  reason: 'Birthday leave',              applied_on: '2026-04-20', status: 'pending',  approved_by: null },
  { id: 'lr010', employee: 'Arjun Sharma',   department: 'Security',    type: 'annual',    from: '2026-05-15', to: '2026-05-22', days: 8,  reason: 'Hometown visit',              applied_on: '2026-04-15', status: 'approved', approved_by: 'Pooja Mehta' },
  { id: 'lr011', employee: 'Deepak Raj',     department: 'Security',    type: 'sick',      from: '2026-04-08', to: '2026-04-09', days: 2,  reason: 'Back pain',                   applied_on: '2026-04-08', status: 'approved', approved_by: 'Pooja Mehta' },
  { id: 'lr012', employee: 'Ritu Singh',     department: 'Healthcare',  type: 'maternity', from: '2026-05-01', to: '2026-07-31', days: 91, reason: 'Maternity leave',             applied_on: '2026-04-01', status: 'approved', approved_by: 'Pooja Mehta' },
]

const BALANCES: LeaveBalance[] = [
  { employee: 'Arjun Sharma',   sick: { used: 2, total: 12 }, casual: { used: 3, total: 8 },  annual: { used: 8, total: 21 } },
  { employee: 'Priya Verma',    sick: { used: 4, total: 12 }, casual: { used: 1, total: 8 },  annual: { used: 5, total: 21 } },
  { employee: 'Vikram Patel',   sick: { used: 1, total: 12 }, casual: { used: 2, total: 8 },  annual: { used: 0, total: 21 } },
  { employee: 'Meera Nair',     sick: { used: 3, total: 12 }, casual: { used: 0, total: 8 },  annual: { used: 12, total: 21 } },
  { employee: 'Deepak Raj',     sick: { used: 5, total: 12 }, casual: { used: 4, total: 8 },  annual: { used: 3, total: 21 } },
]

const leaveTypeConfig: Record<LeaveType, { label: string; badge: string; dot: string; icon: React.ElementType }> = {
  sick:      { label: 'Sick',       badge: 'border-red-200 bg-red-50 text-red-700',           dot: 'bg-red-400',      icon: HeartPulseIcon },
  casual:    { label: 'Casual',     badge: 'border-blue-200 bg-blue-50 text-blue-700',         dot: 'bg-blue-400',     icon: CalendarOffIcon },
  annual:    { label: 'Annual',     badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-400', icon: PalmtreeIcon },
  maternity: { label: 'Maternity',  badge: 'border-pink-200 bg-pink-50 text-pink-700',         dot: 'bg-pink-400',     icon: StarIcon },
  emergency: { label: 'Emergency',  badge: 'border-orange-200 bg-orange-50 text-orange-700',   dot: 'bg-orange-400',   icon: UmbrellaIcon },
  unpaid:    { label: 'Unpaid',     badge: 'border-zinc-200 bg-zinc-50 text-zinc-600',         dot: 'bg-zinc-400',     icon: CalendarOffIcon },
}
const statusBadge: Record<LeaveStatus, string> = {
  pending:   'border-amber-200 bg-amber-50 text-amber-700',
  approved:  'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected:  'border-red-200 bg-red-50 text-red-700',
  cancelled: 'border-zinc-200 bg-zinc-50 text-zinc-500',
}
const statusDot: Record<LeaveStatus, string> = {
  pending:   'bg-amber-400',
  approved:  'bg-emerald-500',
  rejected:  'bg-red-500',
  cancelled: 'bg-zinc-400',
}

function nextSort(s: SortState, col: string): SortState {
  if (s.col !== col) return { col, dir: 'asc' }
  if (s.dir === 'asc') return { col, dir: 'desc' }
  return { col: '', dir: null }
}

function SortHead({ col, label, sort, onSort, className }: { col: string; label: string; sort: SortState; onSort: (c: string) => void; className?: string }) {
  const active = sort.col === col
  return (
    <TableHead className={cn('py-3', className)}>
      <button type="button" onClick={() => onSort(col)} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
        {label}
        {active && sort.dir === 'asc'  && <ArrowUpIcon className="h-3 w-3" />}
        {active && sort.dir === 'desc' && <ArrowDownIcon className="h-3 w-3" />}
        {!active && <ChevronsUpDownIcon className="h-3 w-3 opacity-40" />}
      </button>
    </TableHead>
  )
}

export function HrmLeavePage() {
  const [tab, setTab]         = useState<'requests' | 'balances'>('requests')
  const [search, setSearch]   = useState('')
  const [typeF, setTypeF]     = useState('All')
  const [statusF, setStatusF] = useState('All')
  const [sort, setSort]       = useState<SortState>({ col: '', dir: null })

  const stats = useMemo(() => ({
    pending:  LEAVE_REQUESTS.filter(r => r.status === 'pending').length,
    approved: LEAVE_REQUESTS.filter(r => r.status === 'approved').length,
    rejected: LEAVE_REQUESTS.filter(r => r.status === 'rejected').length,
    totalDays: LEAVE_REQUESTS.filter(r => r.status === 'approved').reduce((s, r) => s + r.days, 0),
  }), [])

  const filtered = useMemo(() => {
    let rows = LEAVE_REQUESTS
    if (search)          rows = rows.filter(r => r.employee.toLowerCase().includes(search.toLowerCase()))
    if (typeF !== 'All') rows = rows.filter(r => r.type === typeF)
    if (statusF !== 'All') rows = rows.filter(r => r.status === statusF)
    if (sort.col && sort.dir) {
      rows = [...rows].sort((a, b) => {
        let va: string | number = '', vb: string | number = ''
        if (sort.col === 'employee') { va = a.employee;   vb = b.employee }
        if (sort.col === 'from')     { va = a.from;       vb = b.from }
        if (sort.col === 'days')     { va = a.days;       vb = b.days }
        if (sort.col === 'applied')  { va = a.applied_on; vb = b.applied_on }
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [search, typeF, statusF, sort])

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Pending approval', value: stats.pending,  icon: ClockIcon,        bg: 'bg-amber-50 border-amber-100',   cls: 'text-amber-600' },
          { label: 'Approved',         value: stats.approved, icon: CheckCircle2Icon,  bg: 'bg-emerald-50 border-emerald-100', cls: 'text-emerald-600' },
          { label: 'Rejected',         value: stats.rejected, icon: XCircleIcon,       bg: 'bg-red-50 border-red-100',       cls: 'text-red-600' },
          { label: 'Days granted (YTD)', value: stats.totalDays, icon: CalendarOffIcon, bg: 'bg-blue-50 border-blue-100',   cls: 'text-blue-600' },
        ].map(({ label, value, icon: Icon, bg, cls }) => (
          <div key={label} className={cn('flex items-center gap-4 rounded-xl border p-4', bg)}>
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm', cls)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Leave Policy Summary ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(Object.entries(leaveTypeConfig) as [LeaveType, typeof leaveTypeConfig[LeaveType]][]).map(([type, cfg]) => {
          const count = LEAVE_REQUESTS.filter(r => r.type === type && r.status === 'approved').length
          const Icon = cfg.icon
          return (
            <button
              key={type}
              type="button"
              onClick={() => setTypeF(typeF === type ? 'All' : type)}
              className={cn(
                'flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors hover:bg-muted/30',
                typeF === type && 'border-primary bg-primary/5',
              )}
            >
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg border', cfg.badge)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-sm font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
        {([['requests', 'Leave Requests'], ['balances', 'Leave Balances']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              tab === key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Requests ── */}
      {tab === 'requests' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-48">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee…" className="h-9 pl-9" />
            </div>
            <Select value={statusF} onValueChange={setStatusF}>
              <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['All', 'pending', 'approved', 'rejected', 'cancelled'].map(s => (
                  <SelectItem key={s} value={s}>{s === 'All' ? 'All statuses' : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-4 py-2.5">
              <p className="text-sm font-medium">{filtered.length} requests</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-b hover:bg-transparent">
                  <SortHead col="employee" label="Employee"     sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="px-4" />
                  <TableHead className="hidden md:table-cell px-2 py-3 text-xs font-medium text-muted-foreground">Department</TableHead>
                  <TableHead className="px-2 py-3 text-xs font-medium text-muted-foreground">Type</TableHead>
                  <SortHead col="from"     label="From"         sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="px-2" />
                  <TableHead className="hidden sm:table-cell px-2 py-3 text-xs font-medium text-muted-foreground">To</TableHead>
                  <SortHead col="days"     label="Days"         sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="px-2" />
                  <TableHead className="hidden lg:table-cell px-2 py-3 text-xs font-medium text-muted-foreground">Reason</TableHead>
                  <SortHead col="applied"  label="Applied"      sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="hidden md:table-cell px-2" />
                  <TableHead className="px-2 py-3 text-xs font-medium text-muted-foreground">Status</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-medium text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const typeCfg = leaveTypeConfig[r.type]
                  return (
                    <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3 px-4">
                        <p className="text-sm font-medium">{r.employee}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-2 text-sm text-muted-foreground">{r.department}</TableCell>
                      <TableCell className="px-2">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium', typeCfg.badge)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', typeCfg.dot)} />
                          {typeCfg.label}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 text-sm whitespace-nowrap">{r.from}</TableCell>
                      <TableCell className="hidden sm:table-cell px-2 text-sm whitespace-nowrap">{r.to}</TableCell>
                      <TableCell className="px-2 text-sm font-semibold">{r.days}d</TableCell>
                      <TableCell className="hidden lg:table-cell px-2 max-w-[160px]">
                        <p className="truncate text-xs text-muted-foreground">{r.reason}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-2 text-xs text-muted-foreground whitespace-nowrap">{r.applied_on}</TableCell>
                      <TableCell className="px-2">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium', statusBadge[r.status])}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', statusDot[r.status])} />
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4">
                        {r.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="default" className="h-7 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700">
                              <CheckCircle2Icon className="h-3 w-3" />
                              Approve
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                              <XCircleIcon className="h-3 w-3" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {r.status !== 'pending' && r.approved_by && (
                          <p className="text-xs text-muted-foreground">By {r.approved_by}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* ── Balances ── */}
      {tab === 'balances' && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-4 py-2.5">
            <p className="text-sm font-medium">{BALANCES.length} employees · Leave balances for FY 2025–26</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className="px-4 py-3 text-xs font-medium text-muted-foreground">Employee</TableHead>
                <TableHead className="px-2 py-3 text-xs font-medium text-muted-foreground">Sick leave</TableHead>
                <TableHead className="px-2 py-3 text-xs font-medium text-muted-foreground">Casual leave</TableHead>
                <TableHead className="px-2 py-3 text-xs font-medium text-muted-foreground">Annual leave</TableHead>
                <TableHead className="px-4 py-3 text-xs font-medium text-muted-foreground">Total remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {BALANCES.map(b => {
                const remaining = (b.sick.total - b.sick.used) + (b.casual.total - b.casual.used) + (b.annual.total - b.annual.used)
                const total = b.sick.total + b.casual.total + b.annual.total
                return (
                  <TableRow key={b.employee} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3 px-4 text-sm font-medium">{b.employee}</TableCell>
                    {[b.sick, b.casual, b.annual].map((bal, i) => {
                      const pct = (bal.used / bal.total) * 100
                      const rem = bal.total - bal.used
                      return (
                        <TableCell key={i} className="px-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-20">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-medium">{rem} left</span>
                                <span className="text-muted-foreground">{bal.used}/{bal.total}</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn('h-full rounded-full', pct > 75 ? 'bg-red-400' : pct > 50 ? 'bg-amber-400' : 'bg-emerald-400')}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      )
                    })}
                    <TableCell className="px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{remaining}</span>
                        <span className="text-xs text-muted-foreground">/ {total} days</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

    </div>
  )
}
