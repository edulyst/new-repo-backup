import { useState } from 'react'
import { cn } from '@/lib/utils'
import { BookmarkCheck, Plus, Trash2, X, Users } from 'lucide-react'
import { toast } from 'sonner'

interface Shortlist {
  id: string
  name: string
  description: string
  count: number
  created_at: string
}

const MOCK: Shortlist[] = [
  { id: 'sl1', name: 'Retail Associates Q1', description: 'Candidates for the Q1 retail expansion', count: 12, created_at: '2024-12-01' },
  { id: 'sl2', name: 'Warehouse Operators', description: 'Pre-screened warehouse candidates', count: 7, created_at: '2024-11-20' },
  { id: 'sl3', name: 'Hospitality Staff', description: 'Event and F&B candidates', count: 15, created_at: '2024-11-10' },
]

export function ShortlistsPage() {
  const [shortlists, setShortlists] = useState(MOCK)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })

  function createShortlist(e: React.FormEvent) {
    e.preventDefault()
    setShortlists([{ id: `sl${Date.now()}`, ...form, count: 0, created_at: new Date().toISOString().split('T')[0] }, ...shortlists])
    setShowForm(false)
    setForm({ name: '', description: '' })
    toast.success('Shortlist created')
  }

  function deleteShortlist(id: string) {
    setShortlists(shortlists.filter((s) => s.id !== id))
    toast.success('Shortlist deleted')
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Shortlists</h1>
          <p className="text-sm text-zinc-500">Organize and manage candidate pools</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
          <Plus className="h-4 w-4" /> New Shortlist
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shortlists.map((sl) => (
          <div key={sl.id} className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                <BookmarkCheck className="h-5 w-5 text-zinc-600" />
              </div>
              <button onClick={() => deleteShortlist(sl.id)} className="rounded-md p-1.5 text-zinc-300 hover:bg-zinc-100 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <h3 className="font-semibold text-zinc-900">{sl.name}</h3>
            <p className="mt-1 text-sm text-zinc-500 line-clamp-2">{sl.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                <Users className="h-4 w-4" />
                <span>{sl.count} candidates</span>
              </div>
              <button className="text-xs font-medium text-zinc-900 hover:underline">View →</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
              <h2 className="font-semibold">Create Shortlist</h2>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={createShortlist} className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900" placeholder="e.g. Retail Associates Q1" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-900 resize-none" placeholder="What is this shortlist for?" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600">Cancel</button>
                <button type="submit" className="flex-1 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
