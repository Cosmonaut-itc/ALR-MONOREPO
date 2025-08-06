import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog"

export function SkeletonDisposeDialog() {
  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#151718] border-[#E5E7EB] dark:border-[#2D3033]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 bg-[#F9FAFB] dark:bg-[#2D3033]" />
            <Skeleton className="h-6 w-40 bg-[#F9FAFB] dark:bg-[#2D3033]" />
          </div>
          <Skeleton className="h-4 w-full bg-[#F9FAFB] dark:bg-[#2D3033] mt-2" />
          <Skeleton className="h-4 w-3/4 bg-[#F9FAFB] dark:bg-[#2D3033]" />
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Skeleton className="h-4 w-16 bg-[#F9FAFB] dark:bg-[#2D3033]" />
            <Skeleton className="h-10 w-full bg-[#F9FAFB] dark:bg-[#2D3033]" />
          </div>

          <div className="grid gap-2">
            <Skeleton className="h-4 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
            <Skeleton className="h-10 w-full bg-[#F9FAFB] dark:bg-[#2D3033]" />
          </div>

          <div className="grid gap-2">
            <Skeleton className="h-4 w-12 bg-[#F9FAFB] dark:bg-[#2D3033]" />
            <Skeleton className="h-10 w-full bg-[#F9FAFB] dark:bg-[#2D3033]" />
          </div>

          <div className="grid gap-2">
            <Skeleton className="h-4 w-20 bg-[#F9FAFB] dark:bg-[#2D3033]" />
            <Skeleton className="h-10 w-full bg-[#F9FAFB] dark:bg-[#2D3033]" />
          </div>
        </div>

        <DialogFooter>
          <Skeleton className="h-10 w-20 bg-[#F9FAFB] dark:bg-[#2D3033]" />
          <Skeleton className="h-10 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
