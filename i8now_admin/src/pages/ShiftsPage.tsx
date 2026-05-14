import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiRequestError, apiGet } from '@/lib/api'
import type { AdminShiftRow, PaginatedBody } from '@/types/admin'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
} from 'lucide-react'

const PAGE_LIMIT = 10

type SortState = { col: string; dir: 'asc' | 'desc' | null }

const statusBadge: Record<string, string> = {
  open:      'border-emerald-200 bg-emerald-50 text-emerald-700',
  filled:    'border-zinc-200 bg-zinc-50 text-zinc-600',
  cancelled: 'border-red-200 bg-red-50 text-red-700',
}
const statusDot: Record<string, string> = {
  open:      'bg-emerald-500',
  filled:    'bg-zinc-400',
  cancelled: 'bg-red-500',
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

export function ShiftsPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<AdminShiftRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortState>({ col: '', dir: null })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [initialLoading, setInitialLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const didMountSearch = useRef(false)

  function loadList(next: { page?: number; search?: string } = {}) {
    const p = next.page ?? page
    const q = next.search ?? search
    if (initialLoading) setInitialLoading(true)
    else setIsFetching(true)
    setErr(null)
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_LIMIT) })
    if (q.trim()) params.set('search', q.trim())
    apiGet<PaginatedBody<{ shifts: AdminShiftRow[] }>>(`/admin/shifts?${params.toString()}`)
      .then((r) => {
        setRows(r.data.shifts)
        setTotal(r.meta.total)
        setPage(r.meta.page)
        setTotalPages(r.meta.total_pages)
        setSelected(new Set())
      })
      .catch((e: unknown) => setErr(e instanceof ApiRequestError ? e.message : 'Failed to load shifts'))
      .finally(() => { setInitialLoading(false); setIsFetching(false) })
  }

  useEffect(() => { loadList({ page: 1 }) }, [])

  useEffect(() => {
    if (!didMountSearch.current) { didMountSearch.current = true; return }
    const t = setTimeout(() => loadList({ page: 1 }), 250)
    return () => clearTimeout(t)
  }, [search])

  function toggleSort(col: string) {
    setSort(s => nextSort(s, col))
  }

  const displayRows = useMemo(() => {
    if (!sort.col || !sort.dir) return rows
    return [...rows].sort((a, b) => {
      let va: string | number = ''
      let vb: string | number = ''
      if (sort.col === 'title')    { va = a.title;         vb = b.title }
      else if (sort.col === 'employer')  { va = a.employer_name; vb = b.employer_name }
      else if (sort.col === 'category') { va = a.category_name; vb = b.category_name }
      else if (sort.col === 'date')     { va = a.date;          vb = b.date }
      else if (sort.col === 'status')   { va = a.status;        vb = b.status }
      else if (sort.col === 'slots')    { va = a.slots_filled;  vb = b.slots_filled }
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
          {total} shift{total !== 1 ? 's' : ''}
          {selected.size > 0 && <span className="ml-2 font-medium text-foreground">· {selected.size} selected</span>}
        </p>
        <div className="relative w-full max-w-sm sm:w-auto">
          {isFetching ? (
            <Loader2Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search shifts by title" className="h-9 pl-9" />
        </div>
        <Button type="button" size="sm" className="gap-1.5" asChild>
          <Link to="/shifts/new">
            <PlusIcon className="h-4 w-4" />
            Add shift
          </Link>
        </Button>
      </div>

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
              <SortHead col="title"    label="Shift"    sort={sort} onSort={toggleSort} className="px-2" />
              <SortHead col="employer" label="Employer" sort={sort} onSort={toggleSort} className="hidden md:table-cell px-2" />
              <SortHead col="category" label="Category" sort={sort} onSort={toggleSort} className="hidden md:table-cell px-2" />
              <SortHead col="date"     label="Date"     sort={sort} onSort={toggleSort} className="px-2" />
              <SortHead col="status"   label="Status"   sort={sort} onSort={toggleSort} className="px-2" />
              <SortHead col="slots"    label="Slots"    sort={sort} onSort={toggleSort} className="px-2" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialLoading && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={`sk-${i}`}>
                <TableCell colSpan={7} className="py-3 px-4"><Skeleton className="h-10 w-full" /></TableCell>
              </TableRow>
            ))}
            {!initialLoading && err && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm">{err}</TableCell>
              </TableRow>
            )}
            {!initialLoading && !err && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">No shifts found.</TableCell>
              </TableRow>
            )}
            {!initialLoading && !err && displayRows.map((s) => (
              <TableRow
                key={s.id}
                className={cn(
                  'cursor-pointer hover:bg-muted/30 transition-colors',
                  selected.has(s.id) && 'bg-muted/20',
                )}
                onClick={() => navigate(`/shifts/${s.id}`)}
              >
                <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(s.id)}
                    onCheckedChange={() => toggleRow(s.id)}
                    aria-label={`Select ${s.title}`}
                  />
                </TableCell>
                <TableCell className="py-3 px-2">
                  <div className="text-sm font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground md:hidden">{s.employer_name}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell px-2 text-sm text-muted-foreground">{s.employer_name}</TableCell>
                <TableCell className="hidden md:table-cell px-2 text-sm text-muted-foreground">{s.category_name}</TableCell>
                <TableCell className="px-2 text-sm text-muted-foreground whitespace-nowrap">{s.date}</TableCell>
                <TableCell className="px-2">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium',
                    statusBadge[s.status] ?? 'border-zinc-200 bg-zinc-50 text-zinc-600',
                  )}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', statusDot[s.status] ?? 'bg-zinc-400')} />
                    {s.status}
                  </span>
                </TableCell>
                <TableCell className="px-2 text-sm text-muted-foreground">
                  {s.slots_filled}/{s.slots_total}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{pageText}</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={!canPrev} onClick={() => loadList({ page: page - 1 })}>
            <ChevronLeftIcon className="h-4 w-4" /> Prev
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!canNext} onClick={() => loadList({ page: page + 1 })}>
            Next <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
