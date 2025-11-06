'use memo';

import { Skeleton } from "@/components/ui/skeleton"

export function SkeletonTransferGroup() {
  return (
    <div className="bg-[#F9FAFB]/60 dark:bg-[#1E1F20]/60 p-4 border-b border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-4 rounded theme-transition" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded theme-transition" />
          <Skeleton className="h-4 w-48 theme-transition" />
          <Skeleton className="h-5 w-20 rounded-full theme-transition" />
        </div>
      </div>
    </div>
  )
}
