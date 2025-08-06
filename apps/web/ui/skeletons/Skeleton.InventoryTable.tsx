import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function SkeletonInventoryTable() {
  return (
    <div className="space-y-4">
      {/* Filters Skeleton */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <Skeleton className="h-10 w-full bg-[#F9FAFB] dark:bg-[#2D3033]" />
        </div>
        <Skeleton className="h-10 w-full lg:w-48 bg-[#F9FAFB] dark:bg-[#2D3033]" />
        <Skeleton className="h-10 w-full lg:w-48 bg-[#F9FAFB] dark:bg-[#2D3033]" />
      </div>

      {/* Table Skeleton */}
      <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#1E1F20]">
        <CardHeader className="pb-3">
          <div className="flex space-x-4">
            <Skeleton className="h-4 w-32 bg-[#F9FAFB] dark:bg-[#2D3033]" />
            <Skeleton className="h-4 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
            <Skeleton className="h-4 w-16 bg-[#F9FAFB] dark:bg-[#2D3033]" />
            <Skeleton className="h-4 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
            <Skeleton className="h-4 w-20 bg-[#F9FAFB] dark:bg-[#2D3033]" />
            <Skeleton className="h-4 w-16 bg-[#F9FAFB] dark:bg-[#2D3033]" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex space-x-4 items-center">
              <Skeleton className="h-4 w-32 bg-[#F9FAFB] dark:bg-[#2D3033]" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-40 bg-[#F9FAFB] dark:bg-[#2D3033]" />
                <Skeleton className="h-3 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
              </div>
              <Skeleton className="h-4 w-8 bg-[#F9FAFB] dark:bg-[#2D3033]" />
              <Skeleton className="h-4 w-20 bg-[#F9FAFB] dark:bg-[#2D3033]" />
              <Skeleton className="h-4 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
              <Skeleton className="h-6 w-12 rounded-full bg-[#F9FAFB] dark:bg-[#2D3033]" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
