'use memo';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const SKELETON_ROWS = ["row-1", "row-2", "row-3", "row-4"]

export function SkeletonActiveEmployees() {
  return (
    <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>👥</span>
          <Skeleton className="h-6 w-36 theme-transition" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {SKELETON_ROWS.map((key) => (
          <div key={key} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full theme-transition" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24 theme-transition" />
              <Skeleton className="h-3 w-32 theme-transition" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
