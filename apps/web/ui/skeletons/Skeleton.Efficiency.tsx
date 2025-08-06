import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function SkeletonEfficiency() {
  return (
    <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
      <CardHeader>
        <CardTitle className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
          <Skeleton className="h-6 w-40 theme-transition" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <Skeleton className="aspect-square w-48 rounded-full theme-transition" />
      </CardContent>
    </Card>
  )
}
