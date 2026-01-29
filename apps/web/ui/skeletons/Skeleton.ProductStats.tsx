'use memo';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const SKELETON_ROWS = ["row-1", "row-2", "row-3", "row-4", "row-5"]

export function SkeletonProductStats() {
  return (
    <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
      <CardHeader>
        <CardTitle className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
          <Skeleton className="h-6 w-48 theme-transition" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {SKELETON_ROWS.map((key) => (
          <div key={key} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-2 w-2 rounded-full theme-transition" />
              <Skeleton className="h-4 w-32 theme-transition" />
            </div>
            <Skeleton className="h-4 w-8 theme-transition" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
