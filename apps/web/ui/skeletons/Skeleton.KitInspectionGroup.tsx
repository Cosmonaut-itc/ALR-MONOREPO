import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

export function SkeletonKitInspectionGroup() {
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        {/* Group header */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#E5E7EB] dark:border-[#2D3033]">
          <div className="flex items-center gap-3">
            <Checkbox disabled />
            <div className="space-y-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
        
        {/* Group items */}
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#F9FAFB] dark:bg-[#1E1F20]">
              <div className="flex items-center gap-3 flex-1">
                <Checkbox disabled />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
