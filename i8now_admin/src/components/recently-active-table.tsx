import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { EllipsisVerticalIcon, StarIcon } from 'lucide-react'

type ActiveUserRow = {
  id: string
  name: string
  email: string
  avatar: string | null
  status: 'Enabled' | 'Disabled'
  progress: number
  rating: number
}

const sample: ActiveUserRow[] = [
  {
    id: '1',
    name: 'Lana Steiner',
    email: 'lana@i8now.local',
    avatar: null,
    status: 'Enabled',
    progress: 78,
    rating: 4,
  },
  {
    id: '2',
    name: 'Phoenix Baker',
    email: 'phoenix@i8now.local',
    avatar: null,
    status: 'Enabled',
    progress: 62,
    rating: 5,
  },
  {
    id: '3',
    name: 'Candice Wu',
    email: 'candice@i8now.local',
    avatar: null,
    status: 'Enabled',
    progress: 45,
    rating: 3,
  },
  {
    id: '4',
    name: 'Olivia Rhye',
    email: 'olivia@i8now.local',
    avatar: null,
    status: 'Enabled',
    progress: 91,
    rating: 5,
  },
]

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function Stars({ value }: { value: number }) {
  const v = Number.isFinite(value) ? Math.min(5, Math.max(0, Math.round(value))) : 0
  return (
    <div className="flex items-center gap-0.5" aria-label={`${v} of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          className={`size-4 shrink-0 ${i < v ? 'fill-foreground/50 text-foreground' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  )
}

export function RecentlyActiveTable() {
  return (
    <div className="px-4 lg:px-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">Recently active</h2>
        <p className="text-sm text-muted-foreground">
          Team members and customers active in the last 30 days.
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-10 pl-4">
                <Checkbox aria-label="Select all" />
              </TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px]">Progress</TableHead>
              <TableHead className="w-[140px]">Rating</TableHead>
              <TableHead className="w-12 pr-4 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sample.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="pl-4">
                  <Checkbox aria-label={`Select ${row.name}`} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9 rounded-lg">
                      {row.avatar ? (
                        <AvatarImage src={row.avatar} alt="" />
                      ) : null}
                      <AvatarFallback className="rounded-lg text-xs">
                        {initials(row.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{row.name}</div>
                      <div className="truncate text-sm text-muted-foreground">{row.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-foreground/20 bg-muted/50 text-foreground">
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Progress value={row.progress} className="h-2 flex-1" />
                    <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                      {row.progress}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Stars value={row.rating} />
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <EllipsisVerticalIcon className="size-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View profile</DropdownMenuItem>
                      <DropdownMenuItem>Message</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
