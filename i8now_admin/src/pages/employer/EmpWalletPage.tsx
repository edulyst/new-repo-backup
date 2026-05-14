import { useEffect, useState } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import { cn, fmtMoney, fmtDate } from '@/lib/utils'
import { Wallet, ArrowDownLeft, ArrowUpRight, Send, TrendingDown, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

interface WalletData { balance: number; total_earned: number; total_spent: number; currency: string }
interface Transaction {
  _id: string; type: 'credit' | 'debit'; category: string; amount: number
  description?: string; balance_after: number; created_at: string
}

const inputCls   = 'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400'
const primaryBtn = 'flex-1 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50'
const cancelBtn  = 'flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-zinc-100', className)} />
}

export function EmpWalletPage() {
  const [wallet, setWallet]   = useState<WalletData | null>(null)
  const [txns, setTxns]       = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showPay, setShowPay] = useState(false)
  const [payForm, setPayForm] = useState({ worker_id: '', amount: '', description: '' })
  const [paying, setPaying]   = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [wRes, tRes] = await Promise.all([
        apiGet<{ data: { wallet: WalletData } }>('/employer/wallet'),
        apiGet<{ data: Transaction[] }>('/employer/wallet/transactions?limit=30'),
      ])
      setWallet(wRes.data?.wallet ?? null)
      setTxns(tRes.data ?? [])
    } catch { /* non-fatal */ }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  async function handlePay() {
    if (!payForm.worker_id || !payForm.amount) { toast.error('Worker ID and amount are required'); return }
    const amount = Number(payForm.amount)
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return }
    if (wallet && amount > wallet.balance) { toast.error('Insufficient balance'); return }
    setPaying(true)
    try {
      await apiPost('/employer/wallet/pay', {
        worker_id: payForm.worker_id, amount,
        description: payForm.description || `Payment to ${payForm.worker_id}`,
        reference_type: 'manual',
      })
      toast.success(`${fmtMoney(amount)} paid successfully`)
      setShowPay(false); setPayForm({ worker_id: '', amount: '', description: '' })
      void load()
    } catch (e: any) { toast.error(e.message ?? 'Payment failed') }
    finally { setPaying(false) }
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Wallet</h1>
          <p className="text-sm text-zinc-500">Manage your balance and pay workers.</p>
        </div>
        <button onClick={() => setShowPay(true)}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
          <Send className="h-4 w-4" /> Pay Worker
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />) : (
          <>
            <div className="rounded-xl border border-zinc-200 bg-zinc-900 p-5 text-white">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <Wallet className="h-4 w-4 text-white" />
              </div>
              <p className="text-xs font-medium text-zinc-400">Available Balance</p>
              <p className="mt-1 text-2xl font-bold">{fmtMoney(wallet?.balance ?? 0)}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{wallet?.currency ?? 'USD'}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-xs font-medium text-zinc-400">Total Received</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{fmtMoney(wallet?.total_earned ?? 0)}</p>
              <p className="mt-0.5 text-xs text-zinc-400">Lifetime credits</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                <TrendingDown className="h-4 w-4 text-red-500" />
              </div>
              <p className="text-xs font-medium text-zinc-400">Total Paid Out</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{fmtMoney(wallet?.total_spent ?? 0)}</p>
              <p className="mt-0.5 text-xs text-zinc-400">Payments to workers</p>
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Transaction History</h2>
        </div>
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : txns.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
              <Wallet className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-500">No transactions yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50/60">
              <tr>
                {['Type', 'Description', 'Date', 'Amount', 'Balance after'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {txns.map((t) => (
                <tr key={t._id} className="hover:bg-zinc-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('flex h-7 w-7 items-center justify-center rounded-full', t.type === 'credit' ? 'bg-emerald-50' : 'bg-red-50')}>
                        {t.type === 'credit' ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />}
                      </div>
                      <span className={cn('text-xs font-medium capitalize', t.type === 'credit' ? 'text-emerald-700' : 'text-red-600')}>{t.type}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{t.description ?? t.category}</td>
                  <td className="px-5 py-3 text-xs text-zinc-400">{fmtDate(t.created_at)}</td>
                  <td className={cn('px-5 py-3 font-semibold', t.type === 'credit' ? 'text-emerald-700' : 'text-red-600')}>
                    {t.type === 'credit' ? '+' : '−'}{fmtMoney(t.amount)}
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-zinc-500">{fmtMoney(t.balance_after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowPay(false)}>
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-sm font-semibold text-zinc-900">Pay a Worker</h3>
            <p className="mb-4 text-xs text-zinc-400">Transfer from your wallet balance to a worker.</p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Worker User ID *</label>
                <input value={payForm.worker_id} onChange={(e) => setPayForm({ ...payForm, worker_id: e.target.value })} placeholder="Paste worker's user ID" className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Amount *</label>
                <input type="number" min="1" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} placeholder="0" className={inputCls} />
                <p className="text-[10px] text-zinc-400">Available: {fmtMoney(wallet?.balance ?? 0)}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Description</label>
                <input value={payForm.description} onChange={(e) => setPayForm({ ...payForm, description: e.target.value })} placeholder="e.g. Weekly shift payment" className={inputCls} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowPay(false)} className={cancelBtn}>Cancel</button>
                <button onClick={handlePay} disabled={paying} className={primaryBtn}>{paying ? 'Processing…' : 'Send Payment'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
