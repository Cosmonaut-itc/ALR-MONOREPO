"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useDisposalStore } from "@/stores/disposal-store"
import { useInventoryStore } from "@/stores/inventory-store"
import { toast } from "sonner"

export function DisposeItemDialog() {
  const { 
    current, 
    reason, 
    open, 
    isLoading,
    hide, 
    setReason, 
    confirm 
  } = useDisposalStore()
  
  const { productCatalog } = useInventoryStore()

  const handleConfirm = async () => {
    if (!reason) {
      toast.error("Por favor selecciona un motivo")
      return
    }

    try {
      await confirm()
      toast.success("Artículo dado de baja exitosamente")
    } catch (error) {
      toast.error("Error al dar de baja el artículo")
    }
  }

  const productInfo = current ? productCatalog.find(p => p.barcode === current.barcode) : null

  return (
    <Dialog open={open} onOpenChange={(open) => !open && hide()}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
        <DialogHeader>
          <DialogTitle className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
            Dar de baja artículo
          </DialogTitle>
          <DialogDescription className="text-[#687076] dark:text-[#9BA1A6] text-transition">
            Esta acción no se puede deshacer. El artículo será removido permanentemente del inventario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Info */}
          <div className="space-y-2">
            <Label className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
              Producto
            </Label>
            <Input
              value={productInfo?.name || "Producto desconocido"}
              readOnly
              className="bg-[#F9FAFB] dark:bg-[#2D3033] border-[#E5E7EB] dark:border-[#2D3033] text-[#687076] dark:text-[#9BA1A6] cursor-not-allowed"
            />
          </div>

          {/* Barcode */}
          <div className="space-y-2">
            <Label className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
              Código de barras
            </Label>
            <Input
              value={current?.barcode || ""}
              readOnly
              className="bg-[#F9FAFB] dark:bg-[#2D3033] border-[#E5E7EB] dark:border-[#2D3033] text-[#687076] dark:text-[#9BA1A6] cursor-not-allowed font-mono"
            />
          </div>

          {/* UUID */}
          <div className="space-y-2">
            <Label className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
              UUID
            </Label>
            <Input
              value={current?.uuid || ""}
              readOnly
              className="bg-[#F9FAFB] dark:bg-[#2D3033] border-[#E5E7EB] dark:border-[#2D3033] text-[#687076] dark:text-[#9BA1A6] cursor-not-allowed font-mono text-xs"
            />
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
              Motivo de baja *
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] focus:ring-[#0a7ea4] focus:border-[#0a7ea4] input-transition">
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
                <SelectItem 
                  value="consumido"
                  className="text-[#11181C] dark:text-[#ECEDEE] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition"
                >
                  Consumido
                </SelectItem>
                <SelectItem 
                  value="dañado"
                  className="text-[#11181C] dark:text-[#ECEDEE] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition"
                >
                  Dañado
                </SelectItem>
                <SelectItem 
                  value="otro"
                  className="text-[#11181C] dark:text-[#ECEDEE] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition"
                >
                  Otro
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">
              Esta acción eliminará permanentemente el artículo del inventario.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={hide}
            disabled={isLoading}
            className="border-[#E5E7EB] dark:border-[#2D3033] text-[#687076] dark:text-[#9BA1A6] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reason || isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Dar de baja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
