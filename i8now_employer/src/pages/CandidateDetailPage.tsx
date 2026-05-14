import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn, fmtDate } from '@/lib/utils'
import { ArrowLeft, Star, Bookmark, MessageSquare, CalendarPlus, Award } from 'lucide-react'

const MOCK = {
  user_id: 'usr_cand_1',
  full_name: 'Priya Sharma',
  bio: 'Experienced and versatile worker with 3+ years across retail, hospitality, and warehouse operations. Known for punctuality, strong communication skills, and an ability to adapt quickly to new environments. Actively seeking new opportunities.',
  kyc_status: 'approved',
  avg_rating: 4.7,
  total_shifts: 52,
  categories: ['Retail', 'Hospitality'],
  location: 'Mumbai, Maharashtra',
  phone: '+91 98765 43210',
  email: 'priya.sharma@email.com',
  documents: [{ type: 'Aadhaar Card', status: 'verified' }, { type: 'PAN Card', status: 'verified' }],
  qualifications: [{ name: 'HSC', institution: 'Mumbai Board', year: 2020 }, { name: 'Food Safety Certificate', institution: 'FSSAI', year: 2022 }],
  shift_history: [
    { title: 'Retail Associate', employer: 'Brand X', date: '2024-11-10', rating: 4.8 },
    { title: 'Event Staff', employer: 'Events Co', date: '2024-10-22', rating: 4.5 },
    { title: 'Warehouse Picker', employer: 'Logistics Ltd', date: '2024-09-15', rating: 4.9 },
  ],
}

export function CandidateDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showSchedule, setShowSchedule] = useState(false)

  const kycColor = MOCK.kyc_status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'

  return (
    <div className="p-6">
      <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — Profile */}
        <div className="space-y-5">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 text-xl font-bold text-white">
              {MOCK.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
            </div>
            <h1 className="text-lg font-semibold">{MOCK.full_name}</h1>
            <p className="text-sm text-zinc-500">{MOCK.location}</p>
            <div className="mt-3 flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={cn('h-4 w-4', s <= Math.round(MOCK.avg_rating) ? 'fill-amber-400 text-amber-400' : 'text-zinc-200')} />
              ))}
              <span className="ml-1 text-sm font-medium">{MOCK.avg_rating}</span>
            </div>
            <span className={cn('mt-3 inline-block rounded-md border px-2.5 py-0.5 text-xs font-medium capitalize', kycColor)}>
              KYC {MOCK.kyc_status}
            </span>
            <div className="mt-5 flex gap-2">
              <button onClick={() => toast.success('Added to shortlist')} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                <Bookmark className="h-3.5 w-3.5" /> Shortlist
              </button>
              <button onClick={() => toast.info('Messaging coming soon')} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                <MessageSquare className="h-3.5 w-3.5" /> Message
              </button>
            </div>
            <button onClick={() => setShowSchedule(true)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
              <CalendarPlus className="h-4 w-4" /> Schedule Interview
            </button>
          </div>

          {/* Stats */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold">Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Total Shifts</span>
                <span className="font-medium">{MOCK.total_shifts}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Avg Rating</span>
                <span className="font-medium">{MOCK.avg_rating} / 5</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Categories</span>
                <span className="font-medium">{MOCK.categories.join(', ')}</span>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold">Documents</h2>
            <div className="space-y-2">
              {MOCK.documents.map((d) => (
                <div key={d.type} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600">{d.type}</span>
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium capitalize text-emerald-700">{d.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right columns */}
        <div className="space-y-5 lg:col-span-2">
          {/* Bio */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">About</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">{MOCK.bio}</p>
          </div>

          {/* Qualifications */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold">Qualifications</h2>
            <div className="space-y-3">
              {MOCK.qualifications.map((q) => (
                <div key={q.name} className="flex items-start justify-between rounded-lg bg-zinc-50 p-3">
                  <div>
                    <p className="text-sm font-medium">{q.name}</p>
                    <p className="text-xs text-zinc-500">{q.institution}</p>
                  </div>
                  <span className="text-xs text-zinc-400">{q.year}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Shift History */}
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h2 className="text-sm font-semibold">Past Work History</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs text-zinc-400">
                  <th className="px-5 py-3 text-left font-medium">Role</th>
                  <th className="px-5 py-3 text-left font-medium">Employer</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-left font-medium">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {MOCK.shift_history.map((s) => (
                  <tr key={s.title + s.date}>
                    <td className="px-5 py-3 font-medium">{s.title}</td>
                    <td className="px-5 py-3 text-zinc-500">{s.employer}</td>
                    <td className="px-5 py-3 text-zinc-500">{fmtDate(s.date)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span>{s.rating}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
