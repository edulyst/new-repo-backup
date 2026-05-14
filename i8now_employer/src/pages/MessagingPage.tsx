import { useState } from 'react'
import { cn, fmtDateTime } from '@/lib/utils'
import { Send, Search, MessageSquare } from 'lucide-react'

interface Conv { id: string; name: string; last: string; time: string; unread: number; online: boolean }
interface Msg { id: string; from: 'me' | 'them'; body: string; time: string }

const CONVS: Conv[] = [
  { id: 'c1', name: 'Priya Sharma', last: 'Looking forward to the interview!', time: new Date(Date.now() - 30 * 60000).toISOString(), unread: 2, online: true },
  { id: 'c2', name: 'Rohan Mehta', last: 'I have attached my CV.', time: new Date(Date.now() - 3 * 3600000).toISOString(), unread: 0, online: false },
  { id: 'c3', name: 'Anjali Gupta', last: 'Thank you for the opportunity!', time: new Date(Date.now() - 24 * 3600000).toISOString(), unread: 0, online: true },
]

const MSGS: Record<string, Msg[]> = {
  c1: [
    { id: 'm1', from: 'me', body: 'Hi Priya, I came across your profile and I\'m impressed with your experience. Are you available for a quick call?', time: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: 'm2', from: 'them', body: 'Hello! Yes, I am available. When would be a good time?', time: new Date(Date.now() - 1.5 * 3600000).toISOString() },
    { id: 'm3', from: 'me', body: 'How about tomorrow at 3pm via video call?', time: new Date(Date.now() - 1 * 3600000).toISOString() },
    { id: 'm4', from: 'them', body: 'Looking forward to the interview!', time: new Date(Date.now() - 30 * 60000).toISOString() },
  ],
  c2: [
    { id: 'm1', from: 'me', body: 'Hi Rohan, we have a warehouse role opening that matches your profile.', time: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: 'm2', from: 'them', body: 'I have attached my CV.', time: new Date(Date.now() - 3 * 3600000).toISOString() },
  ],
  c3: [
    { id: 'm1', from: 'me', body: 'Congratulations Anjali! You\'ve been selected for the hospitality role.', time: new Date(Date.now() - 25 * 3600000).toISOString() },
    { id: 'm2', from: 'them', body: 'Thank you for the opportunity!', time: new Date(Date.now() - 24 * 3600000).toISOString() },
  ],
}

export function MessagingPage() {
  const [activeConv, setActiveConv] = useState<string | null>('c1')
  const [search, setSearch] = useState('')
  const [newMsg, setNewMsg] = useState('')
  const [messages, setMessages] = useState(MSGS)

  const filtered = CONVS.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
  const conv = CONVS.find((c) => c.id === activeConv)
  const msgs = activeConv ? messages[activeConv] ?? [] : []

  function sendMsg(e: React.FormEvent) {
    e.preventDefault()
    if (!newMsg.trim() || !activeConv) return
    const msg: Msg = { id: `m${Date.now()}`, from: 'me', body: newMsg.trim(), time: new Date().toISOString() }
    setMessages({ ...messages, [activeConv]: [...msgs, msg] })
    setNewMsg('')
  }

  return (
    <div className="flex h-full">
      {/* Conversation List */}
      <div className="flex w-72 shrink-0 flex-col border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 p-4">
          <h1 className="mb-3 text-sm font-semibold">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-zinc-900" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => setActiveConv(c.id)} className={cn('flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-zinc-50', activeConv === c.id && 'bg-zinc-50')}>
              <div className="relative flex-shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                  {c.name.split(' ').map((x) => x[0]).join('')}
                </div>
                {c.online && <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-900">{c.name}</p>
                  {c.unread > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">{c.unread}</span>}
                </div>
                <p className="truncate text-xs text-zinc-400">{c.last}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {conv ? (
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-6 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
              {conv.name.split(' ').map((x) => x[0]).join('')}
            </div>
            <div>
              <p className="font-medium">{conv.name}</p>
              <p className="text-xs text-zinc-400">{conv.online ? 'Online' : 'Offline'}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50">
            {msgs.map((m) => (
              <div key={m.id} className={cn('flex', m.from === 'me' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-xs rounded-2xl px-4 py-2.5', m.from === 'me' ? 'bg-zinc-900 text-white rounded-br-sm' : 'bg-white border border-zinc-200 text-zinc-900 rounded-bl-sm shadow-sm')}>
                  <p className="text-sm">{m.body}</p>
                  <p className={cn('mt-1 text-xs', m.from === 'me' ? 'text-zinc-400' : 'text-zinc-400')}>{fmtDateTime(m.time)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={sendMsg} className="flex items-center gap-3 border-t border-zinc-200 bg-white p-4">
            <input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Type a message..." className="flex-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-zinc-900" />
            <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 transition-colors">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center bg-zinc-50">
          <div className="text-center">
            <MessageSquare className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-sm text-zinc-400">Select a conversation</p>
          </div>
        </div>
      )}
    </div>
  )
}
