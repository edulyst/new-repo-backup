import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { headerForPath } from '@/routes/header-meta'
import { CopyIcon, ExternalLinkIcon, SparklesIcon } from 'lucide-react'
import { useLocation } from 'react-router-dom'

export function SiteHeader() {
  const { pathname } = useLocation()
  const { title, description } = headerForPath(pathname)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex w-full items-center justify-between gap-2 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
            {description ? (
              <p className="hidden text-sm text-muted-foreground sm:block">{description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" className="hidden sm:inline-flex">
            <SparklesIcon className="size-4" />
            What&apos;s new?
          </Button>
          <Button variant="outline" size="sm" className="hidden md:inline-flex">
            <CopyIcon className="size-4" />
            Copy link
          </Button>
          <Button size="sm">
            <ExternalLinkIcon className="size-4" />
            <span className="hidden sm:inline">View site</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
