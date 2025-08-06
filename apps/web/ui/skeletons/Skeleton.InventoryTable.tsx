// Create the inventory table skeleton

import { Skeleton } from "@/components/ui/skeleton"
import { SkeletonInventoryRow } from "./Skeleton.InventoryRow"

export function SkeletonInventoryTable() {
  return (
    <div className="space-y-4">
      {/* Filters skeleton */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Skeleton className="h-10 w-full bg-[#F9FAFB] dark:bg-[#2D3033]" />
        </div>
        <Skeleton className="h-10 w-full sm:w-48 bg-[#F9FAFB] dark:bg-[#2D3033]" />
      </div>
      
      {/* Table skeleton */}
      <div className="rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
        {/* Header skeleton */}
        <div className="border-b border-[#E5E7EB] dark:border-[#2D3033] p-4">
          <div className="grid grid-cols-5 gap-4">
            <Skeleton className="h-4 bg-[#F9FAFB] dark:bg-[#2D3033]" />
            <Skeleton className="h-4 bg-[#F9FAFB] dark:bg-[#2D3033]" />
            <Skeleton className="h-4 bg-[#F9FAFB] dark:bg-[#2D3033]" />
            <Skeleton className="h-4 bg-[#F9FAFB] dark:bg-[#2D3033]" />
            <Skeleton className="h-4 bg-[#F9FAFB] dark:bg-[#2D3033]" />
          </div>
        </div>
        
        {/* Rows skeleton */}
        <div className="divide-y divide-[#E5E7EB] dark:divide-[#2D3033]">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonInventoryRow key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
