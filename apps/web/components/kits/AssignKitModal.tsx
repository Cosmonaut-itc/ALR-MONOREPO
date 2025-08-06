"use client"

import { useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { Check, ChevronsUpDown, Plus, Minus } from 'lucide-react'
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useKitsStore } from "@/stores/kits-store"

interface AssignKitModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssignKitModal({ open, onOpenChange }: AssignKitModalProps) {
  const { employees, products, draft, setDraft, clearDraft, addKit } = useKitsStore()
  const [employeeOpen, setEmployeeOpen] = useState(false)
  const [kitId, setKitId] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<Array<{ productId: string; qty: number }>>([])

  // Generate new kit ID when modal opens
  useEffect(() => {
    if (open) {
      setKitId(uuidv4())
      setSelectedProducts([])
    }
  }, [open])

  const selectedEmployee = employees.find(emp => emp.id === draft.employeeId)

  const handleEmployeeSelect = (employeeId: string) => {
    setDraft({ employeeId })
    setEmployeeOpen(false)
  }

  const handleAddProduct = (productId: string) => {
    const existing = selectedProducts.find(p => p.productId === productId)
    if (existing) {
      setSelectedProducts(prev => 
        prev.map(p => p.productId === productId ? { ...p, qty: p.qty + 1 } : p)
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
        prev.map(p => p.productId === productId ? { ...p, qty } : p)
      )
    }
  }

  const handleAssign = () => {
    if (!draft.employeeId || selectedProducts.length === 0) {
      toast.error("Por favor completa todos los campos requeridos")
      return
    }

    const newKit = {
      id: kitId,
      employeeId: draft.employeeId,
      date: draft.date || new Date().toISOString(),
      items: selectedProducts,
    }

    addKit(newKit)
    toast.success("Kit asignado exitosamente")
    onOpenChange(false)
    handleCancel()
  }

  const handleCancel = () => {
    clearDraft()
    setSelectedProducts([])
    setKitId("")
    onOpenChange(false)
  }

  const totalProducts = selectedProducts.reduce((sum, item) => sum + item.qty, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asignar Kit Diario</DialogTitle>
          <DialogDescription>
            Crea una nueva asignación de kit para una empleada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Kit ID */}
          <div className="space-y-2">
            <Label htmlFor="kitId">ID del Kit</Label>
            <Input
              id="kitId"
              value={kitId}
              readOnly
              className="bg-muted font-mono text-sm"
            />
          </div>

          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>Empleada</Label>
            <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={employeeOpen}
                  className="w-full justify-between"
                >
                  {selectedEmployee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={selectedEmployee.avatar || "/placeholder.svg"} />
                        <AvatarFallback>
                          {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span>{selectedEmployee.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {selectedEmployee.specialty}
                      </Badge>
                    </div>
                  ) : (
                    "Seleccionar empleada..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Buscar empleada..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron empleadas.</CommandEmpty>
                    <CommandGroup>
                      {employees.filter(emp => emp.active).map((employee) => (
                        <CommandItem
                          key={employee.id}
                          value={employee.name}
                          onSelect={() => handleEmployeeSelect(employee.id)}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={employee.avatar || "/placeholder.svg"} />
                              <AvatarFallback>
                                {employee.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">{employee.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {employee.specialty}
                              </span>
                            </div>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              draft.employeeId === employee.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Products Selection */}
          <div className="space-y-3">
            <Label>Productos Disponibles</Label>
            <div className="grid gap-2 max-h-48 overflow-y-auto">
              {products.map((product) => {
                const selectedProduct = selectedProducts.find(p => p.productId === product.id)
                return (
                  <Card key={product.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.brand} • Stock: {product.stock}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedProduct ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateQuantity(product.id, selectedProduct.qty - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">
                              {selectedProduct.qty}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateQuantity(product.id, selectedProduct.qty + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddProduct(product.id)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Agregar
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Selected Products Summary */}
          {selectedProducts.length > 0 && (
            <div className="space-y-2">
              <Label>Resumen del Kit ({totalProducts} productos)</Label>
              <Card className="p-3">
                <div className="space-y-2">
                  {selectedProducts.map((item) => {
                    const product = products.find(p => p.id === item.productId)
                    return (
                      <div key={item.productId} className="flex justify-between text-sm">
                        <span>{product?.name}</span>
                        <span className="font-medium">x{item.qty}</span>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAssign}
            disabled={!draft.employeeId || selectedProducts.length === 0}
          >
            Asignar Kit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
