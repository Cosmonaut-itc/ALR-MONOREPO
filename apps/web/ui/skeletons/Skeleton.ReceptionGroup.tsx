'use memo';

import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"

export function SkeletonReceptionGroup() {
  return (
    <>
      {/* Group header row */}
      <TableRow className="bg-[#F9FAFB]/60 dark:bg-[#1E1F20]/60 theme-transition">
        <TableCell colSpan={4} className="py-3">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-4 w-20 theme-transition" />
            <Skeleton className="h-4 w-32 theme-transition" />
          </div>
        </TableCell>
      </TableRow>
      
      {/* Group items */}
      {Array.from({ length: 3 }).map((_, index) => (
        <TableRow key={index} className="border-b border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
          <TableCell className="pl-8">
            <Skeleton className="h-4 w-24 theme-transition" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20 theme-transition" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32 theme-transition" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-5 rounded theme-transition" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}
