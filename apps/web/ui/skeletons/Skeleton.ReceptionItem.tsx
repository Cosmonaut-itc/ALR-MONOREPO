'use memo';

import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"

export function SkeletonReceptionItem() {
  return (
    <TableRow className="border-b border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
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
  )
}
