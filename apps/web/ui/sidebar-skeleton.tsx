'use memo';

import { Skeleton } from "@/components/ui/skeleton"

const SKELETON_ITEMS = [
  "nav-1",
  "nav-2",
  "nav-3",
  "nav-4",
  "nav-5",
  "nav-6",
]

export function SidebarSkeleton() {
  return (
    <div className="flex h-full w-64 flex-col bg-[#F9FAFB] dark:bg-[#1E1F20] border-r border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-[#E5E7EB] dark:border-[#2D3033]">
        <Skeleton className="h-8 w-8 rounded-lg theme-transition" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-24 theme-transition" />
          <Skeleton className="h-3 w-32 theme-transition" />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 mb-4 theme-transition" />
          {SKELETON_ITEMS.map((key) => (
            <div key={key} className="flex items-center gap-2 p-2">
              <Skeleton className="h-4 w-4 theme-transition" />
              <Skeleton className="h-4 w-20 theme-transition" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
