'use memo';

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function LoginSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#151718] theme-transition flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] shadow-lg card-transition">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <Skeleton className="h-12 w-12 rounded-full theme-transition" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 mx-auto theme-transition" />
              <Skeleton className="h-4 w-64 mx-auto theme-transition" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40 theme-transition" />
                <Skeleton className="h-11 w-full theme-transition" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20 theme-transition" />
                <Skeleton className="h-11 w-full theme-transition" />
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-11 w-full theme-transition" />
              <div className="flex items-center justify-center">
                <Skeleton className="h-4 w-40 theme-transition" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
