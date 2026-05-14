import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BriefcaseIcon,
  ChevronsUpDownIcon,
  ExternalLinkIcon,
  MedalIcon,
  MessageSquareIcon,
  SearchIcon,
  StarIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UserRoundIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────
type PerfTrend = 'up' | 'down' | 'stable'
type PerfTier  = 'top' | 'good' | 'average' | 'needs-improvement'

type PerformanceRecord = {
  id: string
  employee: string
  department: string
  role: string
  shifts_completed: number
  shifts_target: number
  avg_rating: number
  total_reviews: number
  on_time_pct: number
  completion_rate: number
  trend: PerfTrend
  tier: PerfTier
  last_review: string
}

type SortState = { col: string; dir: 'asc' | 'desc' | null }

// ─── Mock Data ───────────────────────────────────────────────
const RECORDS: PerformanceRecord[] = [
  { id: 'w001', employee: 'Arjun Sharma',   department: 'Security',    role: 'Security Guard',      shifts_completed: 142, shifts_target: 140, avg_rating: 4.8, total_reviews: 38, on_time_pct: 98, completion_rate: 100, trend: 'up',     tier: 'top' },
  { id: 'w007', employee: 'Deepak Raj',     department: 'Security',    role: 'Security Guard',      shifts_completed: 267, shifts_target: 260, avg_rating: 4.7, total_reviews: 72, on_time_pct: 97, completion_rate: 99,  trend: 'stable', tier: 'top' },
  { id: 'w012', employee: 'Ritu Singh',     department: 'Healthcare',  role: 'Nurse (Temp)',        shifts_completed: 19,  shifts_target: 18,  avg_rating: 4.9, total_reviews: 14, on_time_pct: 100,completion_rate: 100, trend: 'up',     tier: 'top' },
  { id: 'w004', employee: 'Meera Nair',     department: 'Logistics',   role: 'Warehouse Associate', shifts_completed: 198, shifts_target: 200, avg_rating: 4.9, total_reviews: 54, on_time_pct: 96, completion_rate: 98,  trend: 'up',     tier: 'top' },
  { id: 'w014', employee: 'Pooja Mehta',    department: 'Admin',       role: 'HR Coordinator',      shifts_completed: 320, shifts_target: 310, avg_rating: 4.8, total_reviews: 85, on_time_pct: 99, completion_rate: 100, trend: 'stable', tier: 'top' },
  { id: 'w011', employee: 'Amit Joshi',     department: 'Hospitality', role: 'Cook',                shifts_completed: 178, shifts_target: 175, avg_rating: 4.6, total_reviews: 47, on_time_pct: 95, completion_rate: 97,  trend: 'up',     tier: 'good' },
  { id: 'w005', employee: 'Vikram Patel',   department: 'Logistics',   role: 'Driver',              shifts_completed: 89,  shifts_target: 90,  avg_rating: 4.4, total_reviews: 26, on_time_pct: 93, completion_rate: 96,  trend: 'stable', tier: 'good' },
  { id: 'w002', employee: 'Priya Verma',    department: 'Hospitality', role: 'Hospitality Staff',   shifts_completed: 67,  shifts_target: 70,  avg_rating: 4.6, total_reviews: 20, on_time_pct: 91, completion_rate: 95,  trend: 'stable', tier: 'good' },
  { id: 'w008', employee: 'Anjali Gupta',   department: 'Hospitality', role: 'Receptionist',        shifts_completed: 112, shifts_target: 110, avg_rating: 4.5, total_reviews: 31, on_time_pct: 94, completion_rate: 96,  trend: 'down',   tier: 'good' },
  { id: 'w009', employee: 'Suresh Babu',    department: 'Maintenance', role: 'Electrician',         shifts_completed: 58,  shifts_target: 60,  avg_rating: 4.3, total_reviews: 18, on_time_pct: 90, completion_rate: 93,  trend: 'stable', tier: 'average' },
  { id: 'w015', employee: 'Sanjay Tiwari',  department: 'Maintenance', role: 'Plumber',             shifts_completed: 72,  shifts_target: 75,  avg_rating: 4.2, total_reviews: 22, on_time_pct: 88, completion_rate: 91,  trend: 'stable', tier: 'average' },
  { id: 'w003', employee: 'Rahul Singh',    department: 'Events',      role: 'Event Crew',          shifts_completed: 34,  shifts_target: 40,  avg_rating: 4.2, total_reviews: 10, on_time_pct: 85, completion_rate: 88,  trend: 'down',   tier: 'average' },
  { id: 'w006', employee: 'Sunita Kumari',  department: 'Facilities',  role: 'Cleaning Staff',      shifts_completed: 45,  shifts_target: 50,  avg_rating: 4.1, total_reviews: 13, on_time_pct: 87, completion_rate: 89,  trend: 'stable', tier: 'average' },
  { id: 'w010', employee: 'Kavya Reddy',    department: 'Events',      role: 'Event Coordinator',   shifts_completed: 23,  shifts_target: 30,  avg_rating: 4.0, total_reviews: 7,  on_time_pct: 83, completion_rate: 83,  trend: 'down',   tier: 'needs-improvement' },
  { id: 'w013', employee: 'Manoj Kumar',    department: 'Logistics',   role: 'Warehouse Associate', shifts_completed: 8,   shifts_target: 20,  avg_rating: 3.2, total_reviews: 5,  on_time_pct: 65, completion_rate: 55,  trend: 'down',   tier: 'needs-improvement' },
].map((r, i) => ({ ...r, last_review: `2026-0${Math.max(1, 4 - (i % 3))}-${10 + i}` }))

const tierConfig: Record<PerfTier, { label: string; badge: string; dot: string; bg: string }> = {
  top:                 { label: 'Top performer',      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', bg: 'bg-emerald-50' },
  good:                { label: 'Good',               badge: 'border-blue-200 bg-blue-50 text-blue-700',         dot: 'bg-blue-400',    bg: 'bg-blue-50' },
  average:             { label: 'Average',            badge: 'border-amber-200 bg-amber-50 text-amber-700',      dot: 'bg-amber-400',   bg: 'bg-amber-50' },
  'needs-improvement': { label: 'Needs improvement', badge: 'border-red-200 bg-red-50 text-red-700',            dot: 'bg-red-400',     bg: 'bg-red-50' },
}

function StarRating({ rating, total }: { rating: number; total: number }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon
            key={i}
            className={cn(
              'h-3.5 w-3.5',
              i < full ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted',
            )}
          />
        ))}
      </div>
      <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({total})</span>
    </div>
  )
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

export function HrmPerformancePage() {
  const [tierF, setTierF]   = useState('All')
  const [search, setSearch] = useState('')
  const [sort, setSort]     = useState<SortState>({ col: 'rating', dir: 'desc' })

  const stats = useMemo(() => ({
    avgRating:     (RECORDS.reduce((s, r) => s + r.avg_rating, 0) / RECORDS.length).toFixed(2),
    top:           RECORDS.filter(r => r.tier === 'top').length,
    needsHelp:     RECORDS.filter(r => r.tier === 'needs-improvement').length,
    avgCompletion: Math.round(RECORDS.reduce((s, r) => s + r.completion_rate, 0) / RECORDS.length),
  }), [])

  const filtered = useMemo(() => {
    let rows = RECORDS
    if (search)          rows = rows.filter(r => r.employee.toLowerCase().includes(search.toLowerCase()) || r.role.toLowerCase().includes(search.toLowerCase()))
    if (tierF !== 'All') rows = rows.filter(r => r.tier === tierF)
    if (sort.col && sort.dir) {
      rows = [...rows].sort((a, b) => {
        let va: string | number = '', vb: string | number = ''
        if (sort.col === 'employee')    { va = a.employee;         vb = b.employee }
        if (sort.col === 'rating')      { va = a.avg_rating;       vb = b.avg_rating }
        if (sort.col === 'shifts')      { va = a.shifts_completed; vb = b.shifts_completed }
        if (sort.col === 'completion')  { va = a.completion_rate;  vb = b.completion_rate }
        if (sort.col === 'ontime')      { va = a.on_time_pct;      vb = b.on_time_pct }
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [search, tierF, sort])

  const ratingDist = useMemo(() => {
    const bins = [5, 4, 3, 2, 1]
    return bins.map(star => ({
      star,
      count: RECORDS.filter(r => Math.floor(r.avg_rating) === star).length,
    }))
  }, [])

  const topFive = useMemo(() => RECORDS.filter(r => r.tier === 'top').sort((a, b) => b.avg_rating - a.avg_rating).slice(0, 5), [])

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Avg platform rating', value: stats.avgRating, icon: StarIcon,       bg: 'bg-amber-50 border-amber-100',   cls: 'text-amber-600' },
          { label: 'Top performers',      value: stats.top,       icon: MedalIcon,      bg: 'bg-emerald-50 border-emerald-100', cls: 'text-emerald-600' },
          { label: 'Needs improvement',   value: stats.needsHelp, icon: TrendingDownIcon, bg: 'bg-red-50 border-red-100',    cls: 'text-red-600' },
          { label: 'Avg completion rate', value: `${stats.avgCompletion}%`, icon: BriefcaseIcon, bg: 'bg-blue-50 border-blue-100', cls: 'text-blue-600' },
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

      <div className="grid gap-4 lg:grid-cols-2">

        {/* ── Top Performers Leaderboard ── */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <MedalIcon className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Top Performers</h3>
          </div>
          <div className="divide-y">
            {topFive.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-zinc-100 text-zinc-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground',
                )}>
                  #{i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.employee}</p>
                  <p className="text-xs text-muted-foreground">{r.role}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <StarIcon className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-bold">{r.avg_rating.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.shifts_completed} shifts</p>
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* ── Rating Distribution ── */}
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-4 text-sm font-semibold">Rating Distribution</h3>
          <div className="space-y-3">
            {ratingDist.map(({ star, count }) => {
              const pct = Math.round((count / RECORDS.length) * 100)
              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex w-12 items-center gap-0.5 justify-end">
                    <span className="text-sm font-medium">{star}</span>
                    <StarIcon className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="flex-1 overflow-hidden rounded-full bg-muted h-2">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-xs text-muted-foreground text-right">{count}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
            <StarIcon className="h-4 w-4 fill-amber-400 text-amber-400" />
            <div>
              <p className="text-sm font-bold">{stats.avgRating} platform average</p>
              <p className="text-xs text-muted-foreground">Based on {RECORDS.reduce((s, r) => s + r.total_reviews, 0)} employer reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tier Filter Tabs ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
          {['All', 'top', 'good', 'average', 'needs-improvement'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTierF(t)}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                tierF === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'All' ? 'All' : tierConfig[t as PerfTier].label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-48">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee or role…" className="h-9 pl-9" />
        </div>
      </div>

      {/* ── Performance Table ── */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-2.5">
          <p className="text-sm font-medium">{filtered.length} employees</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-b hover:bg-transparent">
              <SortHead col="employee"   label="Employee"        sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="px-4" />
              <TableHead className="hidden md:table-cell px-2 py-3 text-xs font-medium text-muted-foreground">Department</TableHead>
              <SortHead col="shifts"     label="Shifts"          sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="px-2" />
              <SortHead col="completion" label="Completion"      sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="hidden sm:table-cell px-2" />
              <SortHead col="ontime"     label="On-time"         sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="hidden lg:table-cell px-2" />
              <SortHead col="rating"     label="Rating"          sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="px-2" />
              <TableHead className="px-2 py-3 text-xs font-medium text-muted-foreground">Trend</TableHead>
              <TableHead className="px-4 py-3 text-xs font-medium text-muted-foreground">Tier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(r => {
              const tc = tierConfig[r.tier]
              return (
                <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold">
                        {r.employee.split(' ').map(p => p[0]).join('').slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{r.employee}</p>
                        <p className="text-xs text-muted-foreground">{r.role}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell px-2 text-sm text-muted-foreground">{r.department}</TableCell>
                  <TableCell className="px-2">
                    <div className="text-sm">
                      <span className="font-semibold">{r.shifts_completed}</span>
                      <span className="text-muted-foreground"> / {r.shifts_target}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell px-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-16 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-full rounded-full', r.completion_rate >= 95 ? 'bg-emerald-500' : r.completion_rate >= 85 ? 'bg-amber-400' : 'bg-red-400')}
                          style={{ width: `${r.completion_rate}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{r.completion_rate}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell px-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-16 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-full rounded-full', r.on_time_pct >= 95 ? 'bg-emerald-500' : r.on_time_pct >= 85 ? 'bg-amber-400' : 'bg-red-400')}
                          style={{ width: `${r.on_time_pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{r.on_time_pct}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-2">
                    <StarRating rating={r.avg_rating} total={r.total_reviews} />
                  </TableCell>
                  <TableCell className="px-2">
                    {r.trend === 'up'   && <TrendingUpIcon className="h-4 w-4 text-emerald-500" />}
                    {r.trend === 'down' && <TrendingDownIcon className="h-4 w-4 text-red-500" />}
                    {r.trend === 'stable' && <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="px-4">
                    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium', tc.badge)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', tc.dot)} />
                      {tc.label}
                    </span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

    </div>
  )
}

