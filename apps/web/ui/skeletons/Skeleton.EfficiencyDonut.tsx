import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function SkeletonEfficiencyDonut() {
  return (
    <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>📈</span>
          <Skeleton className="h-6 w-48 theme-transition" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-8">
        <Skeleton className="aspect-square w-64 rounded-full theme-transition" />
      </CardContent>
    </Card>
  )
}
