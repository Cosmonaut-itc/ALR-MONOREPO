'use memo';

import { TableRow, TableCell } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

const SKELETON_ROWS = ["row-1", "row-2", "row-3"]

export function SkeletonKitInspectionGroup() {
  return (
    <>
      {/* Group header skeleton */}
      <TableRow className="bg-[#F9FAFB]/60 dark:bg-[#1E1F20]/60">
        <TableCell colSpan={4} className="py-3">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </TableCell>
      </TableRow>
      
      {/* Group items skeleton */}
      {SKELETON_ROWS.map((key) => (
        <TableRow key={key} className="border-b border-[#E5E7EB] dark:border-[#2D3033]">
          <TableCell className="pl-8">
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-5 rounded" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}
