import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiRequestError, apiGet, apiGetBlob, apiPatch, apiPostForm } from '@/lib/api'
import { fmtDate, fmtRating } from '@/lib/fmt'
import type { AdminEmployerRow, PaginatedBody } from '@/types/admin'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FilterIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  UploadIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PAGE_LIMIT = 10

type VerifiedFilter = 'all' | 'true' | 'false'
type SortState = { col: string; dir: 'asc' | 'desc' | null }

function companyInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || 'EM'
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

export function EmployersPage() {
  const navigate = useNavigate()
  const [initialLoading, setInitialLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [rows, setRows] = useState<AdminEmployerRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [verifiedFilter, setVerifiedFilter] = useState<VerifiedFilter>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [rowBusy, setRowBusy] = useState<string | null>(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [sort, setSort] = useState<SortState>({ col: '', dir: null })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const didMountSearch = useRef(false)
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null)

  function loadList(next: { page?: number; verified?: VerifiedFilter; search?: string } = {}) {
    const p = next.page ?? page
    const v = next.verified ?? verifiedFilter
    const s = next.search ?? search
    if (initialLoading) setInitialLoading(true)
    else setIsFetching(true)
    setErr(null)
    const q = new URLSearchParams({ page: String(p), limit: String(PAGE_LIMIT) })
    if (s.trim()) q.set('search', s.trim())
    if (v !== 'all') q.set('verified', v)
    apiGet<PaginatedBody<{ employers: AdminEmployerRow[] }>>(`/admin/employers?${q.toString()}`)
      .then((r) => {
        setRows(r.data.employers)
        setTotal(r.meta.total)
        setPage(r.meta.page)
        setTotalPages(r.meta.total_pages)
        setSelected(new Set())
      })
      .catch((e: unknown) => setErr(e instanceof ApiRequestError ? e.message : 'Failed to load'))
      .finally(() => { setInitialLoading(false); setIsFetching(false) })
  }

  useEffect(() => { loadList({ page: 1 }) }, [])

  useEffect(() => {
    if (!didMountSearch.current) { didMountSearch.current = true; return }
    const t = setTimeout(() => loadList({ page: 1 }), 250)
    return () => clearTimeout(t)
  }, [search])

  async function toggleRowVerified(id: string, verified: boolean) {
    setRowBusy(id)
    try {
      await apiPatch(`/admin/employers/${id}/verification`, { verified })
      toast.success(verified ? 'Employer verified.' : 'Verification removed.')
      setRows((r) => r.map((e) => (e.id === id ? { ...e, verified } : e)))
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Failed')
    } finally {
      setRowBusy(null)
    }
  }

  function onVerifiedFilter(v: VerifiedFilter) {
    setVerifiedFilter(v)
    loadList({ page: 1, verified: v })
  }

  async function onBulkFile(file: File | null) {
    if (!file) return
    setBulkUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = (await apiPostForm('/admin/employers/bulk-upload', fd)) as {
        data: { total_rows: number; created: number; failed: number; errors: Array<{ row: number; message: string }> }
      }
      toast.success(`Bulk upload done: ${res.data.created}/${res.data.total_rows} created`)
      if (res.data.failed > 0) {
        const first = res.data.errors[0]
        toast.error(`Some rows failed. Row ${first.row}: ${first.message}`)
      }
      setBulkDialogOpen(false)
      loadList({ page: 1 })
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Bulk upload failed')
    } finally {
      setBulkUploading(false)
    }
  }

  async function downloadSample() {
    try {
      const blob = await apiGetBlob('/admin/employers/bulk-upload/sample')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'employers_bulk_sample.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Sample downloaded')
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not download sample')
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
      if (sort.col === 'company')  { va = a.company_name;         vb = b.company_name }
      else if (sort.col === 'verified') { va = Number(a.verified); vb = Number(b.verified) }
      else if (sort.col === 'rating')   { va = a.rating_avg;       vb = b.rating_avg }
      else if (sort.col === 'shifts')   { va = a.total_shifts_posted; vb = b.total_shifts_posted }
      else if (sort.col === 'joined')   { va = a.created_at ?? ''; vb = b.created_at ?? '' }
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
          {total} employer{total !== 1 ? 's' : ''}
          {selected.size > 0 && <span className="ml-2 font-medium text-foreground">· {selected.size} selected</span>}
        </p>
        <div className="relative w-full max-w-sm sm:w-auto">
          {isFetching ? (
            <Loader2Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employer company" className="h-9 pl-9" />
        </div>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setShowFilters((x) => !x)}>
          <FilterIcon className="h-3.5 w-3.5" />
          Filters
        </Button>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-muted"
          onClick={() => setBulkDialogOpen(true)}
        >
          <UploadIcon className="h-3.5 w-3.5" />
          Bulk upload
        </button>
        <Button type="button" size="sm" className="gap-1.5" asChild>
          <Link to="/employers/new">
            <PlusIcon className="h-4 w-4" />
            Add employer
          </Link>
        </Button>
      </div>

      <input
        ref={bulkFileInputRef}
        type="file"
        className="hidden"
        accept=".xlsx,.xls"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null
          void onBulkFile(f)
          e.currentTarget.value = ''
        }}
      />

      {showFilters && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/30 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Verification</Label>
            <Select value={verifiedFilter} onValueChange={(v) => onVerifiedFilter(v as VerifiedFilter)}>
              <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Verified</SelectItem>
                <SelectItem value="false">Unverified</SelectItem>
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
              <SortHead col="company"  label="Company"  sort={sort} onSort={toggleSort} className="px-2" />
              <SortHead col="verified" label="Verified" sort={sort} onSort={toggleSort} className="px-2 w-32" />
              <SortHead col="rating"   label="Rating"   sort={sort} onSort={toggleSort} className="px-2" />
              <SortHead col="shifts"   label="Shifts"   sort={sort} onSort={toggleSort} className="hidden sm:table-cell px-2" />
              <SortHead col="joined"   label="Joined"   sort={sort} onSort={toggleSort} className="hidden md:table-cell px-2" />
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
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">No employers found.</TableCell>
              </TableRow>
            )}
            {!initialLoading && !err && displayRows.map((e) => (
              <TableRow
                key={e.id}
                className={cn(
                  'cursor-pointer hover:bg-muted/30 transition-colors',
                  selected.has(e.id) && 'bg-muted/20',
                )}
                onClick={() => navigate(`/employers/${e.id}`)}
              >
                <TableCell className="px-4" onClick={(ev) => ev.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(e.id)}
                    onCheckedChange={() => toggleRow(e.id)}
                    aria-label={`Select ${e.company_name}`}
                  />
                </TableCell>
                <TableCell className="py-3 px-2">
                  <div className="flex items-center gap-3">
                    {e.logo_preview_url || e.logo_url ? (
                      <img
                        src={e.logo_preview_url ?? e.logo_url ?? ''}
                        alt={e.company_name}
                        className={cn(
                          'h-9 w-9 shrink-0 rounded-md border bg-white p-1',
                          (e.logo_fit ?? 'contain') === 'cover' ? 'object-cover' : 'object-contain',
                        )}
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-semibold">
                        {companyInitials(e.company_name)}
                      </div>
                    )}
                    <span className="text-sm font-medium">{e.company_name}</span>
                  </div>
                </TableCell>
                <TableCell className="px-2" onClick={(ev) => ev.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={e.verified}
                      disabled={rowBusy === e.id}
                      onCheckedChange={(v) => toggleRowVerified(e.id, v)}
                      aria-label={e.verified ? 'Remove verification' : 'Verify employer'}
                    />
                    <span className={cn(
                      'hidden sm:inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
                      e.verified
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-500',
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', e.verified ? 'bg-emerald-500' : 'bg-zinc-400')} />
                      {e.verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-2">
                  <span className="flex items-center gap-1 text-sm">
                    <StarIcon className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {fmtRating(e.rating_avg)}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell px-2 text-sm text-muted-foreground">
                  {e.total_shifts_posted}
                </TableCell>
                <TableCell className="hidden md:table-cell px-2 whitespace-nowrap text-sm text-muted-foreground">
                  {fmtDate(e.created_at)}
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

      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
          <DialogHeader>
            <div className="border-b px-6 py-5">
              <DialogTitle className="text-lg">Bulk employer upload</DialogTitle>
              <DialogDescription className="mt-2">
                Upload employers in one Excel file with a clean structured template.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="grid gap-3 px-6 py-5 sm:grid-cols-2">
            <button
              type="button"
              className="group rounded-xl border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-muted/40"
              onClick={downloadSample}
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background">
                <DownloadIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </div>
              <p className="text-sm font-semibold">Download sample XL</p>
              <p className="mt-1 text-xs text-muted-foreground">Get the latest employer import template.</p>
            </button>
            <button
              type="button"
              className="group rounded-xl border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-muted/40 disabled:opacity-60"
              disabled={bulkUploading}
              onClick={() => bulkFileInputRef.current?.click()}
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background">
                <UploadIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </div>
              <p className="text-sm font-semibold">{bulkUploading ? 'Uploading…' : 'Direct upload'}</p>
              <p className="mt-1 text-xs text-muted-foreground">Pick an Excel file from your device.</p>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
