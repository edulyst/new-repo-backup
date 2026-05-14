import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BriefcaseIcon,
  BuildingIcon,
  ChevronsUpDownIcon,
  DownloadIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
  TrendingUpIcon,
  UserCheckIcon,
  UserMinusIcon,
  UsersRoundIcon,
  UserXIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────
type EmploymentType = 'full-time' | 'part-time' | 'contractor' | 'gig'
type WorkerStatus   = 'active' | 'on-leave' | 'inactive' | 'terminated'

type Employee = {
  id: string
  name: string
  avatar?: string
  role: string
  department: string
  employment_type: EmploymentType
  location: string
  start_date: string
  status: WorkerStatus
  shifts_completed: number
  rating: number
}

type SortState = { col: string; dir: 'asc' | 'desc' | null }

// ─── Mock Data ───────────────────────────────────────────────
const EMPLOYEES: Employee[] = [
  { id: 'w001', name: 'Arjun Sharma',    role: 'Security Guard',      department: 'Security',    employment_type: 'full-time',  location: 'Mumbai',    start_date: '2024-01-15', status: 'active',     shifts_completed: 142, rating: 4.8 },
  { id: 'w002', name: 'Priya Verma',     role: 'Hospitality Staff',   department: 'Hospitality', employment_type: 'part-time',  location: 'Delhi',     start_date: '2024-03-20', status: 'active',     shifts_completed: 67,  rating: 4.6 },
  { id: 'w003', name: 'Rahul Singh',     role: 'Event Crew',          department: 'Events',      employment_type: 'gig',        location: 'Bangalore', start_date: '2024-05-10', status: 'active',     shifts_completed: 34,  rating: 4.2 },
  { id: 'w004', name: 'Meera Nair',      role: 'Warehouse Associate', department: 'Logistics',   employment_type: 'full-time',  location: 'Chennai',   start_date: '2023-11-01', status: 'on-leave',   shifts_completed: 198, rating: 4.9 },
  { id: 'w005', name: 'Vikram Patel',    role: 'Driver',              department: 'Logistics',   employment_type: 'contractor', location: 'Pune',      start_date: '2024-02-14', status: 'active',     shifts_completed: 89,  rating: 4.4 },
  { id: 'w006', name: 'Sunita Kumari',   role: 'Cleaning Staff',      department: 'Facilities',  employment_type: 'part-time',  location: 'Hyderabad', start_date: '2024-06-01', status: 'active',     shifts_completed: 45,  rating: 4.1 },
  { id: 'w007', name: 'Deepak Raj',      role: 'Security Guard',      department: 'Security',    employment_type: 'full-time',  location: 'Mumbai',    start_date: '2023-08-20', status: 'active',     shifts_completed: 267, rating: 4.7 },
  { id: 'w008', name: 'Anjali Gupta',    role: 'Receptionist',        department: 'Hospitality', employment_type: 'full-time',  location: 'Delhi',     start_date: '2024-01-08', status: 'inactive',   shifts_completed: 112, rating: 4.5 },
  { id: 'w009', name: 'Suresh Babu',     role: 'Electrician',         department: 'Maintenance', employment_type: 'contractor', location: 'Chennai',   start_date: '2024-04-15', status: 'active',     shifts_completed: 58,  rating: 4.3 },
  { id: 'w010', name: 'Kavya Reddy',     role: 'Event Coordinator',   department: 'Events',      employment_type: 'gig',        location: 'Hyderabad', start_date: '2024-07-22', status: 'active',     shifts_completed: 23,  rating: 4.0 },
  { id: 'w011', name: 'Amit Joshi',      role: 'Cook',                department: 'Hospitality', employment_type: 'full-time',  location: 'Pune',      start_date: '2023-12-10', status: 'active',     shifts_completed: 178, rating: 4.6 },
  { id: 'w012', name: 'Ritu Singh',      role: 'Nurse (Temp)',        department: 'Healthcare',  employment_type: 'contractor', location: 'Bangalore', start_date: '2024-08-01', status: 'active',     shifts_completed: 19,  rating: 4.9 },
  { id: 'w013', name: 'Manoj Kumar',     role: 'Warehouse Associate', department: 'Logistics',   employment_type: 'gig',        location: 'Mumbai',    start_date: '2024-09-05', status: 'terminated', shifts_completed: 8,   rating: 3.2 },
  { id: 'w014', name: 'Pooja Mehta',     role: 'HR Coordinator',      department: 'Admin',       employment_type: 'full-time',  location: 'Delhi',     start_date: '2023-06-01', status: 'active',     shifts_completed: 320, rating: 4.8 },
  { id: 'w015', name: 'Sanjay Tiwari',   role: 'Plumber',             department: 'Maintenance', employment_type: 'contractor', location: 'Jaipur',    start_date: '2024-03-10', status: 'active',     shifts_completed: 72,  rating: 4.2 },
]

const DEPARTMENTS = ['All', 'Security', 'Hospitality', 'Events', 'Logistics', 'Facilities', 'Maintenance', 'Healthcare', 'Admin']
const EMP_TYPES = ['All', 'full-time', 'part-time', 'contractor', 'gig']
const STATUSES = ['All', 'active', 'on-leave', 'inactive', 'terminated']

// ─── Config ──────────────────────────────────────────────────
const statusBadge: Record<WorkerStatus, string> = {
  active:     'border-emerald-200 bg-emerald-50 text-emerald-700',
  'on-leave': 'border-amber-200 bg-amber-50 text-amber-700',
  inactive:   'border-zinc-200 bg-zinc-50 text-zinc-600',
  terminated: 'border-red-200 bg-red-50 text-red-700',
}
const statusDot: Record<WorkerStatus, string> = {
  active:     'bg-emerald-500',
  'on-leave': 'bg-amber-400',
  inactive:   'bg-zinc-400',
  terminated: 'bg-red-500',
}
const empTypeBadge: Record<EmploymentType, string> = {
  'full-time':  'bg-blue-50 text-blue-700 border-blue-200',
  'part-time':  'bg-purple-50 text-purple-700 border-purple-200',
  contractor:   'bg-orange-50 text-orange-700 border-orange-200',
  gig:          'bg-pink-50 text-pink-700 border-pink-200',
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

function initials(name: string) {
  return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

// ─── Page ────────────────────────────────────────────────────
export function HrmWorkforcePage() {
  const [search, setSearch] = useState('')
  const [dept, setDept]     = useState('All')
  const [empType, setEmpType] = useState('All')
  const [status, setStatus]   = useState('All')
  const [sort, setSort]       = useState<SortState>({ col: '', dir: null })

  const stats = useMemo(() => ({
    total:      EMPLOYEES.length,
    active:     EMPLOYEES.filter(e => e.status === 'active').length,
    onLeave:    EMPLOYEES.filter(e => e.status === 'on-leave').length,
    terminated: EMPLOYEES.filter(e => e.status === 'terminated').length,
  }), [])

  const deptBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    EMPLOYEES.forEach(e => { map[e.department] = (map[e.department] ?? 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [])

  const filtered = useMemo(() => {
    let rows = EMPLOYEES
    if (search)           rows = rows.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase()))
    if (dept !== 'All')   rows = rows.filter(e => e.department === dept)
    if (empType !== 'All') rows = rows.filter(e => e.employment_type === empType)
    if (status !== 'All') rows = rows.filter(e => e.status === status)
    if (sort.col && sort.dir) {
      rows = [...rows].sort((a, b) => {
        let va: string | number = '', vb: string | number = ''
        if (sort.col === 'name')    { va = a.name;               vb = b.name }
        if (sort.col === 'dept')    { va = a.department;          vb = b.department }
        if (sort.col === 'type')    { va = a.employment_type;     vb = b.employment_type }
        if (sort.col === 'start')   { va = a.start_date;          vb = b.start_date }
        if (sort.col === 'shifts')  { va = a.shifts_completed;    vb = b.shifts_completed }
        if (sort.col === 'rating')  { va = a.rating;              vb = b.rating }
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [search, dept, empType, status, sort])

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Workforce', value: stats.total,      icon: UsersRoundIcon,  color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100' },
          { label: 'Active',          value: stats.active,     icon: UserCheckIcon,   color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'On Leave',        value: stats.onLeave,    icon: UserMinusIcon,   color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100' },
          { label: 'Terminated',      value: stats.terminated, icon: UserXIcon,       color: 'text-red-600',     bg: 'bg-red-50 border-red-100' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={cn('flex items-center gap-4 rounded-xl border p-4', bg)}>
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm', color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Department Breakdown ── */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <BuildingIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Department Breakdown</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {deptBreakdown.map(([name, count]) => (
            <button
              key={name}
              type="button"
              onClick={() => setDept(dept === name ? 'All' : name)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                dept === name
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted',
              )}
            >
              {name}
              <span className={cn(
                'flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                dept === name ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground',
              )}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or role…" className="h-9 pl-9" />
        </div>
        <Select value={empType} onValueChange={setEmpType}>
          <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {EMP_TYPES.map(t => <SelectItem key={t} value={t}>{t === 'All' ? 'All types' : t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s === 'All' ? 'All statuses' : s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1.5 ml-auto">
          <DownloadIcon className="h-3.5 w-3.5" />
          Export
        </Button>
        <Button size="sm" className="gap-1.5" asChild>
          <Link to="/workers/new">
            <PlusIcon className="h-4 w-4" />
            Add employee
          </Link>
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p className="text-sm font-medium">{filtered.length} employees</p>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">{stats.active} active right now</span>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-b hover:bg-transparent">
              <SortHead col="name"   label="Employee"         sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="px-4" />
              <SortHead col="dept"   label="Department"       sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="hidden md:table-cell px-2" />
              <SortHead col="type"   label="Employment type"  sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="hidden sm:table-cell px-2" />
              <TableHead className="hidden lg:table-cell px-2 py-3 text-xs font-medium text-muted-foreground">Location</TableHead>
              <SortHead col="start"  label="Start date"       sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="hidden md:table-cell px-2" />
              <SortHead col="shifts" label="Shifts"           sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="px-2" />
              <SortHead col="rating" label="Rating"           sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="px-2" />
              <TableHead className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  No employees match the current filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((e) => (
              <TableRow key={e.id} className="cursor-pointer hover:bg-muted/30 transition-colors">
                <TableCell className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold">
                      {initials(e.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{e.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{e.role}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell px-2">
                  <span className="inline-flex items-center gap-1 text-sm">
                    <BuildingIcon className="h-3 w-3 text-muted-foreground" />
                    {e.department}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell px-2">
                  <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', empTypeBadge[e.employment_type])}>
                    {e.employment_type}
                  </span>
                </TableCell>
                <TableCell className="hidden lg:table-cell px-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="h-3 w-3" />{e.location}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell px-2 text-sm text-muted-foreground whitespace-nowrap">{e.start_date}</TableCell>
                <TableCell className="px-2">
                  <div className="flex items-center gap-1 text-sm">
                    <BriefcaseIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{e.shifts_completed}</span>
                  </div>
                </TableCell>
                <TableCell className="px-2">
                  <div className="flex items-center gap-1 text-sm">
                    <span className="font-medium">{e.rating.toFixed(1)}</span>
                    <span className="text-amber-400">★</span>
                  </div>
                </TableCell>
                <TableCell className="px-4">
                  <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium', statusBadge[e.status])}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', statusDot[e.status])} />
                    {e.status === 'on-leave' ? 'On leave' : e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Workforce Mix ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {EMP_TYPES.slice(1).map(type => {
          const count = EMPLOYEES.filter(e => e.employment_type === type).length
          const pct   = Math.round((count / EMPLOYEES.length) * 100)
          return (
            <div key={type} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', empTypeBadge[type as EmploymentType])}>
                  {type}
                </span>
                <span className="text-2xl font-bold">{count}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{pct}% of workforce</p>
            </div>
          )
        })}
      </div>

      {/* ── Recent Hires ── */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Recent Hires</h3>
          <span className="ml-auto text-xs text-muted-foreground">Last 90 days</span>
        </div>
        <div className="divide-y">
          {EMPLOYEES
            .filter(e => new Date(e.start_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
            .sort((a, b) => b.start_date.localeCompare(a.start_date))
            .slice(0, 5)
            .map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold">
                  {initials(e.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.role} · {e.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-muted-foreground">{e.start_date}</p>
                  <span className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium', empTypeBadge[e.employment_type])}>
                    {e.employment_type}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

    </div>
  )
}
