import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiRequestError, apiGet, apiPatch } from '@/lib/api'
import { fmtDate } from '@/lib/fmt'
import type { AdminUserRow, PaginatedBody } from '@/types/admin'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
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
  UsersIcon,
  XCircleIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { RolePill, StatusPill } from '@/pages/users/userDirectoryShared'

type Filter = { role: string; status: string; includeDeleted: boolean }
type SortState = { col: string; dir: 'asc' | 'desc' | null }

const PAGE_LIMIT = 10

const ROLE_AVATARS: Record<string, string> = {
  admin:    'https://img.freepik.com/free-photo/3d-cartoon-portrait-person-practicing-law-related-profession_23-2151419548.jpg?semt=ais_hybrid&w=740&q=80',
  employer: 'https://img.freepik.com/free-photo/3d-cartoon-portrait-person-practicing-law-related-profession_23-2151419548.jpg?semt=ais_hybrid&w=740&q=80',
  worker:   'https://png.pngtree.com/png-clipart/20250428/original/pngtree-young-male-engineer-3d-avatar-png-image_20880909.png',
}

function nameLike(u: AdminUserRow): string {
  return u.email ?? u.phone ?? u.id
}

function initialsFromUser(u: AdminUserRow): string {
  const base = nameLike(u).trim()
  if (!base) return 'U'
  if (base.includes('@')) return base.slice(0, 1).toUpperCase()
  const words = base.split(/\s+/).filter(Boolean)
  if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase()
  return words[0].slice(0, 2).toUpperCase()
}

function UserAvatar({ user }: { user: AdminUserRow }) {
  const [imgError, setImgError] = useState(false)
  const src = ROLE_AVATARS[user.role]
  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={user.role}
        onError={() => setImgError(true)}
        className="h-9 w-9 shrink-0 rounded-full object-cover border border-border bg-muted"
      />
    )
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold text-muted-foreground">
      {initialsFromUser(user)}
    </div>
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

export function UsersPage() {
  const navigate = useNavigate()
  const [initialLoading, setInitialLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState<Filter>({ role: '', status: '', includeDeleted: false })
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [sort, setSort] = useState<SortState>({ col: '', dir: null })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const didMountSearch = useRef(false)

  function loadList(next: { filter?: Filter; page?: number; query?: string } = {}) {
    const f = next.filter ?? filter
    const p = next.page ?? page
    const q = (next.query ?? query).trim()
    if (initialLoading) setInitialLoading(true)
    else setIsFetching(true)
    setErr(null)
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_LIMIT) })
    if (f.role) params.set('role', f.role)
    if (f.status) params.set('status', f.status)
    if (f.includeDeleted) params.set('include_deleted', 'true')
    if (q) params.set('search', q)
    apiGet<PaginatedBody<{ users: AdminUserRow[] }>>(`/admin/users?${params}`)
      .then((r) => {
        setRows(r.data.users)
        setTotal(r.meta.total)
        setTotalPages(r.meta.total_pages)
        setPage(r.meta.page)
        setSelected(new Set())
      })
      .catch((e: unknown) => setErr(e instanceof ApiRequestError ? e.message : 'Failed to load'))
      .finally(() => { setInitialLoading(false); setIsFetching(false) })
  }

  useEffect(() => { loadList({ page: 1 }) }, [])

  function applyFilter(next: Partial<Filter>) {
    const f = { ...filter, ...next }
    setFilter(f)
    loadList({ filter: f, page: 1 })
  }

  async function quickToggle(u: AdminUserRow, active: boolean) {
    const newStatus = active ? 'active' : 'suspended'
    setRows((r) => r.map((x) => (x.id === u.id ? { ...x, status: newStatus } : x)))
    try {
      await apiPatch(`/admin/users/${u.id}`, { status: newStatus })
      toast.success(`${u.email ?? u.id} ${active ? 'activated' : 'suspended'}.`)
    } catch (e) {
      setRows((r) => r.map((x) => (x.id === u.id ? { ...x, status: u.status } : x)))
      toast.error(e instanceof ApiRequestError ? e.message : 'Update failed')
    }
  }

  useEffect(() => {
    if (!didMountSearch.current) { didMountSearch.current = true; return }
    const t = setTimeout(() => loadList({ page: 1 }), 250)
    return () => clearTimeout(t)
  }, [query])

  function toggleSort(col: string) {
    setSort(s => nextSort(s, col))
  }

  const displayRows = useMemo(() => {
    if (!sort.col || !sort.dir) return rows
    return [...rows].sort((a, b) => {
      let va: string | number = ''
      let vb: string | number = ''
      if (sort.col === 'user')    { va = nameLike(a);     vb = nameLike(b) }
      else if (sort.col === 'role')   { va = a.role;           vb = b.role }
      else if (sort.col === 'status') { va = a.status;         vb = b.status }
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
  const activeFilterCount = [filter.role, filter.status, filter.includeDeleted].filter(Boolean).length

  const pageNumbers = useMemo(() => {
    const pages: number[] = []
    const left = Math.max(1, page - 2)
    const right = Math.min(totalPages, page + 2)
    for (let i = left; i <= right; i++) pages.push(i)
    return pages
  }, [page, totalPages])

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 mr-auto">
          <UsersIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {initialLoading ? '—' : total} user{total !== 1 ? 's' : ''}
            {filter.includeDeleted ? ' · incl. deactivated' : ''}
            {selected.size > 0 && <span className="ml-2 text-foreground">· {selected.size} selected</span>}
          </span>
        </div>

        <div className="relative w-full sm:w-64">
          {isFetching ? (
            <Loader2Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email or phone…"
            className="h-9 pl-9 text-sm"
          />
        </div>

        <Button
          size="sm"
          variant={showFilters || activeFilterCount > 0 ? 'secondary' : 'outline'}
          onClick={() => setShowFilters((v) => !v)}
          className="gap-1.5"
        >
          <FilterIcon className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
              {activeFilterCount}
            </span>
          )}
        </Button>

        <Button size="sm" asChild className="gap-1.5">
          <Link to="/users/new">
            <PlusIcon className="h-4 w-4" />
            Add user
          </Link>
        </Button>
      </div>

      {/* Filter strip */}
      {showFilters && (
        <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-muted/30 px-4 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <Select value={filter.role || 'all'} onValueChange={(v) => applyFilter({ role: v === 'all' ? '' : v })}>
              <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="worker">Worker</SelectItem>
                <SelectItem value="employer">Employer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={filter.status || 'all'} onValueChange={(v) => applyFilter({ status: v === 'all' ? '' : v })}>
              <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2.5 pb-0.5">
            <Switch
              id="incl-deleted"
              checked={filter.includeDeleted}
              onCheckedChange={(v) => applyFilter({ includeDeleted: v })}
            />
            <Label htmlFor="incl-deleted" className="cursor-pointer text-sm">
              Include deactivated
            </Label>
          </div>
          {activeFilterCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs text-muted-foreground"
              onClick={() => {
                const f = { role: '', status: '', includeDeleted: false }
                setFilter(f)
                loadList({ filter: f, page: 1 })
              }}
            >
              <XCircleIcon className="h-3.5 w-3.5" />
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className={cn(
        'overflow-hidden rounded-xl border bg-card transition-opacity',
        isFetching && !initialLoading && 'opacity-60',
      )}>
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
              <SortHead col="user"   label="User"   sort={sort} onSort={toggleSort} className="px-2" />
              <SortHead col="role"   label="Role"   sort={sort} onSort={toggleSort} className="px-2" />
              <SortHead col="status" label="Status" sort={sort} onSort={toggleSort} className="px-2" />
              <SortHead col="joined" label="Joined" sort={sort} onSort={toggleSort} className="hidden md:table-cell px-2" />
              <TableHead className="px-2 py-3 text-xs font-medium text-muted-foreground">Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialLoading && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={6} className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3.5 w-48" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {!initialLoading && err && (
              <TableRow>
                <TableCell colSpan={6} className="py-14">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <XCircleIcon className="h-7 w-7 text-destructive/50" />
                    <p className="text-sm text-muted-foreground">{err}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!initialLoading && !err && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-14">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                      <UsersIcon className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">No users found</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Try adjusting your search or filters.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!initialLoading && !err && displayRows.map((u) => {
              const isActive = u.status === 'active'
              const isDeactivated = !!u.deleted_at
              const blockStatusToggle = isDeactivated || u.role === 'admin'
              return (
                <TableRow
                  key={u.id}
                  className={cn(
                    'cursor-pointer hover:bg-muted/30 transition-colors',
                    isDeactivated && 'opacity-50',
                    selected.has(u.id) && 'bg-muted/20',
                  )}
                  onClick={() => navigate(`/users/${u.id}`)}
                >
                  <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(u.id)}
                      onCheckedChange={() => toggleRow(u.id)}
                      aria-label={`Select ${nameLike(u)}`}
                    />
                  </TableCell>
                  <TableCell className="py-3 px-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar user={u} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{nameLike(u)}</p>
                        {u.email && u.phone && (
                          <p className="truncate text-xs text-muted-foreground">{u.phone}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-2">
                    <RolePill role={u.role} />
                  </TableCell>
                  <TableCell className="px-2">
                    <StatusPill status={u.status} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell px-2 text-xs text-muted-foreground whitespace-nowrap">
                    {fmtDate(u.created_at)}
                  </TableCell>
                  <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={isActive}
                      disabled={blockStatusToggle}
                      onCheckedChange={(v) => quickToggle(u, v)}
                      aria-label={`Toggle ${u.email ?? u.id}`}
                      title={
                        u.role === 'admin' ? 'Admin status cannot be toggled here'
                          : isDeactivated ? 'Deactivated account' : ''
                      }
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!initialLoading && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Page <span className="font-medium text-foreground">{page}</span> of{' '}
            <span className="font-medium text-foreground">{Math.max(totalPages, 1)}</span>
            <span className="ml-1.5 text-muted-foreground/60">· {total} total</span>
          </p>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={!canPrev}
              onClick={() => loadList({ page: page - 1 })}>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            {pageNumbers.map((n) => (
              <Button
                key={n}
                type="button"
                variant={n === page ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8 text-xs"
                onClick={() => n !== page && loadList({ page: n })}
              >
                {n}
              </Button>
            ))}
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={!canNext}
              onClick={() => loadList({ page: page + 1 })}>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
