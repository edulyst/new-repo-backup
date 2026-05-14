import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  title: string
  description?: string
}

export function PlaceholderPage({ title, description }: Props) {
  return (
    <div className="p-4 lg:p-6">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      </Card>
    </div>
  )
}
