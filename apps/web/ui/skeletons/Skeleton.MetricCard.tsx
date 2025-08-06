import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function SkeletonMetricCard() {
  return (
    <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-lg theme-transition" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24 theme-transition" />
            <Skeleton className="h-8 w-16 theme-transition" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
