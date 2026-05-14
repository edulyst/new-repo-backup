import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiRequestError, apiGet, apiPatch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { PaginatedBody } from '@/types/admin'
import { toast } from 'sonner'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BadgeCheckIcon,
  BriefcaseIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronsUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  SearchIcon,
  StarIcon,
  XCircleIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ApplicationRow = {
  application_id: string
  worker_profile_id: string
  shift_id: string
  status: 'applied' | 'confirmed' | 'rejected' | 'completed' | 'cancelled'
  applied_at: string
  worker: {
    full_name: string
    avatar_url: string | null
    city: string
    kyc_status: 'unverified' | 'pending' | 'approved' | 'rejected'
    rating_avg: number
    total_shifts: number
  } | null
  shift: {
    id: string
    title: string
    date: string | null
    start_time: string
    end_time: string
    hourly_rate: number
    employer_name: string
    status: string
  } | null
  user: { id: string; email: string | null; phone: string | null } | null
}

type SortState = { col: string; dir: 'asc' | 'desc' | null }

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────

const APP_STATUS: Record<string, { badge: string; dot: string; label: string }> = {
  applied:   { badge: 'border-amber-200 bg-amber-50 text-amber-700',       dot: 'bg-amber-400',   label: 'Applied' },
  confirmed: { badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', label: 'Confirmed' },
  completed: { badge: 'border-blue-200 bg-blue-50 text-blue-700',          dot: 'bg-blue-500',    label: 'Completed' },
  rejected:  { badge: 'border-red-200 bg-red-50 text-red-600',             dot: 'bg-red-500',     label: 'Rejected' },
  cancelled: { badge: 'border-zinc-200 bg-zinc-50 text-zinc-500',          dot: 'bg-zinc-400',    label: 'Cancelled' },
}

const KYC_CFG: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
  approved:   { icon: <BadgeCheckIcon className="h-3 w-3" />, cls: 'text-emerald-600', label: 'Approved' },
  pending:    { icon: <ClockIcon className="h-3 w-3" />,       cls: 'text-amber-500',  label: 'Pending' },
  rejected:   { icon: <XCircleIcon className="h-3 w-3" />,     cls: 'text-red-500',    label: 'Rejected' },
  unverified: { icon: <XCircleIcon className="h-3 w-3" />,     cls: 'text-zinc-400',   label: 'Unverified' },
}

const STATUS_TABS = [
  { value: '',           label: 'All' },
  { value: 'applied',    label: 'Applied' },
  { value: 'confirmed',  label: 'Confirmed' },
  { value: 'completed',  label: 'Completed' },
  { value: 'rejected',   label: 'Rejected' },
  { value: 'cancelled',  label: 'Cancelled' },
]

const CHANGE_TO: Record<ApplicationRow['status'], ApplicationRow['status'][]> = {
  applied:   ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'rejected', 'cancelled'],
  completed: ['confirmed', 'cancelled'],
  rejected:  ['applied', 'confirmed'],
  cancelled: ['applied'],
}

const INR = '\u20B9'
const LIMIT = 40

// ─────────────────────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────────────────────

function Avatar({ url, name }: { url: string | null; name?: string }) {
  if (url) return <img src={url} alt={name} className="h-9 w-9 shrink-0 rounded-full object-cover" />
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const cfg = APP_STATUS[status] ?? APP_STATUS.applied
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium',
      cfg.badge,
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

function StatusMenu({
  app,
  onUpdate,
}: {
  app: ApplicationRow
  onUpdate: (app: ApplicationRow, status: ApplicationRow['status']) => void
}) {
  const transitions = CHANGE_TO[app.status] ?? []
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground transition-colors hover:bg-muted/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MoreHorizontalIcon className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Change status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {transitions.length === 0 ? (
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">No actions available</DropdownMenuItem>
        ) : (
          transitions.map((st) => {
            const cfg = APP_STATUS[st]
            return (
              <DropdownMenuItem
                key={st}
                onClick={() => onUpdate(app, st)}
                className="flex items-center gap-2 text-sm"
              >
                <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                {cfg.label}
              </DropdownMenuItem>
            )
          })
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={`/workers/${app.worker_profile_id}`} className="flex items-center gap-2 text-sm">
            <ExternalLinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
            View worker
          </Link>
        </DropdownMenuItem>
        {app.shift && (
          <DropdownMenuItem asChild>
            <Link to={`/shifts/${app.shift.id}`} className="flex items-center gap-2 text-sm">
              <ExternalLinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
              View shift
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function nextSort(s: SortState, col: string): SortState {
  if (s.col !== col) return { col, dir: 'asc' }
  if (s.dir === 'asc') return { col, dir: 'desc' }
  return { col: '', dir: null }
}

function SortHead({
  col, label, sort, onSort, className,
}: {
  col: string; label: string; sort: SortState; onSort: (col: string) => void; className?: string
}) {
  const active = sort.col === col
  return (
    <TableHead className={cn('py-3', className)}>
      <button
        type="button"
        onClick={() => onSort(col)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {label}
        {active && sort.dir === 'asc' && <ArrowUpIcon className="h-3 w-3" />}
        {active && sort.dir === 'desc' && <ArrowDownIcon className="h-3 w-3" />}
        {!active && <ChevronsUpDownIcon className="h-3 w-3 opacity-40" />}
      </button>
    </TableHead>
  )
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export function ApplicationsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const statusFilter = searchParams.get('status') ?? ''
  const pageParam    = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))

  const [search, setSearch]     = useState(searchParams.get('search') ?? '')
  const [inputVal, setInputVal] = useState(searchParams.get('search') ?? '')
  const [rows, setRows]         = useState<ApplicationRow[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [sort, setSort]         = useState<SortState>({ col: '', dir: null })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (search)       params.set('search', search)
    params.set('page', String(pageParam))
    params.set('limit', String(LIMIT))
    apiGet<PaginatedBody<ApplicationRow[]>>(`/admin/applications?${params}`)
      .then((r) => {
        setRows(r.data)
        setTotal(r.meta.total)
        setSelected(new Set())
      })
      .catch((e) => toast.error(e instanceof ApiRequestError ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [statusFilter, search, pageParam])

  useEffect(() => { load() }, [load])

  function setFilter(key: string, value: string) {
    setSearchParams((p) => {
      const next = new URLSearchParams(p)
      if (value) next.set(key, value); else next.delete(key)
      next.delete('page')
      return next
    })
  }

  function setPage(p: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (p > 1) next.set('page', String(p)); else next.delete('page')
      return next
    })
  }

  function onSearchInput(v: string) {
    setInputVal(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(v)
      setSearchParams((p) => {
        const next = new URLSearchParams(p)
        if (v) next.set('search', v); else next.delete('search')
        next.delete('page')
        return next
      })
    }, 380)
  }

  async function updateStatus(app: ApplicationRow, newStatus: ApplicationRow['status']) {
    const shiftId = app.shift?.id ?? app.shift_id
    try {
      await apiPatch(`/admin/shifts/${shiftId}/applications/${app.application_id}`, { status: newStatus })
      toast.success(`Marked as ${APP_STATUS[newStatus]?.label ?? newStatus}`)
      setRows((prev) => prev.map((r) =>
        r.application_id === app.application_id ? { ...r, status: newStatus } : r,
      ))
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not update status')
    }
  }

  function toggleSort(col: string) {
    setSort(s => nextSort(s, col))
  }

  const displayRows = useMemo(() => {
    if (!sort.col || !sort.dir) return rows
    return [...rows].sort((a, b) => {
      let va: string | number = ''
      let vb: string | number = ''
      if (sort.col === 'worker')   { va = a.worker?.full_name ?? ''; vb = b.worker?.full_name ?? '' }
      else if (sort.col === 'shift')    { va = a.shift?.title ?? '';      vb = b.shift?.title ?? '' }
      else if (sort.col === 'applied')  { va = a.applied_at;              vb = b.applied_at }
      else if (sort.col === 'rate')     { va = a.shift?.hourly_rate ?? 0; vb = b.shift?.hourly_rate ?? 0 }
      else if (sort.col === 'status')   { va = a.status;                  vb = b.status }
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb))
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, sort])

  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.application_id))
  const someSelected = rows.some(r => selected.has(r.application_id)) && !allSelected

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map(r => r.application_id)))
  }

  function toggleRow(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const from = total === 0 ? 0 : (pageParam - 1) * LIMIT + 1
  const to   = Math.min(pageParam * LIMIT, total)

  return (
    <div className="flex w-full flex-col gap-4 p-4 lg:p-6">

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Applications</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage all worker job applications across every shift.</p>
        </div>
        {!loading && (
          <div className="flex items-center gap-2">
            <CheckCircle2Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {total.toLocaleString()} total
              {selected.size > 0 && <span className="ml-2 text-foreground">· {selected.size} selected</span>}
            </span>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-0.5 overflow-x-auto rounded-lg border bg-muted/40 p-1 scrollbar-none">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter('status', tab.value)}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                statusFilter === tab.value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <SearchIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={inputVal}
            onChange={(e) => onSearchInput(e.target.value)}
            placeholder="Search worker…"
            className="h-9 rounded-lg pl-9 text-sm"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className="w-10 px-4"><Checkbox disabled /></TableHead>
                {['Worker', 'Shift', 'Applied', 'Rate', 'Status', ''].map((h, i) => (
                  <TableHead key={i} className="py-3 px-2 text-xs font-medium text-muted-foreground">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7} className="py-3 px-4"><Skeleton className="h-12 w-full" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border bg-card text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <BriefcaseIcon className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">No applications found</p>
          <p className="text-xs text-muted-foreground">Try changing the status filter or search term.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-b hover:bg-transparent">
                  <TableHead className="w-10 px-4">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <SortHead col="worker"  label="Worker"  sort={sort} onSort={toggleSort} className="px-2" />
                  <SortHead col="shift"   label="Shift"   sort={sort} onSort={toggleSort} className="px-2" />
                  <SortHead col="applied" label="Applied" sort={sort} onSort={toggleSort} className="px-2" />
                  <SortHead col="rate"    label="Rate"    sort={sort} onSort={toggleSort} className="px-2" />
                  <SortHead col="status"  label="Status"  sort={sort} onSort={toggleSort} className="px-2" />
                  <TableHead className="px-2 w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.map((app) => {
                  const w = app.worker
                  const s = app.shift
                  const kyc = w ? (KYC_CFG[w.kyc_status] ?? KYC_CFG.unverified) : null

                  return (
                    <TableRow
                      key={app.application_id}
                      className={cn(
                        'cursor-pointer hover:bg-muted/30 transition-colors',
                        selected.has(app.application_id) && 'bg-muted/20',
                      )}
                      onClick={(e) => { if ((e.target as HTMLElement).closest('a,button')) return; navigate(`/applications/${app.application_id}`) }}
                    >
                      <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(app.application_id)}
                          onCheckedChange={() => toggleRow(app.application_id)}
                          aria-label={`Select application`}
                        />
                      </TableCell>

                      {/* Worker */}
                      <TableCell className="py-3 px-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar url={w?.avatar_url ?? null} name={w?.full_name} />
                          <div className="min-w-0">
                            {w ? (
                              <>
                                <Link
                                  to={`/workers/${app.worker_profile_id}`}
                                  className="block truncate text-sm font-medium text-foreground hover:underline underline-offset-2"
                                >
                                  {w.full_name}
                                </Link>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                  {w.city && (
                                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                      <MapPinIcon className="h-2.5 w-2.5" />{w.city}
                                    </span>
                                  )}
                                  <span className={cn('flex items-center gap-0.5 text-xs font-medium', kyc?.cls)}>
                                    {kyc?.icon}{kyc?.label}
                                  </span>
                                </div>
                                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-0.5">
                                    <StarIcon className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                    {w.rating_avg > 0 ? w.rating_avg.toFixed(1) : '—'}
                                  </span>
                                  <span>{w.total_shifts} shifts</span>
                                </div>
                              </>
                            ) : (
                              <span className="text-sm italic text-muted-foreground">Worker removed</span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Shift */}
                      <TableCell className="px-2 min-w-0">
                        {s ? (
                          <>
                            <Link
                              to={`/shifts/${s.id}`}
                              className="flex items-center gap-1 truncate text-sm font-medium text-foreground hover:underline underline-offset-2"
                            >
                              <span className="truncate max-w-[160px]">{s.title}</span>
                              <ExternalLinkIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                            </Link>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground max-w-[160px]">{s.employer_name}</p>
                            <div className="mt-0.5 flex items-center gap-2.5 text-xs text-muted-foreground">
                              {s.date && (
                                <span className="flex items-center gap-0.5">
                                  <CalendarIcon className="h-2.5 w-2.5" />{s.date}
                                </span>
                              )}
                              <span className="flex items-center gap-0.5">
                                <ClockIcon className="h-2.5 w-2.5" />{s.start_time}–{s.end_time}
                              </span>
                            </div>
                          </>
                        ) : (
                          <span className="text-sm italic text-muted-foreground">Shift removed</span>
                        )}
                      </TableCell>

                      {/* Applied */}
                      <TableCell className="px-2 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(app.applied_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </TableCell>

                      {/* Rate */}
                      <TableCell className="px-2 text-sm font-semibold whitespace-nowrap">
                        {s ? `${INR}${s.hourly_rate}/hr` : '—'}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-2">
                        <StatusPill status={app.status} />
                      </TableCell>

                      {/* Menu */}
                      <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                        <StatusMenu app={app} onUpdate={updateStatus} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((app) => {
              const w = app.worker
              const s = app.shift
              const kyc = w ? (KYC_CFG[w.kyc_status] ?? KYC_CFG.unverified) : null

              return (
                <div
                  key={app.application_id}
                  onClick={(e) => { if ((e.target as HTMLElement).closest('a,button')) return; navigate(`/applications/${app.application_id}`) }}
                  className="rounded-xl border bg-card px-4 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar url={w?.avatar_url ?? null} name={w?.full_name} />
                      <div className="min-w-0">
                        {w ? (
                          <>
                            <Link
                              to={`/workers/${app.worker_profile_id}`}
                              className="block truncate text-sm font-medium text-foreground"
                            >
                              {w.full_name}
                            </Link>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                              {w.city && (
                                <span className="flex items-center gap-0.5 text-muted-foreground">
                                  <MapPinIcon className="h-2.5 w-2.5" />{w.city}
                                </span>
                              )}
                              <span className={cn('flex items-center gap-0.5 font-medium', kyc?.cls)}>
                                {kyc?.icon}{kyc?.label}
                              </span>
                            </div>
                          </>
                        ) : (
                          <span className="text-sm italic text-muted-foreground">Worker removed</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <StatusPill status={app.status} />
                      <StatusMenu app={app} onUpdate={updateStatus} />
                    </div>
                  </div>

                  {s && (
                    <div className="mt-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                      <Link to={`/shifts/${s.id}`} className="flex items-center gap-1 text-sm font-medium text-foreground">
                        <span className="truncate">{s.title}</span>
                        <ExternalLinkIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.employer_name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                        {s.date && (
                          <span className="flex items-center gap-0.5">
                            <CalendarIcon className="h-2.5 w-2.5" />{s.date}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <ClockIcon className="h-2.5 w-2.5" />{s.start_time}–{s.end_time}
                        </span>
                        <span className="font-semibold text-foreground">{INR}{s.hourly_rate}/hr</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    {w && (
                      <span className="flex items-center gap-0.5">
                        <StarIcon className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                        {w.rating_avg > 0 ? w.rating_avg.toFixed(1) : '—'}
                      </span>
                    )}
                    <span>Applied {new Date(app.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {!loading && total > LIMIT && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {from}–{to} of {total.toLocaleString()} applications
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pageParam <= 1} onClick={() => setPage(pageParam - 1)} className="gap-1">
              <ChevronLeftIcon className="h-3.5 w-3.5" />
              Prev
            </Button>
            <span className="text-sm text-muted-foreground">{pageParam} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={pageParam >= totalPages} onClick={() => setPage(pageParam + 1)} className="gap-1">
              Next
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
