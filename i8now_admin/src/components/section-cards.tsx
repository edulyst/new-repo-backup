import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { TrendingUpIcon } from 'lucide-react'

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 xl:grid-cols-3 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Sales</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            $8,764.22
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="border-foreground/20 bg-muted/50 text-foreground">
              <TrendingUpIcon className="size-3.5" />
              +2%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          Compared to previous period
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Views</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            112,440
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="border-foreground/20 bg-muted/50 text-foreground">
              <TrendingUpIcon className="size-3.5" />
              +5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">Page views this month</CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active now</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            96
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="border-foreground/20 bg-muted/50 text-foreground">
              <TrendingUpIcon className="size-3.5" />
              +4%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">Live sessions in the last hour</CardFooter>
      </Card>
    </div>
  )
}
