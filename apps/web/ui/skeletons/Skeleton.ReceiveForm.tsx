import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function SkeletonReceiveForm() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 theme-transition" />
        <Skeleton className="h-10 w-full theme-transition" />
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 theme-transition" />
        <Skeleton className="h-10 w-full theme-transition" />
      </div>

      {/* Lines section */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-24 theme-transition" />
        
        {/* Mock lines */}
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28 theme-transition" />
                  <Skeleton className="h-10 w-full theme-transition" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 theme-transition" />
                  <Skeleton className="h-10 w-full theme-transition" />
                </div>
                <div className="flex items-end">
                  <Skeleton className="h-10 w-20 theme-transition" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add line button */}
        <Skeleton className="h-10 w-32 theme-transition" />
      </div>

      {/* Submit buttons */}
      <div className="flex justify-end space-x-2">
        <Skeleton className="h-10 w-20 theme-transition" />
        <Skeleton className="h-10 w-32 theme-transition" />
      </div>
    </div>
  )
}
