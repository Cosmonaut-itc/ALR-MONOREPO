import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"

export function SkeletonKitInspectionRow() {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#F9FAFB] dark:bg-[#1E1F20]">
      <div className="flex items-center gap-3 flex-1">
        <Checkbox disabled />
        <div className="space-y-1 flex-1">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-6 w-20" />
    </div>
  )
}
