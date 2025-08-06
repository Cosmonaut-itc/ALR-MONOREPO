import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function SkeletonDisposeDialog() {
  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
        <DialogHeader>
          <DialogTitle>
            <Skeleton className="h-6 w-48 bg-[#F9FAFB] dark:bg-[#2D3033]" />
          </DialogTitle>
          <DialogDescription>
            <Skeleton className="h-4 w-full bg-[#F9FAFB] dark:bg-[#2D3033] mt-2" />
            <Skeleton className="h-4 w-3/4 bg-[#F9FAFB] dark:bg-[#2D3033] mt-1" />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Info Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16 bg-[#F9FAFB] dark:bg-[#2D3033]" />
            <Skeleton className="h-10 w-full bg-[#F9FAFB] dark:bg-[#2D3033]" />
          </div>

          {/* Barcode Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
            <Skeleton className="h-10 w-full bg-[#F9FAFB] dark:bg-[#2D3033]" />
          </div>

          {/* UUID Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-12 bg-[#F9FAFB] dark:bg-[#2D3033]" />
            <Skeleton className="h-10 w-full bg-[#F9FAFB] dark:bg-[#2D3033]" />
          </div>

          {/* Reason Selection Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 bg-[#F9FAFB] dark:bg-[#2D3033]" />
            <Skeleton className="h-10 w-full bg-[#F9FAFB] dark:bg-[#2D3033]" />
          </div>

          {/* Warning Skeleton */}
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <Skeleton className="h-4 w-4 bg-red-200 dark:bg-red-800 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-full bg-red-200 dark:bg-red-800" />
              <Skeleton className="h-4 w-2/3 bg-red-200 dark:bg-red-800" />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Skeleton className="h-10 w-20 bg-[#F9FAFB] dark:bg-[#2D3033]" />
          <Skeleton className="h-10 w-24 bg-red-200 dark:bg-red-800" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
