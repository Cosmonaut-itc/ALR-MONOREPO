import { Skeleton } from "@/components/ui/skeleton"

export function SkeletonTransferRow() {
  return (
    <div className="p-4 pl-8 border-b border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-4 rounded theme-transition" />
        <Skeleton className="h-4 w-20 theme-transition" />
        <Skeleton className="h-4 w-16 theme-transition" />
        <Skeleton className="h-4 flex-1 theme-transition" />
        <Skeleton className="h-5 w-24 rounded-full theme-transition" />
      </div>
    </div>
  )
}
