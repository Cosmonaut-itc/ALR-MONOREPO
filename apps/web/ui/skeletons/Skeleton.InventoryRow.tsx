'use memo';

import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"

export function SkeletonInventoryRow() {
  return (
    <TableRow className="border-b border-[#E5E7EB] dark:border-[#2D3033]">
      <TableCell>
        <Skeleton className="h-4 w-32 bg-[#F9FAFB] dark:bg-[#2D3033]" />
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <Skeleton className="h-4 w-40 bg-[#F9FAFB] dark:bg-[#2D3033]" />
          <Skeleton className="h-3 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-8 bg-[#F9FAFB] dark:bg-[#2D3033]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20 bg-[#F9FAFB] dark:bg-[#2D3033]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-12 rounded-full bg-[#F9FAFB] dark:bg-[#2D3033]" />
      </TableCell>
    </TableRow>
  )
}
