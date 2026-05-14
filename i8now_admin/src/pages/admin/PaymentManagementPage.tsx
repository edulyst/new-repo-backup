import { useState } from 'react'
import { cn } from '@/lib/utils'
import { fmtDate, fmtMoney } from '@/lib/fmt'
import { Wallet, ArrowUpRight, ArrowDownLeft, TrendingUp, Search, BadgeIndianRupee } from 'lucide-react'

interface Transaction {
  id: string; type: 'credit' | 'debit'; category: string; amount: number
  from: string; to: string; status: string; created_at: string; description: string
}

const MOCK_TXN: Transaction[] = Array.from({ length: 20 }, (_, i) => ({
  id: `txn_${i}`,
  type: i % 3 === 0 ? 'credit' : 'debit',
  category: ['payment', 'refund', 'withdrawal', 'deposit', 'bonus', 'fee'][i % 6],
  amount: [5000, 12500, 8500, 25000, 2000, 15000, 3500][i % 7],
  from: ['Acme Corp', 'Nexus Retail', 'Event Masters', 'TechSupport Co'][i % 4],
  to: ['Priya Sharma', 'Rohan Mehta', 'Anjali Gupta', 'Arjun Kumar', 'System'][i % 5],
  status: ['completed', 'completed', 'pending', 'completed', 'failed'][i % 5],
  created_at: new Date(Date.now() - i * 86400000 * 0.5).toISOString(),
  description: ['Worker payment for Oct shifts', 'Refund for cancelled shift', 'Wallet withdrawal', 'Platform deposit', 'Performance bonus'][i % 5],
}))

const STATUS_COLOR: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-red-50 text-red-600 border-red-200',
  reversed: 'bg-zinc-100 text-zinc-500 border-zinc-200',
}

const MONTH_DATA = [
  { month: 'Oct', volume: 285000, count: 42 },
  { month: 'Nov', volume: 312000, count: 48 },
  { month: 'Dec', volume: 428000, count: 65 },
  { month: 'Jan', volume: 356000, count: 54 },
  { month: 'Feb', volume: 390000, count: 58 },
  { month: 'Mar', volume: 475000, count: 72 },
]
const maxVol = Math.max(...MONTH_DATA.map(m => m.volume))

export function PaymentManagementPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const total_volume = MOCK_TXN.reduce((s, t) => s + t.amount, 0)
  const total_payments = MOCK_TXN.filter(t => t.category === 'payment').reduce((s, t) => s + t.amount, 0)
  const pending_count = MOCK_TXN.filter(t => t.status === 'pending').length
  const failed_count = MOCK_TXN.filter(t => t.status === 'failed').length

  const filtered = MOCK_TXN.filter((t) => {
    const q = search.toLowerCase()
    const matchSearch = !search || t.from.toLowerCase().includes(q) || t.to.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    const matchType = typeFilter === 'all' || t.type === typeFilter
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Payment Management</h1>
        <p className="text-sm text-muted-foreground">Monitor all wallet transactions and payment flows</p>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: 'Total Volume', value: fmtMoney(total_volume), icon: Wallet, color: 'text-zinc-900' },
          { label: 'Payments Out', value: fmtMoney(total_payments), icon: ArrowUpRight, color: 'text-red-500' },
          { label: 'Pending', value: pending_count.toString(), icon: TrendingUp, color: 'text-amber-500' },
          { label: 'Failed', value: failed_count.toString(), icon: BadgeIndianRupee, color: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className={cn('h-4 w-4', s.color)} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      <div className="mb-6 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Monthly Transaction Volume</h2>
        <div className="flex items-end gap-3 h-32">
          {MONTH_DATA.map((m) => (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
              <p className="text-xs text-muted-foreground">{fmtMoney(m.volume).replace('₹', '').replace(',000', 'K')}</p>
              <div className="w-full rounded-t bg-zinc-900 transition-all" style={{ height: `${(m.volume / maxVol) * 90}%` }} />
              <p className="text-xs text-muted-foreground">{m.month}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-6 text-xs text-muted-foreground">
          {MONTH_DATA.map((m) => (
            <span key={m.month}>{m.month}: {m.count} txns</span>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions..." className="w-full rounded-lg border bg-background py-2.5 pl-9 pr-4 text-sm outline-none focus:border-foreground" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border bg-background px-3 py-2.5 text-sm outline-none">
          <option value="all">All Types</option>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border bg-background px-3 py-2.5 text-sm outline-none">
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Transaction</th>
              <th className="px-4 py-3 text-left font-medium">From</th>
              <th className="px-4 py-3 text-left font-medium">To</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', t.type === 'credit' ? 'bg-emerald-50' : 'bg-red-50')}>
                      {t.type === 'credit' ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />}
                    </div>
                    <span className="text-xs text-muted-foreground truncate max-w-36">{t.description}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{t.from}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{t.to}</td>
                <td className="px-4 py-3 capitalize text-sm text-muted-foreground">{t.category}</td>
                <td className={cn('px-4 py-3 font-semibold', t.type === 'credit' ? 'text-emerald-600' : 'text-zinc-900')}>
                  {t.type === 'credit' ? '+' : '-'}{fmtMoney(t.amount)}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{fmtDate(t.created_at)}</td>
                <td className="px-4 py-3">
                  <span className={cn('rounded-md border px-2.5 py-0.5 text-xs font-medium capitalize', STATUS_COLOR[t.status])}>{t.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Showing {filtered.length} of {MOCK_TXN.length} transactions
        </div>
      </div>
    </div>
  )
}
