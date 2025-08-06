"use client"

import { AlertTriangle, Package, Trash2 } from 'lucide-react'
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useDisposalStore } from "@/stores/disposal-store"
import { SkeletonDisposeDialog } from "@/ui/skeletons/Skeleton.DisposeDialog"

export function DisposeItemDialog() {
  const { 
    current, 
    reason, 
    open, 
    loading,
    hide, 
    setReason, 
    confirm 
  } = useDisposalStore()

  const handleConfirm = async () => {
    if (!reason) {
      toast.error("Selecciona un motivo para dar de baja")
      return
    }

    try {
      await confirm()
      toast.success("Artículo dado de baja exitosamente")
    } catch (error) {
      toast.error("Error al dar de baja el artículo")
    }
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={hide}>
        <DialogContent className="sm:max-w-md">
          <SkeletonDisposeDialog />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={hide}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Dar de Baja Artículo
          </DialogTitle>
          <DialogDescription>
            Esta acción eliminará permanentemente el artículo del inventario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Producto</Label>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{current?.productName}</p>
                  <p className="text-sm text-muted-foreground">
                    Código: {current?.barcode}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>ID del Artículo</Label>
              <Input 
                value={current?.id || ""} 
                readOnly 
                className="bg-muted font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Cantidad en Stock</Label>
              <Input 
                value={current?.quantity || 0} 
                readOnly 
                className="bg-muted"
              />
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo de la Baja *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consumido">Consumido</SelectItem>
                <SelectItem value="dañado">Dañado</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Warning */}
          <Alert className="border-destructive/50 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Advertencia:</strong> Esta acción no se puede deshacer. 
              El artículo será eliminado permanentemente del inventario.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={hide}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirm}
              disabled={!reason}
            >
              Dar de Baja
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
