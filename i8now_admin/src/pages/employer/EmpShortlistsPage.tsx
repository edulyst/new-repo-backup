import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import { cn } from '@/lib/utils'
import { BookmarkCheck, Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'

interface Shortlist { _id: string; name: string; description?: string; candidate_count?: number; created_at?: string }

export function EmpShortlistsPage() {
  const [shortlists, setShortlists] = useState<Shortlist[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ name: '', description: '' })
  const [saving, setSaving]         = useState(false)

  function loadLists() {
    setLoading(true)
    apiGet<{ data: { shortlists: Shortlist[] } }>('/employer/shortlists')
      .then((r) => setShortlists(r.data?.shortlists ?? []))
      .catch(() => setShortlists([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadLists() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await apiPost('/employer/shortlists', form)
      toast.success('Shortlist created')
      setShowForm(false); setForm({ name: '', description: '' }); loadLists()
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this shortlist?')) return
    try {
      await apiDelete(`/employer/shortlists/${id}`)
      setShortlists((prev) => prev.filter((s) => s._id !== id))
      toast.success('Shortlist deleted')
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Shortlists</h1>
          <p className="text-sm text-zinc-500">Organize candidate pools for your roles.</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
          <Plus className="h-4 w-4" /> New Shortlist
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-zinc-100" />)}
        </div>
      ) : shortlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
            <BookmarkCheck className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-700">No shortlists yet</p>
          <p className="mt-1 text-xs text-zinc-400">Create a shortlist to group candidates for a role.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shortlists.map((sl) => (
            <div key={sl._id} className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                  <BookmarkCheck className="h-5 w-5 text-zinc-600" />
                </div>
                <button onClick={() => handleDelete(sl._id)}
                  className="rounded-md p-1.5 text-zinc-300 hover:bg-zinc-100 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="font-semibold text-zinc-900">{sl.name}</h3>
              {sl.description && <p className="mt-1 text-sm text-zinc-500 line-clamp-2">{sl.description}</p>}
              <div className="mt-4 flex items-center gap-1.5 text-sm text-zinc-500">
                <Users className="h-4 w-4" />
                <span>{sl.candidate_count ?? 0} candidates</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-zinc-900">Create Shortlist</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-700">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900" placeholder="e.g. Retail Associates Q1" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3} className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900 resize-none" placeholder="What is this shortlist for?" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
                  {saving ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
