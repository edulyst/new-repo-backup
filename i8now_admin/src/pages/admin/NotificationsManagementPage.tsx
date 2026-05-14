import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { apiGet, apiPost, apiPatch, ApiRequestError } from '@/lib/api'
import { toast } from 'sonner'
import {
  AtSign, Bell, BellRing, CheckCheck, ChevronRight,
  Clock, Code2, FileCode2, History, KeyRound, LayoutGrid, Mail, MessageSquareDot,
  MessageSquareText, Newspaper, PenLine, Radio, RotateCcw, Search, Send,
  ShieldAlert, Smartphone, Type, Upload, UserPlus, Users, Zap,
  Building2, UserRound, Globe, XCircle, AlertTriangle, CheckCircle2,
} from 'lucide-react'

// ─── Backend types ─────────────────────────────────────────────────────────────

type ChannelDoc = {
  channel_id: string
  group: 'email' | 'in-app'
  title: string
  description: string
  tag: string
  enabled: boolean
}

type NotificationRecord = {
  _id: string
  title: string
  body: string
  channel: 'email' | 'in-app' | 'both'
  audience_type: string
  recipients_count: number
  status: 'queued' | 'processing' | 'delivered' | 'partial' | 'failed' | 'scheduled'
  sent_at?: string
  open_count: number
  created_at: string
}

type Stats = {
  emailEnabled: number; emailTotal: number
  inAppEnabled: number; inAppTotal: number
  delivered: number; scheduled: number; total: number
  audienceSizes: { all: number; workers: number; employers: number; unverified: number }
}

// ─── Static UI metadata ────────────────────────────────────────────────────────

type Tab = 'compose' | 'bulk' | 'history' | 'channels'

type BulkAudienceMeta = {
  id: 'all' | 'workers' | 'employers' | 'unverified'
  icon: React.ElementType; label: string; description: string
}

const BULK_AUDIENCES: BulkAudienceMeta[] = [
  { id: 'all',        icon: Globe,        label: 'All Users',          description: 'Every registered account on the platform' },
  { id: 'workers',    icon: UserRound,    label: 'All Workers',        description: 'Active and inactive worker profiles'       },
  { id: 'employers',  icon: Building2,    label: 'All Employers',      description: 'Employer accounts and their sub-users'     },
  { id: 'unverified', icon: AlertTriangle,label: 'Unverified Workers', description: 'Workers with pending KYC verification'     },
]

const CHANNEL_ICON_MAP: Record<string, React.ElementType> = {
  'new-user': UserPlus, 'security-alerts': ShieldAlert, 'weekly-digest': Newspaper,
  'otp': KeyRound, 'approval-updates': CheckCircle2, 'task-reminders': BellRing,
  'system-banner': Zap, 'direct-messages': MessageSquareDot,
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function NotificationsManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('compose')
  const [stats, setStats]         = useState<Stats | null>(null)
  const [channels, setChannels]   = useState<ChannelDoc[]>([])
  const [statsLoading, setStatsLoading] = useState(true)

  const loadStats = useCallback(async () => {
    try {
      const res = await apiGet<{ data: Stats }>('/admin/notifications/stats')
      setStats(res.data)
    } catch { /* non-fatal */ }
    finally { setStatsLoading(false) }
  }, [])

  const loadChannels = useCallback(async () => {
    try {
      const res = await apiGet<{ data: { channels: ChannelDoc[] } }>('/admin/notifications/channels')
      setChannels(res.data.channels)
    } catch { /* non-fatal */ }
  }, [])

  useEffect(() => { void loadStats(); void loadChannels() }, [loadStats, loadChannels])

  async function handleToggleChannel(channelId: string, enabled: boolean) {
    setChannels((prev) => prev.map((c) => c.channel_id === channelId ? { ...c, enabled } : c))
    try {
      await apiPatch(`/admin/notifications/channels/${channelId}`, { enabled })
      void loadStats()
    } catch (e) {
      setChannels((prev) => prev.map((c) => c.channel_id === channelId ? { ...c, enabled: !enabled } : c))
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not update channel')
    }
  }

  const MAIN_TABS: { id: Tab; icon: React.ElementType; label: string; sub: string }[] = [
    { id: 'compose',  icon: PenLine,    label: 'Compose',         sub: 'Create a notification'                                                           },
    { id: 'bulk',     icon: Radio,      label: 'Bulk Push',       sub: 'Broadcast to audiences'                                                          },
    { id: 'history',  icon: History,    label: 'Send History',    sub: `${stats?.total ?? 0} records`                                                    },
    { id: 'channels', icon: LayoutGrid, label: 'Channels',        sub: `${(stats?.emailEnabled ?? 0) + (stats?.inAppEnabled ?? 0)} active`               },
  ]

  return (
    <div className="min-h-full space-y-6 p-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Compose, broadcast, and configure all platform notifications.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Live
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard icon={Mail}       label="Email Channels"  value={`${stats?.emailEnabled ?? 0} / ${stats?.emailTotal ?? 0}`}  sub="active channels"    />
            <StatCard icon={Bell}       label="In-App Channels" value={`${stats?.inAppEnabled ?? 0} / ${stats?.inAppTotal ?? 0}`}  sub="active channels"    />
            <StatCard icon={CheckCheck} label="Delivered (30d)" value={String(stats?.delivered ?? 0)}                              sub="notifications sent" />
            <StatCard icon={Users}      label="Total Audience"  value={(stats?.audienceSizes.all ?? 0).toLocaleString()}           sub="reachable accounts" />
          </>
        )}
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-xl border bg-card">
        {/* Tab bar */}
        <div className="grid grid-cols-2 border-b sm:grid-cols-4">
          {MAIN_TABS.map((t) => {
            const Icon = t.icon; const active = activeTab === t.id
            return (
              <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
                className={cn(
                  'relative flex items-center gap-3 border-r px-5 py-4 text-left transition-colors last:border-r-0',
                  active ? 'bg-background' : 'bg-muted/30 hover:bg-muted/60'
                )}>
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                  active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="hidden min-w-0 sm:block">
                  <div className={cn('text-sm font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.sub}</div>
                </div>
                {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground" />}
              </button>
            )
          })}
        </div>

        {activeTab === 'compose'  && <ComposeTab audienceSizes={stats?.audienceSizes} onSent={loadStats} />}
        {activeTab === 'bulk'     && <BulkPushTab audienceSizes={stats?.audienceSizes} onSent={loadStats} />}
        {activeTab === 'history'  && <HistoryTab />}
        {activeTab === 'channels' && <ChannelsTab channels={channels} onToggle={handleToggleChannel} />}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Compose & Send
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrapper { max-width: 560px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e4e4e7; }
  .header { background: #18181b; padding: 28px 32px; }
  .header-logo { color: #fff; font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
  .header-logo span { color: #a1a1aa; font-weight: 400; }
  .body { padding: 36px 32px; }
  .greeting { font-size: 13px; color: #71717a; margin-bottom: 20px; }
  .title { font-size: 22px; font-weight: 700; color: #18181b; letter-spacing: -0.4px; line-height: 1.3; }
  .divider { height: 1px; background: #f4f4f5; margin: 20px 0; }
  .message { font-size: 14px; color: #52525b; line-height: 1.7; }
  .cta { display: inline-block; margin-top: 28px; background: #18181b; color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 24px; border-radius: 8px; }
  .footer { background: #fafafa; border-top: 1px solid #f4f4f5; padding: 20px 32px; }
  .footer-text { font-size: 11px; color: #a1a1aa; line-height: 1.6; }
  .footer-link { color: #71717a; text-decoration: underline; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="header-logo">i8now <span>Platform</span></div>
  </div>
  <div class="body">
    <p class="greeting">Hello,</p>
    <h1 class="title">{{title}}</h1>
    <div class="divider"></div>
    <p class="message">{{body}}</p>
    <a href="#" class="cta">View in Platform →</a>
  </div>
  <div class="footer">
    <p class="footer-text">
      You're receiving this because you have an account on the i8now platform.<br/>
      <a href="#" class="footer-link">Unsubscribe</a> · <a href="#" class="footer-link">Privacy Policy</a>
    </p>
  </div>
</div>
</body>
</html>`

function ComposeTab({ audienceSizes, onSent }: { audienceSizes?: Stats['audienceSizes']; onSent?: () => void }) {
  const [title, setTitle]           = useState('')
  const [body, setBody]             = useState('')
  const [channel, setChannel]       = useState<'email' | 'in-app' | 'both'>('both')
  const [audience, setAudience]     = useState<'all' | 'workers' | 'employers' | 'unverified'>('all')
  const [schedule, setSchedule]     = useState<'now' | 'later'>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading]       = useState(false)
  const [emailMode, setEmailMode]   = useState<'plain' | 'html'>('plain')
  const [htmlContent, setHtmlContent] = useState(DEFAULT_HTML_TEMPLATE)
  const [htmlTab, setHtmlTab]       = useState<'code' | 'preview'>('code')
  const fileInputRef                = useRef<HTMLInputElement>(null)

  const audienceCount = audienceSizes?.[audience] ?? 0
  const showEmailOptions = channel === 'email' || channel === 'both'
  // When any email channel + HTML mode: the HTML carries all content, plain fields are hidden
  const htmlOnlyMode = showEmailOptions && emailMode === 'html'

  const renderedHtml = htmlContent
    .replace(/\{\{title\}\}/g, title || 'Notification title')
    .replace(/\{\{body\}\}/g, body || 'Your message body will appear here.')

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      toast.error('Please upload an HTML file (.html or .htm)')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setHtmlContent(ev.target?.result as string)
      setHtmlTab('preview')
      toast.success('Template loaded successfully')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleSend() {
    if (!htmlOnlyMode && (!title.trim() || !body.trim())) {
      toast.error('Title and message are required'); return
    }
    if (showEmailOptions && emailMode === 'html' && !htmlContent.trim()) {
      toast.error('HTML template cannot be empty'); return
    }
    setLoading(true)
    try {
      await apiPost('/admin/notifications/send', {
        title: title.trim() || '(HTML Email)',
        body: body.trim() || '(see HTML template)',
        channel,
        audience_type: audience,
        ...(showEmailOptions && emailMode === 'html' ? { html_template: renderedHtml } : {}),
        ...(schedule === 'later' && scheduledAt ? { scheduled_at: scheduledAt } : {}),
      })
      toast.success(schedule === 'later' ? 'Notification scheduled!' : 'Notification queued for delivery!')
      setTitle(''); setBody('')
      onSent?.()
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not send notification')
    } finally { setLoading(false) }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_400px]">
      {/* ── Form ── */}
      <div className="space-y-5 border-r p-6">
        <div>
          <h2 className="text-sm font-semibold">New Notification</h2>
          <p className="text-xs text-muted-foreground">Fill in the details and choose delivery options.</p>
        </div>

        {!htmlOnlyMode && (
          <>
            <Field label="Title" required>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Platform maintenance this weekend"
                className="w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-foreground" />
            </Field>

            <Field label="Message" required>
              <textarea value={body} onChange={(e) => setBody(e.target.value)}
                placeholder="Write your notification message here…" rows={4}
                className="w-full resize-none rounded-lg border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-foreground" />
              <p className="text-right text-xs text-muted-foreground">{body.length} / 2000</p>
            </Field>
          </>
        )}

        <Field label="Channel">
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'email',  icon: Mail,             label: 'Email'  },
              { id: 'in-app', icon: MessageSquareText, label: 'In-App' },
              { id: 'both',   icon: Send,              label: 'Both'   },
            ] as { id: 'email'|'in-app'|'both'; icon: React.ElementType; label: string }[]).map((c) => {
              const Icon = c.icon; const active = channel === c.id
              return (
                <button key={c.id} type="button" onClick={() => setChannel(c.id)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all',
                    active ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground'
                  )}>
                  <Icon className="h-3.5 w-3.5" />{c.label}
                </button>
              )
            })}
          </div>
        </Field>

        {/* ── Email template ── */}
        {showEmailOptions && (
          <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email Template</p>
                <p className="text-xs text-muted-foreground">Choose plain text or a custom HTML template</p>
              </div>
              <div className="flex gap-1 rounded-lg border bg-background p-1">
                <button type="button" onClick={() => setEmailMode('plain')}
                  className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    emailMode === 'plain' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}>
                  <Type className="h-3 w-3" /> Plain
                </button>
                <button type="button" onClick={() => setEmailMode('html')}
                  className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    emailMode === 'html' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}>
                  <Code2 className="h-3 w-3" /> HTML
                </button>
              </div>
            </div>

            {emailMode === 'html' && (
              <div className="space-y-2">
                {/* Sub-tabs: Code / Preview */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 rounded-lg border bg-background p-1">
                    <button type="button" onClick={() => setHtmlTab('code')}
                      className={cn('flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                        htmlTab === 'code' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}>
                      <FileCode2 className="h-3 w-3" /> Code
                    </button>
                    <button type="button" onClick={() => setHtmlTab('preview')}
                      className={cn('flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                        htmlTab === 'preview' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}>
                      <Bell className="h-3 w-3" /> Preview
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => { setHtmlContent(DEFAULT_HTML_TEMPLATE); toast.success('Reset to default template') }}
                      className="flex items-center gap-1 rounded-md border bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition hover:text-foreground">
                      <RotateCcw className="h-3 w-3" /> Reset
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 rounded-md border bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition hover:text-foreground">
                      <Upload className="h-3 w-3" /> Upload .html
                    </button>
                    <input ref={fileInputRef} type="file" accept=".html,.htm" className="hidden" onChange={handleFileUpload} />
                  </div>
                </div>

                {htmlTab === 'code' ? (
                  <div className="relative overflow-hidden rounded-lg border">
                    <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
                      <span className="text-[11px] font-mono text-muted-foreground">template.html</span>
                      <span className="text-[10px] text-muted-foreground">Use <code className="font-mono">{'{{title}}'}</code> and <code className="font-mono">{'{{body}}'}</code> as placeholders</span>
                    </div>
                    <textarea
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      rows={12}
                      spellCheck={false}
                      className="w-full resize-y bg-background px-4 py-3 font-mono text-[11px] leading-relaxed text-foreground outline-none"
                    />
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border bg-white">
                    <div className="flex items-center gap-2 border-b bg-muted/20 px-3 py-2">
                      <div className="flex gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
                        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
                        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
                      </div>
                      <span className="flex-1 rounded border bg-background px-2 py-0.5 text-center text-[10px] text-muted-foreground">Email preview</span>
                    </div>
                    <iframe
                      srcDoc={renderedHtml}
                      title="Email preview"
                      className="h-72 w-full"
                      sandbox="allow-same-origin"
                    />
                  </div>
                )}
              </div>
            )}

            {emailMode === 'plain' && (
              <p className="text-xs text-muted-foreground">
                Email will be sent as a simple formatted message using the title and message body above.
              </p>
            )}
          </div>
        )}

        <Field label="Audience">
          <div className="grid grid-cols-2 gap-2">
            {BULK_AUDIENCES.map((a) => {
              const Icon = a.icon; const active = audience === a.id
              return (
                <button key={a.id} type="button" onClick={() => setAudience(a.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 text-left transition-all',
                    active ? 'border-foreground bg-foreground/5' : 'border-border bg-background hover:border-foreground/40'
                  )}>
                  <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                    active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-foreground">{a.label}</div>
                    <div className="text-xs text-muted-foreground">{(audienceSizes?.[a.id] ?? 0).toLocaleString()} users</div>
                  </div>
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="Schedule">
          <div className="flex gap-2">
            {([{ id: 'now', label: 'Send now' }, { id: 'later', label: 'Schedule' }] as const).map((s) => (
              <button key={s.id} type="button" onClick={() => setSchedule(s.id)}
                className={cn(
                  'flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all',
                  schedule === s.id ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                )}>
                {s.label}
              </button>
            ))}
          </div>
          {schedule === 'later' && (
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-2 w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground" />
          )}
        </Field>

        <Button
          onClick={handleSend}
          disabled={
            loading ||
            (htmlOnlyMode ? !htmlContent.trim() : (!title.trim() || !body.trim()))
          }
          className="w-full gap-2 py-6 text-sm font-semibold"
        >
          {loading
            ? 'Sending…'
            : <><Send className="h-4 w-4" /> {schedule === 'now' ? 'Send notification' : 'Schedule notification'}</>
          }
        </Button>
      </div>

      {/* ── Right panel: preview ── */}
      <div className="flex flex-col gap-5 bg-muted/20 p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Preview</h3>

        {(channel === 'in-app' || channel === 'both') && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">In-App notification</p>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-semibold">{title || 'Notification title'}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{body || 'Your message body…'}</div>
                  <div className="mt-2 text-[10px] text-muted-foreground/60">Just now · i8now Admin</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {(channel === 'email' || channel === 'both') && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Email</p>
            {emailMode === 'html' ? (
              <div className="overflow-hidden rounded-xl border bg-white">
                <div className="border-b bg-muted/40 px-4 py-2.5">
                  <div className="text-[11px] text-muted-foreground">From: <span className="font-medium text-foreground">i8now Platform</span></div>
                  <div className="text-[11px] text-muted-foreground">Subject: <span className="font-medium text-foreground">{title || 'Notification title'}</span></div>
                </div>
                <iframe
                  srcDoc={renderedHtml}
                  title="Email preview"
                  className="h-64 w-full"
                  sandbox="allow-same-origin"
                />
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border bg-card">
                <div className="border-b bg-muted/40 px-4 py-2.5">
                  <div className="text-[11px] text-muted-foreground">From: <span className="font-medium text-foreground">i8now Platform</span></div>
                  <div className="text-[11px] text-muted-foreground">Subject: <span className="font-medium text-foreground">{title || 'Notification title'}</span></div>
                </div>
                <div className="space-y-2 px-4 py-4">
                  <div className="text-sm font-semibold">{title || 'Notification title'}</div>
                  <div className="text-xs leading-relaxed text-muted-foreground">{body || 'Your message body…'}</div>
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[11px] font-medium text-background">
                      View in platform <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl border bg-card p-4 space-y-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery summary</h4>
          <Row label="Recipients" value={audienceCount.toLocaleString()} />
          <Row label="Channel"    value={channel === 'both' ? 'Email + In-App' : channel === 'email' ? 'Email only' : 'In-App only'} />
          <Row label="Email type" value={showEmailOptions ? (emailMode === 'html' ? 'Custom HTML' : 'Plain text') : '—'} />
          <Row label="Schedule"   value={schedule === 'now' ? 'Immediate' : 'Scheduled'} />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk Push
// ─────────────────────────────────────────────────────────────────────────────

function BulkPushTab({ audienceSizes, onSent }: { audienceSizes?: Stats['audienceSizes']; onSent?: () => void }) {
  const [selected, setSelected] = useState<'all' | 'workers' | 'employers' | 'unverified' | null>(null)
  const [message, setMessage]   = useState('')
  const [loading, setLoading]   = useState(false)

  const TEMPLATES = [
    { id: 'maintenance',     label: 'Maintenance window',  body: 'Scheduled maintenance on Sunday 02:00–04:00 UTC. The platform may be briefly unavailable.' },
    { id: 'new-feature',     label: 'New feature',         body: "We've launched a new feature! Log in to the platform to explore what's new." },
    { id: 'action-required', label: 'Action required',     body: 'Your account requires attention. Please log in and complete the required steps.' },
    { id: 'digest',          label: 'Activity digest',     body: 'Here is your weekly summary of activity across your account.' },
  ]

  async function handleBulk() {
    if (!selected || !message.trim()) { toast.error('Select an audience and write a message'); return }
    setLoading(true)
    try {
      await apiPost('/admin/notifications/send', {
        title: `Broadcast to ${BULK_AUDIENCES.find((a) => a.id === selected)?.label ?? selected}`,
        body: message.trim(),
        channel: 'both',
        audience_type: selected,
      })
      toast.success('Broadcast queued for delivery!')
      setMessage('')
      onSent?.()
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : 'Could not send broadcast')
    } finally { setLoading(false) }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px]">
      {/* Form */}
      <div className="space-y-5 border-r p-6">
        <div>
          <h2 className="text-sm font-semibold">Bulk Push Notification</h2>
          <p className="text-xs text-muted-foreground">Select an audience and send a broadcast to everyone in that group.</p>
        </div>

        <Field label="Audience">
          <div className="grid gap-2 sm:grid-cols-2">
            {BULK_AUDIENCES.map((a) => {
              const Icon = a.icon; const active = selected === a.id
              return (
                <button key={a.id} type="button" onClick={() => setSelected(active ? null : a.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-4 text-left transition-all',
                    active ? 'border-foreground bg-foreground/5' : 'border-border bg-background hover:border-foreground/40'
                  )}>
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                    active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{a.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{a.description}</div>
                    <div className="mt-1.5 text-xs font-medium text-muted-foreground">
                      {(audienceSizes?.[a.id] ?? 0).toLocaleString()} accounts
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="Message" required>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your bulk notification message…" rows={4}
            className="w-full resize-none rounded-lg border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-foreground" />
        </Field>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Quick templates</p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <button key={t.id} type="button" onClick={() => setMessage(t.body)}
                className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition hover:border-foreground/40 hover:text-foreground">
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleBulk} disabled={!selected || !message.trim() || loading} className="w-full gap-2">
          {loading ? 'Broadcasting…' : <><Radio className="h-3.5 w-3.5" /> Broadcast to {selected ? BULK_AUDIENCES.find((a) => a.id === selected)?.label : 'audience'}</>}
        </Button>
      </div>

      {/* Right: summary */}
      <div className="flex flex-col gap-5 bg-muted/20 p-6">
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Broadcast summary</h4>
          <Row label="Audience"   value={selected ? (BULK_AUDIENCES.find((a) => a.id === selected)?.label ?? '—') : 'None selected'} />
          <Row label="Recipients" value={selected ? (audienceSizes?.[selected] ?? 0).toLocaleString() : '—'} />
          <Row label="Channel"    value="Email + In-App" />
          <Row label="Schedule"   value="Immediate" />
        </div>

        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Bulk pushes are delivered immediately to all matching accounts. Double-check your audience and message before sending.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// History
// ─────────────────────────────────────────────────────────────────────────────

function HistoryTab() {
  const [records, setRecords] = useState<NotificationRecord[]>([])
  const [total, setTotal]     = useState(0)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '30', status: filter, ...(search ? { search } : {}) })
      const res = await apiGet<{ data: NotificationRecord[]; meta: { total: number } }>(`/admin/notifications/history?${params}`)
      setRecords(res.data)
      setTotal(res.meta.total)
    } catch { /* non-fatal */ }
    finally { setLoading(false) }
  }, [filter, search])

  useEffect(() => { void load() }, [load])

  const displayed = useMemo(() => {
    if (!search) return records
    const q = search.toLowerCase()
    return records.filter((r) => r.title.toLowerCase().includes(q) || r.audience_type.includes(q))
  }, [records, search])

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notifications…"
            className="w-full rounded-lg border bg-background py-2.5 pl-9 pr-4 text-sm outline-none focus:border-foreground" />
        </div>
        <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
          {(['all', 'delivered', 'partial', 'failed', 'scheduled', 'queued'] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                filter === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              {['Notification', 'Channel', 'Audience', 'Recipients', 'Sent at', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
              ))
            ) : displayed.map((r) => (
              <tr key={r._id} className="transition-colors hover:bg-muted/20">
                <td className="max-w-xs px-4 py-3"><span className="block truncate font-medium">{r.title}</span></td>
                <td className="px-4 py-3"><ChannelBadge channel={r.channel} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{r.audience_type.replace('_', ' ')}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.recipients_count.toLocaleString()}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{fmtDate(r.sent_at ?? r.created_at)}</td>
                <td className="px-4 py-3"><StatusPill status={r.status} /></td>
              </tr>
            ))}
            {!loading && displayed.length === 0 && (
              <tr><td colSpan={6} className="py-16 text-center text-sm text-muted-foreground">No records found</td></tr>
            )}
          </tbody>
        </table>
        <div className="border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
          Showing {displayed.length} of {total} records
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel Settings
// ─────────────────────────────────────────────────────────────────────────────

function ChannelsTab({ channels, onToggle }: { channels: ChannelDoc[]; onToggle: (id: string, val: boolean) => void }) {
  const [group, setGroup] = useState<'email' | 'in-app'>('email')
  const visible = channels.filter((c) => c.group === group)

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-sm font-semibold">Channel Settings</h2>
        <p className="text-xs text-muted-foreground">Enable or disable individual notification channels. Changes sync immediately.</p>
      </div>

      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1 w-fit">
        {([{ id: 'email', icon: AtSign, label: 'Email' }, { id: 'in-app', icon: Smartphone, label: 'In-App' }] as const).map((t) => {
          const Icon = t.icon
          return (
            <button key={t.id} type="button" onClick={() => setGroup(t.id)}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                group === t.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}>
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-xl border divide-y">
        {visible.map((ch, i) => {
          const Icon = CHANNEL_ICON_MAP[ch.channel_id] ?? Bell
          return (
            <div key={ch.channel_id} className={cn('flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/20', !ch.enabled && 'opacity-50')}>
              <span className="w-5 shrink-0 text-center text-xs font-mono text-muted-foreground/40">{String(i + 1).padStart(2, '0')}</span>
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                ch.enabled ? 'bg-foreground/8 text-foreground' : 'bg-muted text-muted-foreground')}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{ch.title}</span>
                  <span className="rounded border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{ch.tag}</span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{ch.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={cn('hidden text-xs font-medium sm:block', ch.enabled ? 'text-foreground' : 'text-muted-foreground')}>
                  {ch.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <Switch checked={ch.enabled} onCheckedChange={(val) => onToggle(ch.channel_id, val)} aria-label={ch.title} />
              </div>
            </div>
          )
        })}
        {visible.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">No channels found</div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
        <p className="text-xs text-muted-foreground">{visible.filter((c) => c.enabled).length} of {visible.length} {group} channels active</p>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Changes sync immediately
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared atoms
// ─────────────────────────────────────────────────────────────────────────────

function Field({ label, required, optional, children }: { label: string; required?: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium">
        {label}
        {required && <span className="text-destructive">*</span>}
        {optional && <span className="text-xs font-normal text-muted-foreground">(optional)</span>}
      </label>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function StatusPill({ status }: { status: NotificationRecord['status'] }) {
  const styles: Record<string, { label: string; icon: React.ElementType; dot: string }> = {
    delivered:  { label: 'Delivered',  icon: CheckCheck,    dot: 'bg-emerald-500' },
    partial:    { label: 'Partial',    icon: AlertTriangle, dot: 'bg-yellow-500'  },
    failed:     { label: 'Failed',     icon: XCircle,       dot: 'bg-red-500'     },
    scheduled:  { label: 'Scheduled',  icon: Clock,         dot: 'bg-blue-500'    },
    queued:     { label: 'Queued',     icon: Clock,         dot: 'bg-muted-foreground' },
    processing: { label: 'Processing', icon: Zap,           dot: 'bg-muted-foreground' },
  }
  const s = styles[status] ?? styles.queued
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground">
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />{s.label}
    </span>
  )
}

function ChannelBadge({ channel }: { channel: 'email' | 'in-app' | 'both' }) {
  if (channel === 'both') return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex w-fit items-center gap-1 rounded border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"><Mail className="h-3 w-3" /> Email</span>
      <span className="inline-flex w-fit items-center gap-1 rounded border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"><Bell className="h-3 w-3" /> In-App</span>
    </div>
  )
  if (channel === 'email') return (
    <span className="inline-flex items-center gap-1 rounded border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"><Mail className="h-3 w-3" /> Email</span>
  )
  return (
    <span className="inline-flex items-center gap-1 rounded border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"><Bell className="h-3 w-3" /> In-App</span>
  )
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
