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
import { Loader2, Package, AlertTriangle } from 'lucide-react'
import { useDisposalStore } from "@/stores/disposal-store"
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

  const handleConfirm = async () => {
    if (!reason) {
      toast.error("Por favor selecciona un motivo de baja")
      return
    }

    try {
      await confirm()
      toast.success("Artículo dado de baja exitosamente", {
        description: `${current?.productInfo?.name || 'Producto'} ha sido removido del inventario`
      })
    } catch (error) {
      toast.error("Error al dar de baja el artículo", {
        description: "Por favor intenta nuevamente"
      })
    }
  }

  const getReasonLabel = (value: string) => {
    switch (value) {
      case "consumido": return "Consumido"
      case "dañado": return "Dañado"
      case "otro": return "Otro"
      default: return ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => !isLoading && hide()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#11181C] dark:text-[#ECEDEE] text-transition">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Dar de baja artículo
          </DialogTitle>
          <DialogDescription className="text-[#687076] dark:text-[#9BA1A6] text-transition">
            Esta acción eliminará permanentemente el artículo del inventario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Info */}
          <div className="space-y-2">
            <Label className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
              Producto
            </Label>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F9FAFB] dark:bg-[#2D3033] border border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
              <Package className="h-5 w-5 text-[#687076] dark:text-[#9BA1A6]" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#11181C] dark:text-[#ECEDEE] text-transition truncate">
                  {current?.productInfo?.name || "Producto desconocido"}
                </p>
                <p className="text-sm text-[#687076] dark:text-[#9BA1A6] text-transition font-mono">
                  Código: {current?.productInfo?.barcode || current?.barcode}
                </p>
              </div>
            </div>
          </div>

          {/* UUID */}
          <div className="space-y-2">
            <Label className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
              UUID del artículo
            </Label>
            <Input
              value={current?.uuid || ""}
              readOnly
              className="font-mono text-sm bg-[#F9FAFB] dark:bg-[#2D3033] border-[#E5E7EB] dark:border-[#2D3033] text-[#687076] dark:text-[#9BA1A6] theme-transition"
            />
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
              Motivo de baja *
            </Label>
            <Select value={reason} onValueChange={setReason} disabled={isLoading}>
              <SelectTrigger className="border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] focus:ring-[#0a7ea4] focus:border-[#0a7ea4] input-transition">
                <SelectValue placeholder="Selecciona el motivo" />
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
          <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-orange-800 dark:text-orange-200">
              Esta acción no se puede deshacer. El artículo será eliminado permanentemente del inventario.
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
            disabled={isLoading || !reason}
            className="bg-red-600 hover:bg-red-700 text-white theme-transition"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Dar de baja"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
