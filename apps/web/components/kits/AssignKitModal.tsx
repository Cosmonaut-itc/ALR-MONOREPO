"use client"

import { useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { CalendarDays, Package, User, Plus, Minus, X } from 'lucide-react'
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useKitsStore } from "@/stores/kits-store"
import { SkeletonKitModal } from "@/ui/skeletons/Skeleton.KitModal"

// Mock data for nail salon employees
const mockEmployees = [
  { id: "emp-001", name: "María González", role: "Manicurista Senior" },
  { id: "emp-002", name: "Ana Rodríguez", role: "Especialista en Uñas" },
  { id: "emp-003", name: "Carmen López", role: "Técnica en Manicure" },
  { id: "emp-004", name: "Sofia Martínez", role: "Estilista de Uñas" },
  { id: "emp-005", name: "Isabella Torres", role: "Manicurista" }
]

// Mock products for nail salon
const mockProducts = [
  { id: "prod-001", name: "Esmalte Rojo Clásico", category: "Esmaltes", stock: 25 },
  { id: "prod-002", name: "Base Coat Fortalecedora", category: "Bases", stock: 15 },
  { id: "prod-003", name: "Top Coat Brillante", category: "Acabados", stock: 20 },
  { id: "prod-004", name: "Lima de Uñas Profesional", category: "Herramientas", stock: 30 },
  { id: "prod-005", name: "Aceite Cuticular", category: "Cuidado", stock: 12 },
  { id: "prod-006", name: "Removedor de Esmalte", category: "Limpieza", stock: 8 },
  { id: "prod-007", name: "Algodón Cosmético", category: "Consumibles", stock: 50 },
  { id: "prod-008", name: "Palitos de Naranjo", category: "Herramientas", stock: 40 }
]

interface AssignKitModalProps {
  children: React.ReactNode
}

export function AssignKitModal({ children }: AssignKitModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [kitId, setKitId] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<Array<{ productId: string, qty: number }>>([])
  const { addKit, clearDraft } = useKitsStore()

  useEffect(() => {
    if (open) {
      setKitId(uuidv4())
    }
  }, [open])

  const handleAddProduct = (productId: string) => {
    const existingProduct = selectedProducts.find(p => p.productId === productId)
    if (existingProduct) {
      setSelectedProducts(prev => 
        prev.map(p => 
          p.productId === productId 
            ? { ...p, qty: p.qty + 1 }
            : p
        )
      )
    } else {
      setSelectedProducts(prev => [...prev, { productId, qty: 1 }])
    }
  }

  const handleUpdateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setSelectedProducts(prev => prev.filter(p => p.productId !== productId))
    } else {
      setSelectedProducts(prev => 
        prev.map(p => 
          p.productId === productId 
            ? { ...p, qty }
            : p
        )
      )
    }
  }

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== productId))
  }

  const handleAssignKit = async () => {
    if (!selectedEmployee) {
      toast.error("Selecciona una empleada")
      return
    }

    if (selectedProducts.length === 0) {
      toast.error("Agrega al menos un producto al kit")
      return
    }

    setLoading(true)

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      const newKit = {
        id: kitId,
        employeeId: selectedEmployee,
        date: new Date().toISOString().split('T')[0],
        items: selectedProducts
      }

      addKit(newKit)
      toast.success("Kit asignado exitosamente")
      
      // Reset form
      setSelectedEmployee("")
      setSelectedProducts([])
      setKitId(uuidv4())
      setOpen(false)
      clearDraft()
    } catch (error) {
      toast.error("Error al asignar el kit")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setSelectedEmployee("")
    setSelectedProducts([])
    setOpen(false)
    clearDraft()
  }

  const getProductName = (productId: string) => {
    return mockProducts.find(p => p.id === productId)?.name || "Producto desconocido"
  }

  const getEmployeeName = (employeeId: string) => {
    return mockEmployees.find(e => e.id === employeeId)?.name || "Empleada desconocida"
  }

  const totalProducts = selectedProducts.reduce((sum, item) => sum + item.qty, 0)

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <SkeletonKitModal />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Asignar Kit Diario
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee Selection */}
          <div className="space-y-2">
            <Label htmlFor="employee" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Empleada
            </Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una empleada" />
              </SelectTrigger>
              <SelectContent>
                {mockEmployees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{employee.name}</span>
                      <span className="text-sm text-muted-foreground">{employee.role}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Kit ID */}
          <div className="space-y-2">
            <Label htmlFor="kitId">ID del Kit</Label>
            <Input
              id="kitId"
              value={kitId}
              readOnly
              className="bg-muted"
            />
          </div>

          {/* Product Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Productos
            </Label>
            <Select onValueChange={handleAddProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona productos para el kit" />
              </SelectTrigger>
              <SelectContent>
                {mockProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{product.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {product.category} • Stock: {product.stock}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Products */}
          {selectedProducts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Productos Seleccionados</Label>
                <Badge variant="secondary">
                  {totalProducts} productos
                </Badge>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedProducts.map((item) => (
                  <Card key={item.productId} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{getProductName(item.productId)}</p>
                        <p className="text-sm text-muted-foreground">
                          {mockProducts.find(p => p.id === item.productId)?.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUpdateQuantity(item.productId, item.qty - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.qty}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUpdateQuantity(item.productId, item.qty + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveProduct(item.productId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAssignKit}
              disabled={!selectedEmployee || selectedProducts.length === 0}
            >
              Asignar Kit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
