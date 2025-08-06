"use client"

import { useState } from "react"
import { MoreHorizontal, Package, Search, Trash2, Edit, Eye } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useInventoryStore } from "@/stores/inventory-store"
import { useDisposalStore } from "@/stores/disposal-store"
import { DisposeItemDialog } from "./DisposeItemDialog"
import { SkeletonInventoryTable } from "@/ui/skeletons/Skeleton.InventoryTable"

export function InventoryTable() {
  const { items, loading, searchTerm, setSearchTerm, warehouseFilter, setWarehouseFilter } = useInventoryStore()
  const { show: showDisposal } = useDisposalStore()
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'category'>('name')

  // Filter and sort items
  const filteredItems = items
    .filter(item => {
      const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.barcode.toString().includes(searchTerm)
      const matchesWarehouse = warehouseFilter === 'all' || item.warehouse === warehouseFilter
      return matchesSearch && matchesWarehouse
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.productName.localeCompare(b.productName)
        case 'quantity':
          return b.quantity - a.quantity
        case 'category':
          return a.category.localeCompare(b.category)
        default:
          return 0
      }
    })

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: 'Sin Stock', variant: 'destructive' as const }
    if (quantity < 5) return { label: 'Stock Bajo', variant: 'secondary' as const }
    if (quantity < 10) return { label: 'Stock Medio', variant: 'outline' as const }
    return { label: 'Stock Alto', variant: 'default' as const }
  }

  if (loading) {
    return <SkeletonInventoryTable />
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventario de Productos
          </CardTitle>
          <CardDescription>
            Gestiona el inventario de productos del salón de uñas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nombre o código de barras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por almacén" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los almacenes</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="gabinete">Gabinete</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: 'name' | 'quantity' | 'category') => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nombre</SelectItem>
                <SelectItem value="quantity">Cantidad</SelectItem>
                <SelectItem value="category">Categoría</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Almacén</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No se encontraron productos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const stockStatus = getStockStatus(item.quantity)
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-muted-foreground">
                              Código: {item.barcode}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.warehouse === 'general' ? 'default' : 'secondary'}>
                            {item.warehouse === 'general' ? 'General' : 'Gabinete'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{item.quantity}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={stockStatus.variant}>
                            {stockStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              {item.warehouse === 'gabinete' && (
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => showDisposal(item)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Dar de baja
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Results count */}
          {filteredItems.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Mostrando {filteredItems.length} de {items.length} productos
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disposal Dialog */}
      <DisposeItemDialog />
    </>
  )
}
