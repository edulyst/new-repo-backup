import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronsUpDownIcon,
  ClockIcon,
  DownloadIcon,
  SearchIcon,
  TrendingDownIcon,
  UserMinusIcon,
  UserXIcon,
  XCircleIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────
type AttendanceStatus = 'present' | 'absent' | 'late' | 'on-leave' | 'half-day'

type AttendanceRecord = {
  id: string
  employee: string
  department: string
  shift: string
  clock_in: string | null
  clock_out: string | null
  hours: number | null
  status: AttendanceStatus
  location: string
  overtime: number
}

type SortState = { col: string; dir: 'asc' | 'desc' | null }

// ─── Mock Data ───────────────────────────────────────────────
const TODAY = '2026-04-16'

const RECORDS: AttendanceRecord[] = [
  { id: 'a001', employee: 'Arjun Sharma',    department: 'Security',    shift: 'Morning (06:00–14:00)', clock_in: '06:02', clock_out: '14:05', hours: 8.0,  status: 'present',  location: 'Mumbai HQ',      overtime: 0 },
  { id: 'a002', employee: 'Priya Verma',     department: 'Hospitality', shift: 'Day (09:00–17:00)',     clock_in: '09:18', clock_out: '17:00', hours: 7.7,  status: 'late',     location: 'Delhi Central',  overtime: 0 },
  { id: 'a003', employee: 'Rahul Singh',     department: 'Events',      shift: 'Day (09:00–17:00)',     clock_in: null,    clock_out: null,    hours: null, status: 'absent',   location: 'Bangalore Expo', overtime: 0 },
  { id: 'a004', employee: 'Meera Nair',      department: 'Logistics',   shift: 'Night (22:00–06:00)',   clock_in: null,    clock_out: null,    hours: null, status: 'on-leave', location: 'Chennai Port',   overtime: 0 },
  { id: 'a005', employee: 'Vikram Patel',    department: 'Logistics',   shift: 'Day (09:00–17:00)',     clock_in: '08:55', clock_out: '18:30', hours: 9.5,  status: 'present',  location: 'Pune Depot',     overtime: 1.5 },
  { id: 'a006', employee: 'Sunita Kumari',   department: 'Facilities',  shift: 'Morning (06:00–14:00)', clock_in: '06:10', clock_out: '10:00', hours: 3.8,  status: 'half-day', location: 'Hyderabad IT',   overtime: 0 },
  { id: 'a007', employee: 'Deepak Raj',      department: 'Security',    shift: 'Evening (14:00–22:00)', clock_in: '13:58', clock_out: '22:02', hours: 8.1,  status: 'present',  location: 'Mumbai North',   overtime: 0 },
  { id: 'a008', employee: 'Anjali Gupta',    department: 'Hospitality', shift: 'Day (09:00–17:00)',     clock_in: null,    clock_out: null,    hours: null, status: 'absent',   location: 'Delhi South',    overtime: 0 },
  { id: 'a009', employee: 'Suresh Babu',     department: 'Maintenance', shift: 'Day (09:00–17:00)',     clock_in: '09:05', clock_out: '17:10', hours: 8.1,  status: 'present',  location: 'Chennai Tech',   overtime: 0 },
  { id: 'a010', employee: 'Kavya Reddy',     department: 'Events',      shift: 'Day (09:00–17:00)',     clock_in: '09:00', clock_out: '17:00', hours: 8.0,  status: 'present',  location: 'Hyderabad Conv', overtime: 0 },
  { id: 'a011', employee: 'Amit Joshi',      department: 'Hospitality', shift: 'Morning (06:00–14:00)', clock_in: '05:50', clock_out: '14:00', hours: 8.2,  status: 'present',  location: 'Pune Hotel',     overtime: 0.2 },
  { id: 'a012', employee: 'Ritu Singh',      department: 'Healthcare',  shift: 'Night (22:00–06:00)',   clock_in: '21:55', clock_out: '06:05', hours: 8.2,  status: 'present',  location: 'Bangalore Hosp', overtime: 0 },
  { id: 'a013', employee: 'Pooja Mehta',     department: 'Admin',       shift: 'Day (09:00–17:00)',     clock_in: '09:00', clock_out: '17:00', hours: 8.0,  status: 'present',  location: 'Delhi HQ',       overtime: 0 },
  { id: 'a014', employee: 'Sanjay Tiwari',   department: 'Maintenance', shift: 'Day (09:00–17:00)',     clock_in: '09:30', clock_out: null,    hours: null, status: 'late',     location: 'Jaipur Site',    overtime: 0 },
]

// Weekly attendance (last 7 days, Mon–Sun)
const WEEKLY = [
  { day: 'Mon', present: 248, absent: 22, late: 18 },
  { day: 'Tue', present: 261, absent: 15, late: 12 },
  { day: 'Wed', present: 255, absent: 19, late: 14 },
  { day: 'Thu', present: 270, absent: 11, late: 7 },
  { day: 'Fri', present: 263, absent: 17, late: 8 },
  { day: 'Sat', present: 198, absent: 32, late: 6 },
  { day: 'Sun', present: 142, absent: 28, late: 4 },
]

const statusBadge: Record<AttendanceStatus, string> = {
  present:    'border-emerald-200 bg-emerald-50 text-emerald-700',
  absent:     'border-red-200 bg-red-50 text-red-700',
  late:       'border-amber-200 bg-amber-50 text-amber-700',
  'on-leave': 'border-blue-200 bg-blue-50 text-blue-700',
  'half-day': 'border-purple-200 bg-purple-50 text-purple-700',
}
const statusDot: Record<AttendanceStatus, string> = {
  present:    'bg-emerald-500',
  absent:     'bg-red-500',
  late:       'bg-amber-400',
  'on-leave': 'bg-blue-500',
  'half-day': 'bg-purple-400',
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

export function HrmAttendancePage() {
  const [date, setDate]       = useState(TODAY)
  const [search, setSearch]   = useState('')
  const [statusF, setStatusF] = useState('All')
  const [deptF, setDeptF]     = useState('All')
  const [sort, setSort]       = useState<SortState>({ col: '', dir: null })

  const stats = useMemo(() => ({
    present:  RECORDS.filter(r => r.status === 'present').length,
    absent:   RECORDS.filter(r => r.status === 'absent').length,
    late:     RECORDS.filter(r => r.status === 'late').length,
    onLeave:  RECORDS.filter(r => r.status === 'on-leave').length,
    halfDay:  RECORDS.filter(r => r.status === 'half-day').length,
    totalHours: RECORDS.reduce((s, r) => s + (r.hours ?? 0), 0),
    overtime:   RECORDS.reduce((s, r) => s + r.overtime, 0),
  }), [])

  const attendancePct = Math.round((stats.present / RECORDS.length) * 100)

  const departments = ['All', ...Array.from(new Set(RECORDS.map(r => r.department))).sort()]

  const filtered = useMemo(() => {
    let rows = RECORDS
    if (search)          rows = rows.filter(r => r.employee.toLowerCase().includes(search.toLowerCase()) || r.department.toLowerCase().includes(search.toLowerCase()))
    if (statusF !== 'All') rows = rows.filter(r => r.status === statusF)
    if (deptF !== 'All')   rows = rows.filter(r => r.department === deptF)
    if (sort.col && sort.dir) {
      rows = [...rows].sort((a, b) => {
        let va: string | number = '', vb: string | number = ''
        if (sort.col === 'employee') { va = a.employee;     vb = b.employee }
        if (sort.col === 'dept')     { va = a.department;   vb = b.department }
        if (sort.col === 'in')       { va = a.clock_in ?? ''; vb = b.clock_in ?? '' }
        if (sort.col === 'hours')    { va = a.hours ?? 0;   vb = b.hours ?? 0 }
        if (sort.col === 'ot')       { va = a.overtime;     vb = b.overtime }
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [search, statusF, deptF, sort])

  const maxWeekly = Math.max(...WEEKLY.map(d => d.present + d.absent + d.late))

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">

      {/* ── Date bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-transparent text-sm font-medium outline-none"
          />
        </div>
        <span className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold',
          attendancePct >= 90 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700',
        )}>
          {attendancePct}% attendance rate
        </span>
        <Button variant="outline" size="sm" className="gap-1.5 ml-auto">
          <DownloadIcon className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: 'Present',   value: stats.present,  icon: CheckCircle2Icon,  cls: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Absent',    value: stats.absent,   icon: UserXIcon,         cls: 'text-red-600',     bg: 'bg-red-50 border-red-100' },
          { label: 'Late',      value: stats.late,     icon: AlertCircleIcon,   cls: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100' },
          { label: 'On Leave',  value: stats.onLeave,  icon: UserMinusIcon,     cls: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100' },
          { label: 'Half Day',  value: stats.halfDay,  icon: TrendingDownIcon,  cls: 'text-purple-600',  bg: 'bg-purple-50 border-purple-100' },
        ].map(({ label, value, icon: Icon, cls, bg }) => (
          <div key={label} className={cn('flex items-center gap-3 rounded-xl border p-4', bg)}>
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm', cls)}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Weekly Trend ── */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Weekly Attendance Trend</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Present</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" />Absent</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Late</span>
          </div>
        </div>
        <div className="flex items-end gap-2 h-28">
          {WEEKLY.map(d => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-col gap-0.5" style={{ height: '96px' }}>
                {[
                  { count: d.present, cls: 'bg-emerald-400' },
                  { count: d.absent,  cls: 'bg-red-400' },
                  { count: d.late,    cls: 'bg-amber-400' },
                ].map(({ count, cls }) => (
                  <div
                    key={cls}
                    className={cn('rounded-sm transition-all', cls)}
                    style={{ height: `${(count / maxWeekly) * 80}px` }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total hours logged', value: `${stats.totalHours.toFixed(1)}h`, icon: ClockIcon },
          { label: 'Overtime hours',     value: `${stats.overtime.toFixed(1)}h`,   icon: AlertCircleIcon },
          { label: 'On-time rate',       value: `${Math.round((stats.present / (stats.present + stats.late)) * 100)}%`, icon: CheckCircle2Icon },
          { label: 'Avg hours/employee', value: `${(stats.totalHours / stats.present).toFixed(1)}h`, icon: TrendingDownIcon },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-3">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="mt-1.5 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee or department…" className="h-9 pl-9" />
        </div>
        <Select value={deptF} onValueChange={setDeptF}>
          <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            {departments.map(d => <SelectItem key={d} value={d}>{d === 'All' ? 'All departments' : d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {(['All', 'present', 'absent', 'late', 'on-leave', 'half-day'] as const).map(s => (
              <SelectItem key={s} value={s}>{s === 'All' ? 'All statuses' : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p className="text-sm font-medium">{filtered.length} records for {date}</p>
          {stats.absent > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-red-600">
              <XCircleIcon className="h-3.5 w-3.5" />
              {stats.absent} absent today
            </span>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-b hover:bg-transparent">
              <SortHead col="employee" label="Employee"   sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="px-4" />
              <SortHead col="dept"     label="Department" sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="hidden md:table-cell px-2" />
              <TableHead className="hidden lg:table-cell px-2 py-3 text-xs font-medium text-muted-foreground">Shift</TableHead>
              <SortHead col="in"       label="Clock in"   sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="px-2" />
              <TableHead className="px-2 py-3 text-xs font-medium text-muted-foreground">Clock out</TableHead>
              <SortHead col="hours"    label="Hours"      sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="px-2" />
              <SortHead col="ot"       label="OT"         sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="hidden sm:table-cell px-2" />
              <TableHead className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  No records match the current filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map(r => (
              <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="py-3 px-4">
                  <p className="text-sm font-medium">{r.employee}</p>
                  <p className="text-xs text-muted-foreground">{r.location}</p>
                </TableCell>
                <TableCell className="hidden md:table-cell px-2 text-sm text-muted-foreground">{r.department}</TableCell>
                <TableCell className="hidden lg:table-cell px-2 text-xs text-muted-foreground">{r.shift}</TableCell>
                <TableCell className="px-2">
                  {r.clock_in ? (
                    <span className={cn('flex items-center gap-1 text-sm font-mono font-medium', r.status === 'late' && 'text-amber-600')}>
                      <ClockIcon className="h-3 w-3 text-muted-foreground" />
                      {r.clock_in}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="px-2">
                  {r.clock_out ? (
                    <span className="flex items-center gap-1 text-sm font-mono font-medium">
                      <ClockIcon className="h-3 w-3 text-muted-foreground" />
                      {r.clock_out}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="px-2">
                  {r.hours != null ? (
                    <span className="text-sm font-semibold">{r.hours.toFixed(1)}h</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell px-2">
                  {r.overtime > 0 ? (
                    <span className="text-sm font-medium text-orange-600">+{r.overtime}h</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="px-4">
                  <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium', statusBadge[r.status])}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', statusDot[r.status])} />
                    {r.status === 'on-leave' ? 'On leave' : r.status === 'half-day' ? 'Half day' : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

    </div>
  )
}
