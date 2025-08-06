import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ProductStockItem, ProductCatalog } from "@/lib/schemas"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface InventoryTableProps {
  items: (ProductStockItem & { productInfo: ProductCatalog | undefined })[]
}

export function InventoryTable({ items }: InventoryTableProps) {
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A"
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: es })
    } catch {
      return "N/A"
    }
  }

  const getWarehouseName = (warehouse: number) => {
    return warehouse === 1 ? "General" : "Gabinete"
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
        <div className="flex items-center justify-center py-12">
          <p className="text-[#687076] dark:text-[#9BA1A6] text-transition">
            No se encontraron productos
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-[#E5E7EB] dark:border-[#2D3033] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033]">
            <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
              Código de barras
            </TableHead>
            <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
              Nombre
            </TableHead>
            <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
              Usos
            </TableHead>
            <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
              Último uso
            </TableHead>
            <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
              Usado por
            </TableHead>
            <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
              ¿En uso?
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow 
              key={item.id} 
              className="border-b border-[#E5E7EB] dark:border-[#2D3033] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition"
            >
              <TableCell className="font-mono text-sm text-[#687076] dark:text-[#9BA1A6] text-transition">
                {item.barcode}
              </TableCell>
              <TableCell className="font-medium text-[#11181C] dark:text-[#ECEDEE] text-transition">
                <div>
                  <div>{item.productInfo?.name || "Producto desconocido"}</div>
                  <div className="text-xs text-[#687076] dark:text-[#9BA1A6]">
                    {item.productInfo?.category} • {getWarehouseName(item.currentWarehouse)}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
                {item.numberOfUses}
              </TableCell>
              <TableCell className="text-[#687076] dark:text-[#9BA1A6] text-transition">
                {formatDate(item.lastUsed)}
              </TableCell>
              <TableCell className="text-[#687076] dark:text-[#9BA1A6] text-transition">
                {item.lastUsedBy || "N/A"}
              </TableCell>
              <TableCell>
                <Badge 
                  variant={item.isBeingUsed ? "default" : "secondary"}
                  className={
                    item.isBeingUsed 
                      ? "bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90" 
                      : "bg-[#F9FAFB] dark:bg-[#2D3033] text-[#687076] dark:text-[#9BA1A6] hover:bg-[#E5E7EB] dark:hover:bg-[#1E1F20]"
                  }
                >
                  {item.isBeingUsed ? "Sí" : "No"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
