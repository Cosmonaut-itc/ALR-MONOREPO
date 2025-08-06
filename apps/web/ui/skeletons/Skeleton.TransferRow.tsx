import { Skeleton } from "@/components/ui/skeleton"

export function SkeletonTransferRow() {
  return (
    <div className="border-b border-border p-4 pl-8">
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  )
}
