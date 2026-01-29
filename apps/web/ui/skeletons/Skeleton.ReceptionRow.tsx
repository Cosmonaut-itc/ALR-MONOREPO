'use memo';

import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"

export function SkeletonReceptionRow() {
  return (
    <TableRow className="border-b border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
      <TableCell>
        <Skeleton className="h-4 w-24 theme-transition" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20 theme-transition" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-16 theme-transition" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-20 rounded-full theme-transition" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-20 theme-transition" />
      </TableCell>
    </TableRow>
  )
}
