import { useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ApiRequestError, apiGet } from '@/lib/api'
import type { AdminOverviewDashboard } from '@/types/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

type OverviewRes = { status: string; data: AdminOverviewDashboard }

export function OverviewPage() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [data, setData] = useState<AdminOverviewDashboard | null>(null)

  useEffect(() => {
    setLoading(true)
    setErr(null)
    apiGet<OverviewRes>('/admin/overview')
      .then((r) => setData(r.data))
      .catch((e: unknown) => setErr(e instanceof ApiRequestError ? e.message : 'Failed to load overview'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 p-4 lg:p-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (err || !data) {
    return <div className="p-6 text-sm text-destructive">{err ?? 'Overview unavailable'}</div>
  }

  return (
    <div className="grid gap-4 p-4 lg:p-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Metric title="Total users" value={data.cards.users_total} desc="Active (not deleted) accounts" />
        <Metric title="Workers" value={data.cards.workers_total} desc={`14d growth ${data.cards.growth_workers_pct}%`} />
        <Metric title="Employers" value={data.cards.employers_total} desc="Employer accounts on platform" />
        <Metric title="Open timesheets" value={data.cards.timesheets_open} desc="Open + pending queue" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Operational trend (last 14 days)</CardTitle>
            <CardDescription>Workers created vs docs uploaded vs docs approved</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend}>
                <defs>
                  <linearGradient id="workersFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="docsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="approvedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="workers_created" stroke="#0ea5e9" fill="url(#workersFill)" />
                <Area type="monotone" dataKey="docs_uploaded" stroke="#f59e0b" fill="url(#docsFill)" />
                <Area type="monotone" dataKey="kyc_approved" stroke="#22c55e" fill="url(#approvedFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>KYC health</CardTitle>
            <CardDescription>Current verification pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="KYC pending" value={data.kyc.pending} badge="warning" />
            <Row label="KYC approved" value={data.kyc.approved} badge="success" />
            <Row label="Docs pending" value={data.kyc.docs_pending} badge="warning" />
            <Row label="Docs approved" value={data.kyc.docs_approved} badge="success" />
            <Row label="Timesheets approved (14d)" value={data.productivity.timesheets_approved_14d} />
            <Row label="New workers (14d)" value={data.productivity.new_workers_14d} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Metric({ title, value, desc }: { title: string; value: number; desc: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{desc}</CardContent>
    </Card>
  )
}

function Row({ label, value, badge }: { label: string; value: number; badge?: 'success' | 'warning' }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        {badge === 'success' ? <Badge className="bg-emerald-100 text-emerald-700">{value}</Badge> : null}
        {badge === 'warning' ? <Badge className="bg-amber-100 text-amber-700">{value}</Badge> : null}
        {!badge ? <span className="font-semibold">{value}</span> : null}
      </div>
    </div>
  )
}
