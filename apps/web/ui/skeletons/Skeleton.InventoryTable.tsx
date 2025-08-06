import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SkeletonInventoryRow } from "./Skeleton.InventoryRow"

export function SkeletonInventoryTable() {
  return (
    <div className="space-y-4">
      {/* Search and filters skeleton */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Skeleton className="h-10 flex-1 theme-transition" />
        <Skeleton className="h-10 w-48 theme-transition" />
      </div>
      
      {/* Table skeleton */}
      <div className="rounded-md border border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#E5E7EB] dark:border-[#2D3033]">
              <TableHead className="w-32">
                <Skeleton className="h-4 w-24 theme-transition" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-20 theme-transition" />
              </TableHead>
              <TableHead className="w-24">
                <Skeleton className="h-4 w-16 theme-transition" />
              </TableHead>
              <TableHead className="w-32">
                <Skeleton className="h-4 w-20 theme-transition" />
              </TableHead>
              <TableHead className="w-20">
                <Skeleton className="h-4 w-12 theme-transition" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, index) => (
              <SkeletonInventoryRow key={index} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
