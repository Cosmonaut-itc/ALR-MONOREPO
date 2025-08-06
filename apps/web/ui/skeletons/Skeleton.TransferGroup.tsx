import { Skeleton } from "@/components/ui/skeleton"

export function SkeletonTransferGroup() {
  return (
    <div className="border-b border-border bg-surface/60 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-4 rounded" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  )
}
