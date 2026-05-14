import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { ApiRequestError, apiGet } from '@/lib/api'
import { fmtDate, fmtRating } from '@/lib/fmt'
import type { AdminWorkerListRow, PaginatedBody } from '@/types/admin'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  StarIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PAGE_LIMIT = 10

type WorkerFilter = { kyc_status: string; search: string }
type SortState = { col: string; dir: 'asc' | 'desc' | null }

const kycBadge: Record<string, string> = {
  unverified: 'border-zinc-200 bg-zinc-50 text-zinc-600',
  pending:    'border-amber-200 bg-amber-50 text-amber-700',
  approved:   'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected:   'border-red-200 bg-red-50 text-red-700',
}
const kycDot: Record<string, string> = {
  unverified: 'bg-zinc-400',
  pending:    'bg-amber-400',
  approved:   'bg-emerald-500',
  rejected:   'bg-red-500',
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'W'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
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

export function WorkersPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<AdminWorkerListRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState<WorkerFilter>({ kyc_status: '', search: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [sort, setSort] = useState<SortState>({ col: '', dir: null })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [initialLoading, setInitialLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const didMountSearch = useRef(false)

  function loadList(next: { page?: number; filter?: WorkerFilter } = {}) {
    const p = next.page ?? page
    const f = next.filter ?? filter
    if (initialLoading) setInitialLoading(true)
    else setIsFetching(true)
    setErr(null)
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_LIMIT) })
    if (f.kyc_status) params.set('kyc_status', f.kyc_status)
    if (f.search.trim()) params.set('search', f.search.trim())
    apiGet<PaginatedBody<{ workers: AdminWorkerListRow[] }>>(`/admin/workers?${params}`)
      .then((r) => {
        setRows(r.data.workers)
        setTotal(r.meta.total)
        setPage(r.meta.page)
        setTotalPages(r.meta.total_pages)
        setSelected(new Set())
      })
      .catch((e: unknown) => setErr(e instanceof ApiRequestError ? e.message : 'Failed to load workers'))
      .finally(() => { setInitialLoading(false); setIsFetching(false) })
  }

  useEffect(() => { loadList({ page: 1 }) }, [])

  useEffect(() => {
    if (!didMountSearch.current) { didMountSearch.current = true; return }
    const t = setTimeout(() => loadList({ page: 1 }), 250)
    return () => clearTimeout(t)
  }, [filter.search])

  function updateFilter(next: Partial<WorkerFilter>) {
    const merged = { ...filter, ...next }
    setFilter(merged)
    if (next.kyc_status !== undefined) loadList({ page: 1, filter: merged })
  }

  function toggleSort(col: string) {
    setSort(s => nextSort(s, col))
  }

  const displayRows = useMemo(() => {
    if (!sort.col || !sort.dir) return rows
    return [...rows].sort((a, b) => {
      let va: string | number = ''
      let vb: string | number = ''
      if (sort.col === 'name')   { va = a.full_name;    vb = b.full_name }
      else if (sort.col === 'city')   { va = a.city ?? '';   vb = b.city ?? '' }
      else if (sort.col === 'kyc')    { va = a.kyc_status;   vb = b.kyc_status }
      else if (sort.col === 'rating') { va = a.rating_avg;   vb = b.rating_avg }
      else if (sort.col === 'joined') { va = a.created_at ?? ''; vb = b.created_at ?? '' }
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

  const canPrev = page > 1
  const canNext = page < totalPages
  const pageText = useMemo(() => `Page ${page} of ${Math.max(totalPages, 1)}`, [page, totalPages])

  return (
    <div className="flex w-full flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm text-muted-foreground">
          {total} worker{total !== 1 ? 's' : ''}
          {selected.size > 0 && <span className="ml-2 font-medium text-foreground">· {selected.size} selected</span>}
        </p>
        <div className="relative w-full max-w-sm sm:w-auto">
          {isFetching ? (
            <Loader2Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            value={filter.search}
            onChange={(e) => updateFilter({ search: e.target.value })}
            placeholder="Search workers by name"
            className="h-9 pl-9"
          />
        </div>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setShowFilters((v) => !v)}>
          <FilterIcon className="h-3.5 w-3.5" />
          Filters
        </Button>
        <Button type="button" size="sm" className="gap-1.5" asChild>
          <Link to="/workers/new">
            <PlusIcon className="h-4 w-4" />
            Add worker
          </Link>
        </Button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/30 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs">KYC Status</Label>
            <Select value={filter.kyc_status || 'all'} onValueChange={(v) => updateFilter({ kyc_status: v === 'all' ? '' : v })}>
              <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All KYC</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className={cn('overflow-hidden rounded-xl border bg-card transition-opacity', isFetching && !initialLoading && 'opacity-75')}>
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
              <SortHead col="name"   label="Worker" sort={sort} onSort={toggleSort} className="px-2" />
              <SortHead col="city"   label="City"   sort={sort} onSort={toggleSort} className="hidden lg:table-cell px-2" />
              <SortHead col="kyc"    label="KYC"    sort={sort} onSort={toggleSort} className="px-2" />
              <SortHead col="rating" label="Rating" sort={sort} onSort={toggleSort} className="px-2" />
              <SortHead col="joined" label="Joined" sort={sort} onSort={toggleSort} className="hidden md:table-cell px-2" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialLoading && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={`sk-${i}`}>
                <TableCell colSpan={6} className="py-3 px-4"><Skeleton className="h-10 w-full" /></TableCell>
              </TableRow>
            ))}
            {!initialLoading && err && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-foreground">{err}</TableCell>
              </TableRow>
            )}
            {!initialLoading && !err && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">No workers found.</TableCell>
              </TableRow>
            )}
            {!initialLoading && !err && displayRows.map((w) => (
              <TableRow
                key={w.id}
                className={cn(
                  'cursor-pointer hover:bg-muted/30 transition-colors',
                  selected.has(w.id) && 'bg-muted/20',
                )}
                onClick={() => navigate(`/workers/${w.id}`)}
              >
                <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(w.id)}
                    onCheckedChange={() => toggleRow(w.id)}
                    aria-label={`Select ${w.full_name}`}
                  />
                </TableCell>
                <TableCell className="py-3 px-2">
                  <div className="flex items-center gap-3">
                    {w.avatar_preview_url || w.avatar_url ? (
                      <img
                        src={w.avatar_preview_url ?? w.avatar_url ?? ''}
                        alt={w.full_name}
                        className="h-9 w-9 shrink-0 rounded-full border object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold">
                        {initials(w.full_name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{w.full_name}</div>
                      <div className="truncate font-mono text-[11px] text-muted-foreground">{w.user_id}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell px-2 text-sm text-muted-foreground">{w.city}</TableCell>
                <TableCell className="px-2">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium',
                    kycBadge[w.kyc_status] ?? 'border-zinc-200 bg-zinc-50 text-zinc-600',
                  )}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', kycDot[w.kyc_status] ?? 'bg-zinc-400')} />
                    {w.kyc_status}
                  </span>
                </TableCell>
                <TableCell className="px-2">
                  <span className="flex items-center gap-1 text-sm">
                    <StarIcon className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {fmtRating(w.rating_avg)}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell px-2 whitespace-nowrap text-sm text-muted-foreground">
                  {fmtDate(w.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{pageText}</p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={!canPrev} onClick={() => loadList({ page: page - 1 })}>
            <ChevronLeftIcon className="h-4 w-4" />
            Prev
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={!canNext} onClick={() => loadList({ page: page + 1 })}>
            Next
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
