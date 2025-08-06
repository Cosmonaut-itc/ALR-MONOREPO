"use client"

import { useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { CalendarIcon, Check, ChevronsUpDown, Plus, Trash2 } from 'lucide-react'
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

import { useKitsStore } from "@/stores/kits-store"
import { cn } from "@/lib/utils"

interface AssignKitModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssignKitModal({ open, onOpenChange }: AssignKitModalProps) {
  const { 
    draft, 
    setDraft, 
    clearDraft, 
    addKit, 
    employees, 
    products,
    getEmployeeById 
  } = useKitsStore()
  
  const [kitId] = useState(() => uuidv4())
  const [employeeOpen, setEmployeeOpen] = useState(false)
  const [productOpen, setProductOpen] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Array<{productId: string, qty: number}>>([])

  useEffect(() => {
    if (open) {
      setDraft({ 
        id: kitId,
        date: new Date().toISOString().split('T')[0]
      })
    }
  }, [open, kitId, setDraft])

  const selectedEmployee = draft.employeeId ? getEmployeeById(draft.employeeId) : null

  const handleAddProduct = (productId: string) => {
    const existingIndex = selectedProducts.findIndex(p => p.productId === productId)
    if (existingIndex >= 0) {
      toast.error("Este producto ya está en el kit")
      return
    }
    
    const newProducts = [...selectedProducts, { productId, qty: 1 }]
    setSelectedProducts(newProducts)
    setDraft({ items: newProducts })
    setProductOpen(false)
  }

  const handleUpdateQuantity = (productId: string, qty: number) => {
    if (qty < 1) return
    
    const newProducts = selectedProducts.map(p => 
      p.productId === productId ? { ...p, qty } : p
    )
    setSelectedProducts(newProducts)
    setDraft({ items: newProducts })
  }

  const handleRemoveProduct = (productId: string) => {
    const newProducts = selectedProducts.filter(p => p.productId !== productId)
    setSelectedProducts(newProducts)
    setDraft({ items: newProducts })
  }

  const handleAssign = () => {
    if (!draft.employeeId || !selectedProducts.length) {
      toast.error("Selecciona una empleada y al menos un producto")
      return
    }

    const newKit = {
      id: kitId,
      employeeId: draft.employeeId,
      date: draft.date || new Date().toISOString().split('T')[0],
      items: selectedProducts
    }

    addKit(newKit)
    toast.success("Kit asignado exitosamente")
    handleClose()
  }

  const handleClose = () => {
    clearDraft()
    setSelectedProducts([])
    onOpenChange(false)
  }

  const getProductById = (id: string) => products.find(p => p.id === id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Asignar Kit Diario</DialogTitle>
          <DialogDescription>
            Crea una nueva asignación de kit para una empleada
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
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
              <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={employeeOpen}
                    className="w-full justify-between"
                  >
                    {selectedEmployee ? (
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={selectedEmployee.avatar || "/placeholder.svg"} />
                          <AvatarFallback>
                            {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{selectedEmployee.name}</span>
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
                      <CommandEmpty>No se encontró empleada.</CommandEmpty>
                      <CommandGroup>
                        {employees.map((employee) => (
                          <CommandItem
                            key={employee.id}
                            value={employee.name}
                            onSelect={() => {
                              setDraft({ employeeId: employee.id })
                              setEmployeeOpen(false)
                            }}
                          >
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={employee.avatar || "/placeholder.svg"} />
                                <AvatarFallback>
                                  {employee.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{employee.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {employee.specialty}
                                </div>
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

            {/* Date */}
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={draft.date || new Date().toISOString().split('T')[0]}
                onChange={(e) => setDraft({ date: e.target.value })}
              />
            </div>

            {/* Products Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Productos</Label>
                <Popover open={productOpen} onOpenChange={setProductOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Producto
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0">
                    <Command>
                      <CommandInput placeholder="Buscar producto..." />
                      <CommandList>
                        <CommandEmpty>No se encontró producto.</CommandEmpty>
                        <CommandGroup>
                          {products.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.name}
                              onSelect={() => handleAddProduct(product.id)}
                            >
                              <div className="flex-1">
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {product.category} • ${product.price}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {selectedProducts.length > 0 && (
                <div className="space-y-2">
                  {selectedProducts.map((item) => {
                    const product = getProductById(item.productId)
                    if (!product) return null

                    return (
                      <Card key={item.productId}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">
                                <Badge variant="secondary" className="mr-2">
                                  {product.category}
                                </Badge>
                                ${product.price}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateQuantity(item.productId, item.qty - 1)}
                                  disabled={item.qty <= 1}
                                >
                                  -
                                </Button>
                                <span className="w-8 text-center">{item.qty}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateQuantity(item.productId, item.qty + 1)}
                                >
                                  +
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveProduct(item.productId)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}

              {selectedProducts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay productos seleccionados
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleAssign}>
            Asignar Kit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
