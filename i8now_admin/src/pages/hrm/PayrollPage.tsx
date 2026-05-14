import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  ClockIcon,
  DownloadIcon,
  PercentIcon,
  PlayCircleIcon,
  ReceiptIcon,
  TrendingUpIcon,
  WalletIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────
type RunStatus = 'processed' | 'pending' | 'draft' | 'failed'

type PayRun = {
  id: string
  period: string
  period_label: string
  workers: number
  gross: number
  platform_fee: number
  tax: number
  net: number
  status: RunStatus
  processed_at: string | null
}

type Payslip = {
  id: string
  employee: string
  department: string
  shifts: number
  hours: number
  rate: number
  gross: number
  platform_fee: number
  tax: number
  net: number
  bank: string
  upi: string | null
}

type SortState = { col: string; dir: 'asc' | 'desc' | null }

const INR = '₹'

// ─── Mock Data ───────────────────────────────────────────────
const PAY_RUNS: PayRun[] = [
  { id: 'pr006', period: '2026-04', period_label: 'April 2026',    workers: 298, gross: 1245600, platform_fee: 99648,  tax: 18684, net: 1127268, status: 'pending',   processed_at: null },
  { id: 'pr005', period: '2026-03', period_label: 'March 2026',    workers: 284, gross: 1183400, platform_fee: 94672,  tax: 17751, net: 1070977, status: 'processed', processed_at: '2026-04-03' },
  { id: 'pr004', period: '2026-02', period_label: 'February 2026', workers: 271, gross: 1098200, platform_fee: 87856,  tax: 16473, net: 993871,  status: 'processed', processed_at: '2026-03-03' },
  { id: 'pr003', period: '2026-01', period_label: 'January 2026',  workers: 265, gross: 1074500, platform_fee: 85960,  tax: 16118, net: 972423,  status: 'processed', processed_at: '2026-02-03' },
  { id: 'pr002', period: '2025-12', period_label: 'December 2025', workers: 258, gross: 1089000, platform_fee: 87120,  tax: 16335, net: 985545,  status: 'processed', processed_at: '2026-01-04' },
  { id: 'pr001', period: '2025-11', period_label: 'November 2025', workers: 247, gross: 978500,  platform_fee: 78280,  tax: 14678, net: 885543,  status: 'processed', processed_at: '2025-12-04' },
]

const PAYSLIPS: Payslip[] = [
  { id: 'ps001', employee: 'Arjun Sharma',  department: 'Security',    shifts: 24, hours: 192, rate: 120, gross: 23040, platform_fee: 1843, tax: 346,  net: 20851, bank: 'HDFC •••• 4521', upi: 'arjun@upi' },
  { id: 'ps002', employee: 'Priya Verma',   department: 'Hospitality', shifts: 16, hours: 120, rate: 95,  gross: 11400, platform_fee: 912,  tax: 171,  net: 10317, bank: 'SBI •••• 7832',  upi: null },
  { id: 'ps003', employee: 'Vikram Patel',  department: 'Logistics',   shifts: 20, hours: 176, rate: 140, gross: 24640, platform_fee: 1971, tax: 370,  net: 22299, bank: 'ICICI •••• 2341', upi: 'vikramp@upi' },
  { id: 'ps004', employee: 'Deepak Raj',    department: 'Security',    shifts: 26, hours: 208, rate: 120, gross: 24960, platform_fee: 1997, tax: 374,  net: 22589, bank: 'HDFC •••• 9012',  upi: null },
  { id: 'ps005', employee: 'Amit Joshi',    department: 'Hospitality', shifts: 22, hours: 176, rate: 105, gross: 18480, platform_fee: 1478, tax: 277,  net: 16725, bank: 'Axis •••• 3345',  upi: 'amitj@upi' },
  { id: 'ps006', employee: 'Ritu Singh',    department: 'Healthcare',  shifts: 18, hours: 144, rate: 180, gross: 25920, platform_fee: 2074, tax: 389,  net: 23457, bank: 'SBI •••• 5511',   upi: 'ritumed@upi' },
  { id: 'ps007', employee: 'Pooja Mehta',   department: 'Admin',       shifts: 22, hours: 176, rate: 125, gross: 22000, platform_fee: 1760, tax: 330,  net: 19910, bank: 'Kotak •••• 8821', upi: null },
  { id: 'ps008', employee: 'Suresh Babu',   department: 'Maintenance', shifts: 18, hours: 144, rate: 110, gross: 15840, platform_fee: 1267, tax: 238,  net: 14335, bank: 'IOB •••• 4412',   upi: 'sureshb@upi' },
]

const statusBadge: Record<RunStatus, string> = {
  processed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending:   'border-amber-200 bg-amber-50 text-amber-700',
  draft:     'border-zinc-200 bg-zinc-50 text-zinc-600',
  failed:    'border-red-200 bg-red-50 text-red-700',
}
const statusDot: Record<RunStatus, string> = {
  processed: 'bg-emerald-500',
  pending:   'bg-amber-400',
  draft:     'bg-zinc-400',
  failed:    'bg-red-500',
}

function fmt(n: number) {
  return `${INR}${n.toLocaleString('en-IN')}`
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

export function HrmPayrollPage() {
  const [tab, setTab]         = useState<'runs' | 'payslips'>('runs')
  const [selectedRun, setSelectedRun] = useState<string | null>('pr006')
  const [sortRuns, setSortRuns]       = useState<SortState>({ col: '', dir: null })
  const [sortSlips, setSortSlips]     = useState<SortState>({ col: '', dir: null })
  const [periodFilter, setPeriodFilter] = useState('all')

  const currentRun = PAY_RUNS.find(r => r.id === selectedRun) ?? PAY_RUNS[0]

  const ytd = useMemo(() => ({
    gross: PAY_RUNS.filter(r => r.status === 'processed').reduce((s, r) => s + r.gross, 0),
    net:   PAY_RUNS.filter(r => r.status === 'processed').reduce((s, r) => s + r.net, 0),
    fee:   PAY_RUNS.filter(r => r.status === 'processed').reduce((s, r) => s + r.platform_fee, 0),
    tax:   PAY_RUNS.filter(r => r.status === 'processed').reduce((s, r) => s + r.tax, 0),
  }), [])

  const sortedRuns = useMemo(() => {
    const rows = [...PAY_RUNS]
    if (sortRuns.col && sortRuns.dir) {
      rows.sort((a, b) => {
        let va: string | number = '', vb: string | number = ''
        if (sortRuns.col === 'period')  { va = a.period;   vb = b.period }
        if (sortRuns.col === 'workers') { va = a.workers;  vb = b.workers }
        if (sortRuns.col === 'gross')   { va = a.gross;    vb = b.gross }
        if (sortRuns.col === 'net')     { va = a.net;      vb = b.net }
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
        return sortRuns.dir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [sortRuns])

  const sortedSlips = useMemo(() => {
    const rows = [...PAYSLIPS]
    if (sortSlips.col && sortSlips.dir) {
      rows.sort((a, b) => {
        let va: string | number = '', vb: string | number = ''
        if (sortSlips.col === 'employee') { va = a.employee; vb = b.employee }
        if (sortSlips.col === 'shifts')   { va = a.shifts;   vb = b.shifts }
        if (sortSlips.col === 'gross')    { va = a.gross;    vb = b.gross }
        if (sortSlips.col === 'net')      { va = a.net;      vb = b.net }
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
        return sortSlips.dir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [sortSlips])

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">

      {/* ── Current Period Card ── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Pay Period</p>
            <h2 className="mt-0.5 text-xl font-bold">{currentRun.period_label}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold', statusBadge[currentRun.status])}>
              <span className={cn('h-1.5 w-1.5 rounded-full', statusDot[currentRun.status])} />
              {currentRun.status.charAt(0).toUpperCase() + currentRun.status.slice(1)}
            </span>
            {currentRun.status === 'pending' && (
              <Button size="sm" className="gap-1.5">
                <PlayCircleIcon className="h-4 w-4" />
                Process payroll
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x sm:grid-cols-4">
          {[
            { label: 'Gross pay',      value: fmt(currentRun.gross),        icon: BanknoteIcon,      cls: 'text-blue-600' },
            { label: 'Platform fee',   value: fmt(currentRun.platform_fee), icon: PercentIcon,       cls: 'text-orange-600' },
            { label: 'Tax',            value: fmt(currentRun.tax),           icon: ReceiptIcon,       cls: 'text-purple-600' },
            { label: 'Net to workers', value: fmt(currentRun.net),           icon: WalletIcon,        cls: 'text-emerald-600' },
          ].map(({ label, value, icon: Icon, cls }) => (
            <div key={label} className="flex flex-col gap-1 p-4">
              <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground')}>
                <Icon className={cn('h-3.5 w-3.5', cls)} />
                {label}
              </div>
              <p className="text-xl font-bold">{value}</p>
            </div>
          ))}
        </div>
        <div className="border-t px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Covering <span className="font-medium text-foreground">{currentRun.workers} workers</span>
            {currentRun.processed_at && <> · Processed on <span className="font-medium text-foreground">{currentRun.processed_at}</span></>}
          </p>
        </div>
      </div>

      {/* ── YTD Summary ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'YTD Gross',    value: fmt(ytd.gross), icon: TrendingUpIcon,   bg: 'bg-blue-50 border-blue-100',    cls: 'text-blue-600' },
          { label: 'YTD Net paid', value: fmt(ytd.net),   icon: WalletIcon,       bg: 'bg-emerald-50 border-emerald-100', cls: 'text-emerald-600' },
          { label: 'Platform fees',value: fmt(ytd.fee),   icon: PercentIcon,      bg: 'bg-orange-50 border-orange-100', cls: 'text-orange-600' },
          { label: 'Tax deducted', value: fmt(ytd.tax),   icon: ReceiptIcon,      bg: 'bg-purple-50 border-purple-100', cls: 'text-purple-600' },
        ].map(({ label, value, icon: Icon, bg, cls }) => (
          <div key={label} className={cn('rounded-xl border p-4', bg)}>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className={cn('h-3.5 w-3.5', cls)} />
              {label}
            </div>
            <p className="mt-1.5 text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
        {([['runs', 'Pay Runs'], ['payslips', 'Payslips']] as const).map(([key, label]) => (
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

      {/* ── Pay Runs Table ── */}
      {tab === 'runs' && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <p className="text-sm font-medium">{PAY_RUNS.length} pay runs</p>
            <Button variant="outline" size="sm" className="gap-1.5">
              <DownloadIcon className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <SortHead col="period"  label="Period"       sort={sortRuns} onSort={c => setSortRuns(s => nextSort(s, c))} className="px-4" />
                <SortHead col="workers" label="Workers"      sort={sortRuns} onSort={c => setSortRuns(s => nextSort(s, c))} className="px-2" />
                <SortHead col="gross"   label="Gross pay"    sort={sortRuns} onSort={c => setSortRuns(s => nextSort(s, c))} className="px-2" />
                <TableHead className="hidden sm:table-cell px-2 py-3 text-xs font-medium text-muted-foreground">Platform fee</TableHead>
                <TableHead className="hidden md:table-cell px-2 py-3 text-xs font-medium text-muted-foreground">Tax</TableHead>
                <SortHead col="net"     label="Net payout"   sort={sortRuns} onSort={c => setSortRuns(s => nextSort(s, c))} className="px-2" />
                <TableHead className="px-2 py-3 text-xs font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="px-4 py-3 text-xs font-medium text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRuns.map(r => (
                <TableRow
                  key={r.id}
                  className={cn('hover:bg-muted/30 transition-colors cursor-pointer', selectedRun === r.id && 'bg-muted/20')}
                  onClick={() => setSelectedRun(r.id)}
                >
                  <TableCell className="py-3 px-4">
                    <p className="text-sm font-semibold">{r.period_label}</p>
                    {r.processed_at && <p className="text-xs text-muted-foreground">Processed {r.processed_at}</p>}
                  </TableCell>
                  <TableCell className="px-2 text-sm">{r.workers}</TableCell>
                  <TableCell className="px-2 text-sm font-semibold">{fmt(r.gross)}</TableCell>
                  <TableCell className="hidden sm:table-cell px-2 text-sm text-muted-foreground">{fmt(r.platform_fee)}</TableCell>
                  <TableCell className="hidden md:table-cell px-2 text-sm text-muted-foreground">{fmt(r.tax)}</TableCell>
                  <TableCell className="px-2 text-sm font-bold text-foreground">{fmt(r.net)}</TableCell>
                  <TableCell className="px-2">
                    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium', statusBadge[r.status])}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', statusDot[r.status])} />
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {r.status === 'pending' && (
                        <Button size="sm" variant="default" className="h-7 gap-1 text-xs">
                          <PlayCircleIcon className="h-3 w-3" />
                          Run
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground">
                        <DownloadIcon className="h-3 w-3" />
                        PDF
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Payslips Table ── */}
      {tab === 'payslips' && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <p className="text-sm font-medium">{PAYSLIPS.length} payslips · {currentRun.period_label}</p>
            <Button variant="outline" size="sm" className="gap-1.5">
              <DownloadIcon className="h-3.5 w-3.5" />
              Bulk export
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <SortHead col="employee" label="Employee"    sort={sortSlips} onSort={c => setSortSlips(s => nextSort(s, c))} className="px-4" />
                <TableHead className="hidden md:table-cell px-2 py-3 text-xs font-medium text-muted-foreground">Department</TableHead>
                <SortHead col="shifts"   label="Shifts"     sort={sortSlips} onSort={c => setSortSlips(s => nextSort(s, c))} className="px-2" />
                <TableHead className="hidden sm:table-cell px-2 py-3 text-xs font-medium text-muted-foreground">Hours</TableHead>
                <TableHead className="hidden sm:table-cell px-2 py-3 text-xs font-medium text-muted-foreground">Rate/hr</TableHead>
                <SortHead col="gross"    label="Gross"      sort={sortSlips} onSort={c => setSortSlips(s => nextSort(s, c))} className="px-2" />
                <TableHead className="hidden lg:table-cell px-2 py-3 text-xs font-medium text-muted-foreground">Deductions</TableHead>
                <SortHead col="net"      label="Net pay"    sort={sortSlips} onSort={c => setSortSlips(s => nextSort(s, c))} className="px-2 font-semibold" />
                <TableHead className="hidden md:table-cell px-2 py-3 text-xs font-medium text-muted-foreground">Payment</TableHead>
                <TableHead className="px-4 py-3 text-xs font-medium text-muted-foreground" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSlips.map(p => (
                <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="py-3 px-4">
                    <p className="text-sm font-medium">{p.employee}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.bank}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell px-2 text-sm text-muted-foreground">{p.department}</TableCell>
                  <TableCell className="px-2 text-sm">{p.shifts}</TableCell>
                  <TableCell className="hidden sm:table-cell px-2 text-sm text-muted-foreground">{p.hours}h</TableCell>
                  <TableCell className="hidden sm:table-cell px-2 text-sm text-muted-foreground">{INR}{p.rate}</TableCell>
                  <TableCell className="px-2 text-sm font-medium">{fmt(p.gross)}</TableCell>
                  <TableCell className="hidden lg:table-cell px-2 text-sm text-muted-foreground">{fmt(p.platform_fee + p.tax)}</TableCell>
                  <TableCell className="px-2 text-sm font-bold text-emerald-700">{fmt(p.net)}</TableCell>
                  <TableCell className="hidden md:table-cell px-2">
                    {p.upi ? (
                      <span className="text-xs text-muted-foreground">{p.upi}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Bank transfer</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4">
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground">
                      <DownloadIcon className="h-3 w-3" />
                      Slip
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Payroll Cost Breakdown ── */}
      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-4 text-sm font-semibold">6-Month Payroll Trend</h3>
        <div className="flex items-end gap-2 h-24">
          {PAY_RUNS.slice().reverse().map(r => {
            const maxNet = Math.max(...PAY_RUNS.map(p => p.net))
            const pct = (r.net / maxNet) * 100
            return (
              <div key={r.id} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-col items-center justify-end h-16 gap-0.5">
                  <div
                    className={cn('w-full rounded-t-sm transition-all', r.status === 'pending' ? 'bg-amber-300' : 'bg-primary/80')}
                    style={{ height: `${pct}%` }}
                    title={`${r.period_label}: ${fmt(r.net)}`}
                  />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{r.period.slice(5)}</span>
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary/80" />Processed</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-300" />Pending</span>
        </div>
      </div>

    </div>
  )
}
