"use client"

import { useDisposalStore } from "@/stores/disposal-store"
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
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Loader2, Package, Trash2 } from 'lucide-react'
import { toast } from "sonner"

export function DisposeItemDialog() {
  const { 
    open, 
    current, 
    reason, 
    isLoading,
    hide, 
    setReason, 
    confirm 
  } = useDisposalStore()

  const handleConfirm = async () => {
    if (!reason) {
      toast.error("Por favor selecciona un motivo para la baja")
      return
    }

    try {
      await confirm()
      toast.success("Artículo dado de baja exitosamente", {
        description: `${current?.nombre} ha sido removido del inventario`
      })
    } catch (error) {
      toast.error("Error al dar de baja el artículo")
    }
  }

  const reasonOptions = [
    { value: "consumido", label: "Consumido en servicio" },
    { value: "dañado", label: "Producto dañado/vencido" },
    { value: "otro", label: "Otro motivo" }
  ]

  return (
    <Dialog open={open} onOpenChange={(open) => !open && hide()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Dar de Baja Artículo
          </DialogTitle>
          <DialogDescription>
            Esta acción eliminará el artículo del inventario de forma permanente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Información del Producto */}
          <div className="space-y-2">
            <Label htmlFor="producto">Producto</Label>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium text-sm">{current?.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  Código: {current?.codigoBarras}
                </p>
              </div>
            </div>
          </div>

          {/* Cantidad Actual */}
          <div className="space-y-2">
            <Label htmlFor="cantidad">Cantidad en Stock</Label>
            <Input
              id="cantidad"
              value={`${current?.cantidad || 0} unidades`}
              readOnly
              className="bg-muted"
            />
          </div>

          {/* Motivo de Baja */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo de la Baja *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el motivo" />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={hide}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !reason}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Dar de Baja
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
