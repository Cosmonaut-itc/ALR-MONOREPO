"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Minus, X } from 'lucide-react';
import { useKitsStore } from "@/stores/kits-store";
import { toast } from "sonner";
import type { Kit } from "@/lib/schemas";

interface AssignKitModalProps {
  children: React.ReactNode;
}

export function AssignKitModal({ children }: AssignKitModalProps) {
  const [open, setOpen] = useState(false);
  const [kitId, setKitId] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Array<{ productId: string; qty: number }>>([]);
  
  const { draft, setDraft, clearDraft, addKit, employees, products } = useKitsStore();

  useEffect(() => {
    if (open) {
      const newKitId = uuidv4();
      setKitId(newKitId);
      setDraft({ id: newKitId, date: new Date().toISOString().split('T')[0] });
    }
  }, [open, setDraft]);

  const handleEmployeeSelect = (employeeId: string) => {
    setDraft({ employeeId });
  };

  const handleAddProduct = (productId: string) => {
    const existing = selectedProducts.find(p => p.productId === productId);
    if (existing) {
      setSelectedProducts(prev => 
        prev.map(p => p.productId === productId ? { ...p, qty: p.qty + 1 } : p)
      );
    } else {
      setSelectedProducts(prev => [...prev, { productId, qty: 1 }]);
    }
    setDraft({ items: selectedProducts });
  };

  const handleUpdateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
    } else {
      setSelectedProducts(prev => 
        prev.map(p => p.productId === productId ? { ...p, qty } : p)
      );
    }
    setDraft({ items: selectedProducts });
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
    setDraft({ items: selectedProducts.filter(p => p.productId !== productId) });
  };

  const handleAssign = () => {
    if (!draft.employeeId || selectedProducts.length === 0) {
      toast.error("Por favor selecciona una empleada y al menos un producto");
      return;
    }

    const newKit: Kit = {
      id: kitId,
      employeeId: draft.employeeId,
      date: draft.date || new Date().toISOString().split('T')[0],
      items: selectedProducts
    };

    addKit(newKit);
    toast.success("Kit asignado exitosamente");
    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    clearDraft();
    setSelectedProducts([]);
    setKitId("");
  };

  const selectedEmployee = employees.find(emp => emp.id === draft.employeeId);
  const getProductName = (productId: string) => 
    products.find(p => p.id === productId)?.name || "Producto desconocido";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asignar Kit Diario</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Kit ID */}
          <div className="space-y-2">
            <Label>ID del Kit</Label>
            <Input value={kitId} readOnly className="bg-muted" />
          </div>

          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>Empleada</Label>
            <Select value={draft.employeeId} onValueChange={handleEmployeeSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleada" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={employee.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-xs text-muted-foreground">{employee.specialty}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input 
              type="date" 
              value={draft.date} 
              onChange={(e) => setDraft({ date: e.target.value })}
            />
          </div>

          {/* Product Selection */}
          <div className="space-y-3">
            <Label>Productos</Label>
            <Select onValueChange={handleAddProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Agregar producto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex justify-between items-center w-full">
                      <span>{product.name}</span>
                      <Badge variant="secondary" className="ml-2">
                        Stock: {product.stock}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Selected Products */}
            {selectedProducts.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Productos seleccionados:</Label>
                {selectedProducts.map((item) => (
                  <Card key={item.productId}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{getProductName(item.productId)}</span>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateQuantity(item.productId, item.qty - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center">{item.qty}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateQuantity(item.productId, item.qty + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveProduct(item.productId)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Selected Employee Summary */}
          {selectedEmployee && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={selectedEmployee.avatar || "/placeholder.svg"} />
                    <AvatarFallback>{selectedEmployee.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{selectedEmployee.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedEmployee.specialty}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleAssign}>
              Asignar Kit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
