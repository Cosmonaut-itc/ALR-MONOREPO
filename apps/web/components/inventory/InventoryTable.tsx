import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Copy, Eye, Trash2 } from 'lucide-react'
import type { ProductStockItem, ProductCatalog } from "@/lib/schemas"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { DisposeItemDialog } from "./DisposeItemDialog"
import { useDisposalStore } from "@/stores/disposal-store"

interface InventoryTableProps {
  items: (ProductStockItem & { productInfo: ProductCatalog | undefined })[]
}

export function InventoryTable({ items }: InventoryTableProps) {
  const { show: showDisposeDialog } = useDisposalStore()

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
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
    <>
      <div className="rounded-md border border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#E5E7EB] dark:border-[#2D3033] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033]">
              <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                UUID
              </TableHead>
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
              <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow 
                key={item.id} 
                className="border-b border-[#E5E7EB] dark:border-[#2D3033] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition"
              >
                <TableCell className="font-mono text-xs text-[#687076] dark:text-[#9BA1A6] text-transition max-w-[120px]">
                  <div className="flex items-center gap-1">
                    <span className="truncate">{item.uuid.split('-')[0]}...</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(item.uuid)}
                      className="h-6 w-6 p-0 hover:bg-[#E5E7EB] dark:hover:bg-[#2D3033]"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
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
                  <span className={item.numberOfUses === 0 ? "text-[#687076] dark:text-[#9BA1A6]" : ""}>
                    {item.numberOfUses}
                  </span>
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
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-[#E5E7EB] dark:hover:bg-[#2D3033]"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Ver detalles</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => showDisposeDialog(item)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Dar de baja</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DisposeItemDialog />
    </>
  )
}
