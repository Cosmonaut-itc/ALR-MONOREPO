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
import { useDisposalStore } from "@/stores/disposal-store"
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from "sonner"
import { useEffect } from "react"

export function DisposeItemDialog() {
  const { current, reason, open, isLoading, hide, setReason, confirm } = useDisposalStore()

  const handleConfirm = async () => {
    if (!reason) {
      toast.error("Por favor selecciona un motivo para la baja")
      return
    }

    try {
      await confirm()
      toast.success("Artículo dado de baja exitosamente")
    } catch (error) {
      toast.error("Error al dar de baja el artículo")
    }
  }

  // Reset reason when dialog opens
  useEffect(() => {
    if (open && !reason) {
      setReason(undefined as any)
    }
  }, [open, reason, setReason])

  if (!current) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && hide()}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#151718] border-[#E5E7EB] dark:border-[#2D3033]">
        <DialogHeader>
          <DialogTitle className="text-[#11181C] dark:text-[#ECEDEE] flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Dar de baja artículo
          </DialogTitle>
          <DialogDescription className="text-[#687076] dark:text-[#9BA1A6]">
            Esta acción es permanente y no se puede deshacer. El artículo será removido del inventario.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="product-name" className="text-[#11181C] dark:text-[#ECEDEE]">
              Producto
            </Label>
            <Input
              id="product-name"
              value={current.productInfo?.name || "Producto desconocido"}
              readOnly
              className="bg-[#F9FAFB] dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033] text-[#687076] dark:text-[#9BA1A6]"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="barcode" className="text-[#11181C] dark:text-[#ECEDEE]">
              Código de barras
            </Label>
            <Input
              id="barcode"
              value={current.barcode || "N/A"}
              readOnly
              className="bg-[#F9FAFB] dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033] text-[#687076] dark:text-[#9BA1A6] font-mono text-sm"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="uuid" className="text-[#11181C] dark:text-[#ECEDEE]">
              UUID
            </Label>
            <Input
              id="uuid"
              value={current.uuid || "N/A"}
              readOnly
              className="bg-[#F9FAFB] dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033] text-[#687076] dark:text-[#9BA1A6] font-mono text-xs"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reason" className="text-[#11181C] dark:text-[#ECEDEE]">
              Motivo de baja *
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033]">
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033]">
                <SelectItem value="consumido" className="text-[#11181C] dark:text-[#ECEDEE]">
                  Consumido
                </SelectItem>
                <SelectItem value="dañado" className="text-[#11181C] dark:text-[#ECEDEE]">
                  Dañado
                </SelectItem>
                <SelectItem value="otro" className="text-[#11181C] dark:text-[#ECEDEE]">
                  Otro
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={hide}
            disabled={isLoading}
            className="border-[#E5E7EB] dark:border-[#2D3033] text-[#11181C] dark:text-[#ECEDEE] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033]"
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
