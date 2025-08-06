import { TableRow, TableCell } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

export function SkeletonKitInspectionRow() {
  return (
    <TableRow className="border-b border-[#E5E7EB] dark:border-[#2D3033]">
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
  )
}
