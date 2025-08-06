"use client"

import { useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { CalendarDays, Package, User, Plus, Minus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useKitsStore, type Kit, type KitItem } from "@/stores/kits-store"
import { useToast } from "@/hooks/use-toast"

interface AssignKitModalProps {
  children: React.ReactNode
}

export function AssignKitModal({ children }: AssignKitModalProps) {
  const [open, setOpen] = useState(false)
  const [kitId, setKitId] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({})
  
  const { 
    draft, 
    setDraft, 
    clearDraft, 
    addKit, 
    employees, 
    products,
    isLoading 
  } = useKitsStore()
  
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setKitId(uuidv4())
      setDraft({ date: new Date().toISOString().split('T')[0] })
    }
  }, [open, setDraft])

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (employee) {
      setDraft({ 
        employeeId, 
        employeeName: employee.name 
      })
    }
  }

  const handleProductToggle = (productId: string, checked: boolean) => {
    const newSelected = new Set(selectedProducts)
    if (checked) {
      newSelected.add(productId)
      setProductQuantities(prev => ({ ...prev, [productId]: 1 }))
    } else {
      newSelected.delete(productId)
      const newQuantities = { ...productQuantities }
      delete newQuantities[productId]
      setProductQuantities(newQuantities)
    }
    setSelectedProducts(newSelected)
    updateDraftItems(newSelected, productQuantities)
  }

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity < 1) return
    const newQuantities = { ...productQuantities, [productId]: quantity }
    setProductQuantities(newQuantities)
    updateDraftItems(selectedProducts, newQuantities)
  }

  const updateDraftItems = (selected: Set<string>, quantities: Record<string, number>) => {
    const items: KitItem[] = Array.from(selected).map(productId => {
      const product = products.find(p => p.id === productId)
      return {
        productId,
        productName: product?.name || "",
        qty: quantities[productId] || 1
      }
    })
    setDraft({ items })
  }

  const handleAssignKit = () => {
    if (!draft.employeeId || !draft.employeeName || !draft.date || !draft.items?.length) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      })
      return
    }

    const totalProducts = draft.items.reduce((sum, item) => sum + item.qty, 0)

    const newKit: Kit = {
      id: kitId,
      employeeId: draft.employeeId,
      employeeName: draft.employeeName,
      date: draft.date,
      items: draft.items,
      totalProducts
    }

    addKit(newKit)
    
    toast({
      title: "Kit asignado",
      description: `Kit asignado exitosamente a ${draft.employeeName}`,
    })

    handleClose()
  }

  const handleClose = () => {
    setOpen(false)
    clearDraft()
    setSelectedProducts(new Set())
    setProductQuantities({})
    setKitId("")
  }

  const totalItems = draft.items?.reduce((sum, item) => sum + item.qty, 0) || 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Asignar Kit Diario
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Kit ID */}
          <div className="space-y-2">
            <Label htmlFor="kit-id">ID del Kit</Label>
            <Input
              id="kit-id"
              value={kitId}
              readOnly
              className="bg-muted"
            />
          </div>

          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>Empleada</Label>
            <Select onValueChange={handleEmployeeSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleada" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{employee.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {employee.specialty}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
            <Input
              id="date"
              type="date"
              value={draft.date || ""}
              onChange={(e) => setDraft({ date: e.target.value })}
            />
          </div>

          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Productos del Kit
                {totalItems > 0 && (
                  <Badge variant="secondary">
                    {totalItems} productos
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedProducts.has(product.id)}
                      onCheckedChange={(checked) => 
                        handleProductToggle(product.id, checked as boolean)
                      }
                    />
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.category} • Stock: {product.stock}
                      </p>
                    </div>
                  </div>
                  
                  {selectedProducts.has(product.id) && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => 
                          handleQuantityChange(
                            product.id, 
                            (productQuantities[product.id] || 1) - 1
                          )
                        }
                        disabled={(productQuantities[product.id] || 1) <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {productQuantities[product.id] || 1}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => 
                          handleQuantityChange(
                            product.id, 
                            (productQuantities[product.id] || 1) + 1
                          )
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAssignKit}
              disabled={!draft.employeeId || !draft.items?.length || isLoading}
            >
              Asignar Kit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
