import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ProductStockItem } from "@/lib/schemas"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface InventoryTableProps {
  products: ProductStockItem[]
}

export function InventoryTable({ products }: InventoryTableProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: es })
    } catch {
      return "N/A"
    }
  }

  if (products.length === 0) {
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
              Existencia
            </TableHead>
            <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
              Último uso
            </TableHead>
            <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
              ¿En uso?
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow 
              key={product.id} 
              className="border-b border-[#E5E7EB] dark:border-[#2D3033] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition"
            >
              <TableCell className="font-mono text-sm text-[#687076] dark:text-[#9BA1A6] text-transition">
                {product.barcode}
              </TableCell>
              <TableCell className="font-medium text-[#11181C] dark:text-[#ECEDEE] text-transition">
                {product.name}
              </TableCell>
              <TableCell className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
                <span className={product.stock <= 5 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                  {product.stock}
                </span>
              </TableCell>
              <TableCell className="text-[#687076] dark:text-[#9BA1A6] text-transition">
                {formatDate(product.lastUsed)}
              </TableCell>
              <TableCell>
                <Badge 
                  variant={product.inUse ? "default" : "secondary"}
                  className={
                    product.inUse 
                      ? "bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90" 
                      : "bg-[#F9FAFB] dark:bg-[#2D3033] text-[#687076] dark:text-[#9BA1A6] hover:bg-[#E5E7EB] dark:hover:bg-[#1E1F20]"
                  }
                >
                  {product.inUse ? "Sí" : "No"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
