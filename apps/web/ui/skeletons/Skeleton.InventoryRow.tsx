// Create the inventory row skeleton

import { Skeleton } from "@/components/ui/skeleton"

export function SkeletonInventoryRow() {
  return (
    <div className="p-4">
      <div className="grid grid-cols-5 gap-4 items-center">
        <Skeleton className="h-4 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
        <Skeleton className="h-4 w-32 bg-[#F9FAFB] dark:bg-[#2D3033]" />
        <Skeleton className="h-4 w-8 bg-[#F9FAFB] dark:bg-[#2D3033]" />
        <Skeleton className="h-4 w-20 bg-[#F9FAFB] dark:bg-[#2D3033]" />
        <Skeleton className="h-6 w-12 rounded-full bg-[#F9FAFB] dark:bg-[#2D3033]" />
      </div>
    </div>
  )
}
