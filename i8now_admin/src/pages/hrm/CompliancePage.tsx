import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BadgeCheckIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  ClockIcon,
  FileTextIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ShieldXIcon,
  XCircleIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────
type KycStatus = 'approved' | 'pending' | 'rejected' | 'unverified'
type DocStatus = 'valid' | 'expired' | 'expiring-soon' | 'missing' | 'pending'

type DocRecord = {
  type: string
  status: DocStatus
  uploaded: string | null
  expiry: string | null
}

type ComplianceRecord = {
  id: string
  employee: string
  department: string
  role: string
  kyc_status: KycStatus
  kyc_updated: string | null
  right_to_work: DocStatus
  background_check: DocStatus
  govt_id: DocStatus
  certification: DocStatus
  overall_score: number
  alerts: number
}

type SortState = { col: string; dir: 'asc' | 'desc' | null }

// ─── Mock Data ───────────────────────────────────────────────
const RECORDS: ComplianceRecord[] = [
  { id: 'w001', employee: 'Arjun Sharma',   department: 'Security',    role: 'Security Guard',      kyc_status: 'approved',    kyc_updated: '2024-01-20', right_to_work: 'valid',          background_check: 'valid',    govt_id: 'valid',          certification: 'valid',         overall_score: 100, alerts: 0 },
  { id: 'w002', employee: 'Priya Verma',    department: 'Hospitality', role: 'Hospitality Staff',   kyc_status: 'approved',    kyc_updated: '2024-03-25', right_to_work: 'valid',          background_check: 'valid',    govt_id: 'valid',          certification: 'expiring-soon', overall_score: 85,  alerts: 1 },
  { id: 'w003', employee: 'Rahul Singh',    department: 'Events',      role: 'Event Crew',          kyc_status: 'pending',     kyc_updated: '2024-05-15', right_to_work: 'pending',        background_check: 'missing',  govt_id: 'pending',        certification: 'missing',       overall_score: 35,  alerts: 3 },
  { id: 'w004', employee: 'Meera Nair',     department: 'Logistics',   role: 'Warehouse Associate', kyc_status: 'approved',    kyc_updated: '2023-11-10', right_to_work: 'valid',          background_check: 'valid',    govt_id: 'valid',          certification: 'valid',         overall_score: 100, alerts: 0 },
  { id: 'w005', employee: 'Vikram Patel',   department: 'Logistics',   role: 'Driver',              kyc_status: 'approved',    kyc_updated: '2024-02-20', right_to_work: 'valid',          background_check: 'valid',    govt_id: 'valid',          certification: 'expiring-soon', overall_score: 88,  alerts: 1 },
  { id: 'w006', employee: 'Sunita Kumari',  department: 'Facilities',  role: 'Cleaning Staff',      kyc_status: 'approved',    kyc_updated: '2024-06-10', right_to_work: 'valid',          background_check: 'pending',  govt_id: 'valid',          certification: 'missing',       overall_score: 65,  alerts: 2 },
  { id: 'w007', employee: 'Deepak Raj',     department: 'Security',    role: 'Security Guard',      kyc_status: 'approved',    kyc_updated: '2023-08-25', right_to_work: 'valid',          background_check: 'valid',    govt_id: 'valid',          certification: 'valid',         overall_score: 100, alerts: 0 },
  { id: 'w008', employee: 'Anjali Gupta',   department: 'Hospitality', role: 'Receptionist',        kyc_status: 'approved',    kyc_updated: '2024-01-15', right_to_work: 'expiring-soon',  background_check: 'valid',    govt_id: 'valid',          certification: 'valid',         overall_score: 80,  alerts: 1 },
  { id: 'w009', employee: 'Suresh Babu',    department: 'Maintenance', role: 'Electrician',         kyc_status: 'approved',    kyc_updated: '2024-04-20', right_to_work: 'valid',          background_check: 'valid',    govt_id: 'valid',          certification: 'expiring-soon', overall_score: 85,  alerts: 1 },
  { id: 'w010', employee: 'Kavya Reddy',    department: 'Events',      role: 'Event Coordinator',   kyc_status: 'pending',     kyc_updated: '2024-07-28', right_to_work: 'pending',        background_check: 'missing',  govt_id: 'pending',        certification: 'missing',       overall_score: 30,  alerts: 4 },
  { id: 'w011', employee: 'Amit Joshi',     department: 'Hospitality', role: 'Cook',                kyc_status: 'approved',    kyc_updated: '2023-12-15', right_to_work: 'valid',          background_check: 'valid',    govt_id: 'valid',          certification: 'expired',       overall_score: 75,  alerts: 1 },
  { id: 'w012', employee: 'Ritu Singh',     department: 'Healthcare',  role: 'Nurse (Temp)',        kyc_status: 'approved',    kyc_updated: '2024-08-05', right_to_work: 'valid',          background_check: 'valid',    govt_id: 'valid',          certification: 'valid',         overall_score: 100, alerts: 0 },
  { id: 'w013', employee: 'Manoj Kumar',    department: 'Logistics',   role: 'Warehouse Associate', kyc_status: 'rejected',    kyc_updated: '2024-09-10', right_to_work: 'missing',        background_check: 'rejected', govt_id: 'missing',        certification: 'missing',       overall_score: 0,   alerts: 5 },
  { id: 'w014', employee: 'Pooja Mehta',    department: 'Admin',       role: 'HR Coordinator',      kyc_status: 'approved',    kyc_updated: '2023-06-05', right_to_work: 'valid',          background_check: 'valid',    govt_id: 'valid',          certification: 'valid',         overall_score: 100, alerts: 0 },
  { id: 'w015', employee: 'Sanjay Tiwari',  department: 'Maintenance', role: 'Plumber',             kyc_status: 'approved',    kyc_updated: '2024-03-15', right_to_work: 'valid',          background_check: 'valid',    govt_id: 'valid',          certification: 'missing',       overall_score: 78,  alerts: 1 },
]

const kycConfig: Record<KycStatus, { label: string; badge: string; dot: string; icon: React.ElementType }> = {
  approved:   { label: 'Approved',    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', icon: BadgeCheckIcon },
  pending:    { label: 'Pending',     badge: 'border-amber-200 bg-amber-50 text-amber-700',       dot: 'bg-amber-400',   icon: ClockIcon },
  rejected:   { label: 'Rejected',    badge: 'border-red-200 bg-red-50 text-red-700',             dot: 'bg-red-500',     icon: XCircleIcon },
  unverified: { label: 'Unverified',  badge: 'border-zinc-200 bg-zinc-50 text-zinc-600',          dot: 'bg-zinc-400',    icon: ShieldXIcon },
}

const docConfig: Record<DocStatus, { label: string; cls: string; dot: string }> = {
  valid:           { label: '✓ Valid',         cls: 'text-emerald-600', dot: 'bg-emerald-500' },
  expired:         { label: '✗ Expired',       cls: 'text-red-600',     dot: 'bg-red-500' },
  'expiring-soon': { label: '⚠ Expiring soon', cls: 'text-amber-600',   dot: 'bg-amber-400' },
  missing:         { label: '— Missing',       cls: 'text-zinc-400',    dot: 'bg-zinc-300' },
  pending:         { label: '◷ Pending',       cls: 'text-blue-600',    dot: 'bg-blue-400' },
  rejected:        { label: '✗ Rejected',      cls: 'text-red-600',     dot: 'bg-red-500' },
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-16 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', score >= 90 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-400' : score >= 40 ? 'bg-orange-500' : 'bg-red-500')}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn('text-xs font-semibold min-w-8', score >= 90 ? 'text-emerald-700' : score >= 70 ? 'text-amber-700' : 'text-red-700')}>
        {score}%
      </span>
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

export function HrmCompliancePage() {
  const [kycF, setKycF]     = useState('All')
  const [search, setSearch] = useState('')
  const [sort, setSort]     = useState<SortState>({ col: 'score', dir: 'asc' })

  const stats = useMemo(() => ({
    approved:    RECORDS.filter(r => r.kyc_status === 'approved').length,
    pending:     RECORDS.filter(r => r.kyc_status === 'pending').length,
    rejected:    RECORDS.filter(r => r.kyc_status === 'rejected').length,
    unverified:  RECORDS.filter(r => r.kyc_status === 'unverified').length,
    alerts:      RECORDS.reduce((s, r) => s + r.alerts, 0),
    fullCompliant: RECORDS.filter(r => r.overall_score === 100).length,
  }), [])

  const totalAlerts = useMemo(() => {
    const items: Array<{ employee: string; issue: string; severity: 'high' | 'medium' | 'low' }> = []
    RECORDS.forEach(r => {
      if (r.kyc_status === 'rejected') items.push({ employee: r.employee, issue: 'KYC rejected — needs re-submission', severity: 'high' })
      if (r.kyc_status === 'pending')  items.push({ employee: r.employee, issue: 'KYC pending review', severity: 'medium' })
      if (r.background_check === 'missing' || r.background_check === 'rejected') items.push({ employee: r.employee, issue: 'Background check missing or rejected', severity: 'high' })
      if (r.right_to_work === 'expiring-soon') items.push({ employee: r.employee, issue: 'Right to work document expiring soon', severity: 'medium' })
      if (r.certification === 'expired') items.push({ employee: r.employee, issue: 'Professional certification expired', severity: 'high' })
      if (r.certification === 'expiring-soon') items.push({ employee: r.employee, issue: 'Certification expiring within 30 days', severity: 'low' })
    })
    return items.sort((a, b) => (a.severity === 'high' ? -1 : 1))
  }, [])

  const filtered = useMemo(() => {
    let rows = RECORDS
    if (search)          rows = rows.filter(r => r.employee.toLowerCase().includes(search.toLowerCase()) || r.department.toLowerCase().includes(search.toLowerCase()))
    if (kycF !== 'All')  rows = rows.filter(r => r.kyc_status === kycF)
    if (sort.col && sort.dir) {
      rows = [...rows].sort((a, b) => {
        let va: string | number = '', vb: string | number = ''
        if (sort.col === 'employee') { va = a.employee;       vb = b.employee }
        if (sort.col === 'kyc')      { va = a.kyc_status;     vb = b.kyc_status }
        if (sort.col === 'score')    { va = a.overall_score;  vb = b.overall_score }
        if (sort.col === 'alerts')   { va = a.alerts;         vb = b.alerts }
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [search, kycF, sort])

  const severityBadge = { high: 'border-red-200 bg-red-50 text-red-700', medium: 'border-amber-200 bg-amber-50 text-amber-700', low: 'border-zinc-200 bg-zinc-50 text-zinc-600' }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Fully compliant', value: stats.fullCompliant, icon: ShieldCheckIcon, bg: 'bg-emerald-50 border-emerald-100', cls: 'text-emerald-600' },
          { label: 'KYC approved',    value: stats.approved,      icon: BadgeCheckIcon,  bg: 'bg-emerald-50 border-emerald-100', cls: 'text-emerald-600' },
          { label: 'KYC pending',     value: stats.pending,       icon: ClockIcon,       bg: 'bg-amber-50 border-amber-100',   cls: 'text-amber-600' },
          { label: 'KYC rejected',    value: stats.rejected,      icon: XCircleIcon,     bg: 'bg-red-50 border-red-100',       cls: 'text-red-600' },
          { label: 'Unverified',      value: stats.unverified,    icon: ShieldXIcon,     bg: 'bg-zinc-50 border-zinc-200',     cls: 'text-zinc-500' },
          { label: 'Active alerts',   value: stats.alerts,        icon: ShieldAlertIcon, bg: 'bg-orange-50 border-orange-100', cls: 'text-orange-600' },
        ].map(({ label, value, icon: Icon, bg, cls }) => (
          <div key={label} className={cn('flex flex-col gap-1.5 rounded-xl border p-4', bg)}>
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm', cls)}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Active Alerts ── */}
      {totalAlerts.length > 0 && (
        <div className="rounded-xl border border-red-100 bg-red-50/40">
          <div className="flex items-center gap-2 border-b border-red-100 px-4 py-3">
            <AlertTriangleIcon className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold text-red-800">Compliance Alerts</h3>
            <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {totalAlerts.length}
            </span>
          </div>
          <div className="divide-y divide-red-100">
            {totalAlerts.slice(0, 6).map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className={cn('h-1.5 w-1.5 rounded-full shrink-0', a.severity === 'high' ? 'bg-red-500' : a.severity === 'medium' ? 'bg-amber-400' : 'bg-zinc-400')} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{a.employee}</span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">{a.issue}</span>
                </div>
                <span className={cn('shrink-0 inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', severityBadge[a.severity])}>
                  {a.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
          {(['All', 'approved', 'pending', 'rejected', 'unverified'] as const).map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setKycF(k)}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                kycF === k ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {k === 'All' ? 'All KYC' : kycConfig[k].label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-48">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee…" className="h-9 pl-9" />
        </div>
      </div>

      {/* ── Compliance Table ── */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-2.5">
          <p className="text-sm font-medium">{filtered.length} employees</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-b hover:bg-transparent">
              <SortHead col="employee"  label="Employee"          sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="px-4" />
              <SortHead col="kyc"       label="KYC status"        sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="px-2" />
              <TableHead className="hidden md:table-cell px-2 py-3 text-xs font-medium text-muted-foreground">Right to work</TableHead>
              <TableHead className="hidden lg:table-cell px-2 py-3 text-xs font-medium text-muted-foreground">Background check</TableHead>
              <TableHead className="hidden sm:table-cell px-2 py-3 text-xs font-medium text-muted-foreground">Govt ID</TableHead>
              <TableHead className="hidden lg:table-cell px-2 py-3 text-xs font-medium text-muted-foreground">Certification</TableHead>
              <SortHead col="score"     label="Compliance"        sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="px-2" />
              <SortHead col="alerts"    label="Alerts"            sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="px-2" />
              <TableHead className="px-4 py-3 text-xs font-medium text-muted-foreground" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(r => {
              const kyc = kycConfig[r.kyc_status]
              const KycIcon = kyc.icon
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
                  <TableCell className="px-2">
                    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium', kyc.badge)}>
                      <KycIcon className="h-3 w-3" />
                      {kyc.label}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell px-2">
                    <span className={cn('text-xs font-medium', docConfig[r.right_to_work].cls)}>
                      {docConfig[r.right_to_work].label}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell px-2">
                    <span className={cn('text-xs font-medium', docConfig[r.background_check].cls)}>
                      {docConfig[r.background_check].label}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell px-2">
                    <span className={cn('text-xs font-medium', docConfig[r.govt_id].cls)}>
                      {docConfig[r.govt_id].label}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell px-2">
                    <span className={cn('text-xs font-medium', docConfig[r.certification].cls)}>
                      {docConfig[r.certification].label}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 min-w-32">
                    <ScoreBar score={r.overall_score} />
                  </TableCell>
                  <TableCell className="px-2">
                    {r.alerts > 0 ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-700">
                        {r.alerts}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4">
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground" asChild>
                      <Link to={`/workers/${r.id}`}>
                        View
                        <ChevronRightIcon className="h-3 w-3" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── KYC Funnel ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {([['approved', stats.approved], ['pending', stats.pending], ['rejected', stats.rejected], ['unverified', stats.unverified]] as const).map(([status, count]) => {
          const cfg = kycConfig[status]
          const Icon = cfg.icon
          const pct  = Math.round((count / RECORDS.length) * 100)
          return (
            <button
              key={status}
              type="button"
              onClick={() => setKycF(kycF === status ? 'All' : status)}
              className={cn(
                'rounded-xl border p-4 text-left transition-colors hover:bg-muted/30',
                kycF === status && 'border-primary bg-primary/5',
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium', cfg.badge)}>
                  <Icon className="h-3 w-3" />
                  {cfg.label}
                </span>
                <span className="text-2xl font-bold">{count}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all', cfg.dot)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{pct}% of workforce</p>
            </button>
          )
        })}
      </div>

    </div>
  )
}
