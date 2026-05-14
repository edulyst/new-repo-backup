import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiRequestError, apiGet } from '@/lib/api'
import { fmtDateTime, fmtDuration, fmtMoney } from '@/lib/fmt'
import type { AdminTimesheetRow, PaginatedBody } from '@/types/admin'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  SearchIcon,
  UserRoundIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SortState = { col: string; dir: 'asc' | 'desc' | null }

const TS_STATUS: Record<string, { badge: string; dot: string; label: string }> = {
  open:     { badge: 'border-amber-200 bg-amber-50 text-amber-700',       dot: 'bg-amber-400',   label: 'Open' },
  pending:  { badge: 'border-amber-200 bg-amber-50 text-amber-700',       dot: 'bg-amber-400',   label: 'Pending' },
  approved: { badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', label: 'Approved' },
  disputed: { badge: 'border-red-200 bg-red-50 text-red-600',             dot: 'bg-red-500',     label: 'Disputed' },
}

const STATUS_TABS = [
  { value: '',         label: 'All' },
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'disputed', label: 'Disputed' },
]

const LIMIT = 40

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

export function TimesheetsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const statusFilter = searchParams.get('status') ?? ''
  const pageParam    = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))

  const [inputVal, setInputVal] = useState(searchParams.get('search') ?? '')
  const [search, setSearch]     = useState(searchParams.get('search') ?? '')
  const [rows, setRows]         = useState<AdminTimesheetRow[]>([])
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
    apiGet<PaginatedBody<{ timesheets: AdminTimesheetRow[] }>>(`/admin/timesheets?${params}`)
      .then((r) => {
        setRows(r.data.timesheets ?? [])
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

  function toggleSort(col: string) {
    setSort(s => nextSort(s, col))
  }

  const displayRows = useMemo(() => {
    if (!sort.col || !sort.dir) return rows
    return [...rows].sort((a, b) => {
      let va: string | number = ''
      let vb: string | number = ''
      if (sort.col === 'shift')    { va = a.shift_title;        vb = b.shift_title }
      else if (sort.col === 'worker')   { va = a.worker_name;         vb = b.worker_name }
      else if (sort.col === 'clockin')  { va = a.clock_in;            vb = b.clock_in }
      else if (sort.col === 'duration') { va = a.total_hours ?? 0;    vb = b.total_hours ?? 0 }
      else if (sort.col === 'pay')      { va = a.gross_amount ?? 0;   vb = b.gross_amount ?? 0 }
      else if (sort.col === 'status')   { va = a.status;              vb = b.status }
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb))
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, sort])

  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id))
  const someSelected = rows.some(r => selected.has(r.id)) && !allSelected

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)))
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
          <h1 className="text-xl font-semibold">Timesheets</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Review, approve and rate worker timesheets.</p>
        </div>
        {!loading && (
          <p className="text-sm font-medium text-muted-foreground">
            {total.toLocaleString()} total
            {selected.size > 0 && <span className="ml-2 text-foreground">· {selected.size} selected</span>}
          </p>
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

      {/* Table */}
      {loading ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className="w-10 px-4"><Checkbox disabled /></TableHead>
                {['Shift', 'Worker', 'Clock in', 'Duration', 'Gross pay', 'Status'].map(h => (
                  <TableHead key={h} className="py-3 px-2 text-xs font-medium text-muted-foreground">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7} className="py-3 px-4"><Skeleton className="h-10 w-full" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border bg-card text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <ClockIcon className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">No timesheets found</p>
          <p className="text-xs text-muted-foreground">Try adjusting the filter or search.</p>
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
                  <SortHead col="shift"    label="Shift"     sort={sort} onSort={toggleSort} className="px-2" />
                  <SortHead col="worker"   label="Worker"    sort={sort} onSort={toggleSort} className="px-2" />
                  <SortHead col="clockin"  label="Clock in"  sort={sort} onSort={toggleSort} className="px-2" />
                  <SortHead col="duration" label="Duration"  sort={sort} onSort={toggleSort} className="px-2" />
                  <SortHead col="pay"      label="Gross pay" sort={sort} onSort={toggleSort} className="px-2" />
                  <SortHead col="status"   label="Status"    sort={sort} onSort={toggleSort} className="px-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.map((t) => {
                  const cfg = TS_STATUS[t.status] ?? TS_STATUS.pending
                  return (
                    <TableRow
                      key={t.id}
                      className={cn(
                        'cursor-pointer hover:bg-muted/30 transition-colors',
                        selected.has(t.id) && 'bg-muted/20',
                      )}
                      onClick={() => navigate(`/timesheets/${t.id}`)}
                    >
                      <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(t.id)}
                          onCheckedChange={() => toggleRow(t.id)}
                          aria-label={`Select ${t.shift_title}`}
                        />
                      </TableCell>
                      <TableCell className="py-3 px-2">
                        <p className="truncate text-sm font-medium max-w-[200px]">{t.shift_title}</p>
                      </TableCell>
                      <TableCell className="px-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                            {t.worker_name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <span className="truncate text-sm text-muted-foreground max-w-[120px]">{t.worker_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 text-sm text-muted-foreground whitespace-nowrap">{fmtDateTime(t.clock_in)}</TableCell>
                      <TableCell className="px-2 text-sm font-medium">{fmtDuration(t.total_hours)}</TableCell>
                      <TableCell className="px-2 text-sm font-semibold">{fmtMoney(t.gross_amount)}</TableCell>
                      <TableCell className="px-2">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium',
                          cfg.badge,
                        )}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                          {cfg.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((t) => {
              const cfg = TS_STATUS[t.status] ?? TS_STATUS.pending
              return (
                <div
                  key={t.id}
                  onClick={() => navigate(`/timesheets/${t.id}`)}
                  className="cursor-pointer rounded-xl border bg-card px-4 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{t.shift_title}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <UserRoundIcon className="h-3 w-3" />{t.worker_name}
                      </p>
                    </div>
                    <span className={cn(
                      'shrink-0 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium',
                      cfg.badge,
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                      {cfg.label}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3" />{fmtDateTime(t.clock_in)}</span>
                    <span className="font-medium text-foreground">{fmtDuration(t.total_hours)}</span>
                    <span className="font-semibold text-foreground">{fmtMoney(t.gross_amount)}</span>
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
          <p className="text-sm text-muted-foreground">{from}–{to} of {total.toLocaleString()}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pageParam <= 1} onClick={() => setPage(pageParam - 1)} className="gap-1">
              <ChevronLeftIcon className="h-3.5 w-3.5" />Prev
            </Button>
            <span className="text-sm text-muted-foreground">{pageParam} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={pageParam >= totalPages} onClick={() => setPage(pageParam + 1)} className="gap-1">
              Next<ChevronRightIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
