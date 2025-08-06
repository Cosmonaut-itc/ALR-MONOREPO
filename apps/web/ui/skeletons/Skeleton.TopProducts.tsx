import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function SkeletonTopProducts() {
  return (
    <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🔥</span>
          <Skeleton className="h-6 w-48 theme-transition" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-2 w-2 rounded-full theme-transition" />
              <Skeleton className="h-4 w-32 theme-transition" />
            </div>
            <Skeleton className="h-4 w-12 theme-transition" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
