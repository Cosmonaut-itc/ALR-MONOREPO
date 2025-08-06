import { Skeleton } from "@/components/ui/skeleton"

export function SkeletonInventoryRow() {
  return (
    <div className="grid grid-cols-6 gap-4 py-3 border-b border-[#E5E7EB] dark:border-[#2D3033] last:border-b-0">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-6 w-12 rounded-full" />
    </div>
  )
}
