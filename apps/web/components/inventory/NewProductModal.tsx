"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface NewProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewProductModal({ open, onOpenChange }: NewProductModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033]">
        <DialogHeader>
          <DialogTitle className="text-[#11181C] dark:text-[#ECEDEE]">
            Nuevo Artículo
          </DialogTitle>
          <DialogDescription className="text-[#687076] dark:text-[#9BA1A6]">
            Agrega un nuevo producto al inventario
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="barcode" className="text-[#11181C] dark:text-[#ECEDEE]">
              Código de barras
            </Label>
            <Input
              id="barcode"
              type="number"
              placeholder="123456789"
              className="border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[#11181C] dark:text-[#ECEDEE]">
              Nombre del producto
            </Label>
            <Input
              id="name"
              placeholder="Ej: Acrílico Rosa Claro"
              className="border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category" className="text-[#11181C] dark:text-[#ECEDEE]">
              Categoría
            </Label>
            <Select>
              <SelectTrigger className="border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE]">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033]">
                <SelectItem value="acrilicos">Acrílicos</SelectItem>
                <SelectItem value="limas">Limas</SelectItem>
                <SelectItem value="geles">Geles</SelectItem>
                <SelectItem value="bases">Bases y Top Coats</SelectItem>
                <SelectItem value="herramientas">Herramientas</SelectItem>
                <SelectItem value="decoracion">Decoración</SelectItem>
                <SelectItem value="cuidado">Cuidado de uñas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="warehouse" className="text-[#11181C] dark:text-[#ECEDEE]">
              Almacén
            </Label>
            <Select>
              <SelectTrigger className="border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE]">
                <SelectValue placeholder="Selecciona el almacén" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033]">
                <SelectItem value="1">Almacén General</SelectItem>
                <SelectItem value="2">Gabinete</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description" className="text-[#11181C] dark:text-[#ECEDEE]">
              Descripción (opcional)
            </Label>
            <Textarea
              id="description"
              placeholder="Descripción del producto..."
              className="border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] resize-none"
              rows={3}
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#E5E7EB] dark:border-[#2D3033] text-[#687076] dark:text-[#9BA1A6] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033]"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-[#0a7ea4] hover:bg-[#0a7ea4]/90 text-white"
          >
            Agregar Producto
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
