import { cn } from '@/lib/utils'

export const USER_ROLES = ['worker', 'employer', 'admin'] as const
export const USER_STATUSES = ['pending', 'active', 'suspended', 'banned'] as const

const statusBadge: Record<string, string> = {
  active:    'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending:   'border-amber-200 bg-amber-50 text-amber-700',
  suspended: 'border-orange-200 bg-orange-50 text-orange-700',
  banned:    'border-red-200 bg-red-50 text-red-700',
}
const statusDot: Record<string, string> = {
  active:    'bg-emerald-500',
  pending:   'bg-amber-400',
  suspended: 'bg-orange-400',
  banned:    'bg-red-500',
}

export function RolePill({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
      {role}
    </span>
  )
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium',
      statusBadge[status] ?? 'border-zinc-200 bg-zinc-50 text-zinc-600',
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full', statusDot[status] ?? 'bg-zinc-400')} />
      {status}
    </span>
  )
}

export function Section({ label, labelCls, children }: { label: string; labelCls?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className={cn('text-xs font-semibold uppercase tracking-wider', labelCls ?? 'text-muted-foreground')}>{label}</p>
      {children}
    </div>
  )
}

export function DL({ children }: { children: React.ReactNode }) {
  return <dl className="divide-y rounded-lg border text-sm">{children}</dl>
}

export function DR({ label, value, cls }: { label: string; value: React.ReactNode; cls?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={cn('text-right font-medium break-all min-w-0', cls)}>{value ?? '—'}</dd>
    </div>
  )
}
