"use client"

import { useState } from "react"
import { Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { SkeletonReceiveForm } from "@/ui/skeletons/Skeleton.ReceiveForm"
import type { Reception } from "@/lib/schemas"

interface ReceiveItemsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ReceptionLine {
  id: string
  barcode: string
  quantity: string
}

export function ReceiveItemsModal({ open, onOpenChange }: ReceiveItemsModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    shipmentNumber: "",
    arrivalDate: "",
  })
  const [lines, setLines] = useState<ReceptionLine[]>([
    { id: "1", barcode: "", quantity: "" }
  ])

  const addLine = () => {
    const newLine: ReceptionLine = {
      id: Date.now().toString(),
      barcode: "",
      quantity: ""
    }
    setLines([...lines, newLine])
  }

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter(line => line.id !== id))
    }
  }

  const updateLine = (id: string, field: keyof Omit<ReceptionLine, 'id'>, value: string) => {
    setLines(lines.map(line => 
      line.id === id ? { ...line, [field]: value } : line
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    if (!formData.shipmentNumber || !formData.arrivalDate) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    // Validate lines
    const validLines = lines.filter(line => line.barcode && line.quantity)
    if (validLines.length === 0) {
      toast({
        title: "Error",
        description: "Agrega al menos una línea con código de barras y cantidad",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Prepare payload
      const payload: Reception = {
        shipmentNumber: formData.shipmentNumber,
        arrivalDate: new Date(formData.arrivalDate).toISOString(),
        lines: validLines.map(line => ({
          barcode: parseInt(line.barcode),
          quantity: parseInt(line.quantity)
        }))
      }

      // Log payload (no networking)
      console.log("Reception payload:", payload)

      toast({
        title: "¡Éxito!",
        description: "Recepción guardada correctamente",
      })

      // Reset form
      setFormData({ shipmentNumber: "", arrivalDate: "" })
      setLines([{ id: "1", barcode: "", quantity: "" }])
      onOpenChange(false)

    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar la recepción",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({ shipmentNumber: "", arrivalDate: "" })
    setLines([{ id: "1", barcode: "", quantity: "" }])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033]">
        <DialogHeader>
          <DialogTitle className="text-[#11181C] dark:text-[#ECEDEE]">
            Registrar Recepción
          </DialogTitle>
          <DialogDescription className="text-[#687076] dark:text-[#9BA1A6]">
            Registra la llegada de productos al almacén
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <SkeletonReceiveForm />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shipment Number */}
            <div className="space-y-2">
              <Label htmlFor="shipmentNumber" className="text-[#11181C] dark:text-[#ECEDEE]">
                Número de envío *
              </Label>
              <Input
                id="shipmentNumber"
                type="text"
                placeholder="Ej: ENV-2024-001"
                value={formData.shipmentNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, shipmentNumber: e.target.value }))}
                className="border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] placeholder:text-[#687076] dark:placeholder:text-[#9BA1A6] focus:ring-[#0a7ea4] focus:border-[#0a7ea4] input-transition"
                required
              />
            </div>

            {/* Arrival Date */}
            <div className="space-y-2">
              <Label htmlFor="arrivalDate" className="text-[#11181C] dark:text-[#ECEDEE]">
                Fecha de llegada *
              </Label>
              <Input
                id="arrivalDate"
                type="date"
                value={formData.arrivalDate}
                onChange={(e) => setFormData(prev => ({ ...prev, arrivalDate: e.target.value }))}
                className="border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] focus:ring-[#0a7ea4] focus:border-[#0a7ea4] input-transition"
                required
              />
            </div>

            {/* Lines Section */}
            <div className="space-y-4">
              <Label className="text-[#11181C] dark:text-[#ECEDEE] font-medium">
                Líneas de productos
              </Label>
              
              {lines.map((line, index) => (
                <Card key={line.id} className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[#11181C] dark:text-[#ECEDEE] text-sm">
                          Código de barras
                        </Label>
                        <Input
                          type="number"
                          placeholder="7501234567890"
                          value={line.barcode}
                          onChange={(e) => updateLine(line.id, 'barcode', e.target.value)}
                          className="border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] placeholder:text-[#687076] dark:placeholder:text-[#9BA1A6] focus:ring-[#0a7ea4] focus:border-[#0a7ea4] input-transition"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-[#11181C] dark:text-[#ECEDEE] text-sm">
                          Cantidad
                        </Label>
                        <Input
                          type="number"
                          placeholder="1"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.id, 'quantity', e.target.value)}
                          className="border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] placeholder:text-[#687076] dark:placeholder:text-[#9BA1A6] focus:ring-[#0a7ea4] focus:border-[#0a7ea4] input-transition"
                        />
                      </div>
                      
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeLine(line.id)}
                          disabled={lines.length === 1}
                          className="border-[#E5E7EB] dark:border-[#2D3033] text-[#687076] dark:text-[#9BA1A6] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 theme-transition"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar línea</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addLine}
                className="border-[#E5E7EB] dark:border-[#2D3033] text-[#0a7ea4] border-[#0a7ea4] hover:bg-[#0a7ea4]/10 dark:hover:bg-[#0a7ea4]/10 theme-transition"
              >
                <Plus className="h-4 w-4 mr-2" />
                Añadir línea
              </Button>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="border-[#E5E7EB] dark:border-[#2D3033] text-[#687076] dark:text-[#9BA1A6] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#0a7ea4] hover:bg-[#0a7ea4]/90 text-white theme-transition"
              >
                Guardar Recepción
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
