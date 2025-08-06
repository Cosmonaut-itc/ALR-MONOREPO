"use client"

import { useEffect, useState } from "react"
import { Search, Boxes, CheckSquare, ArrowRight, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTransferStore } from "@/stores/transfer-store"
import { SkeletonTransferGroup } from "@/ui/skeletons/Skeleton.TransferGroup"
import { SkeletonTransferRow } from "@/ui/skeletons/Skeleton.TransferRow"
import { toast } from "sonner"

// Mock data - TODO: Replace mock with GET /api/product-stock?warehouse=general
const mockTransferItems = [
  {
    id: "item-1",
    barcode: 123456,
    productName: "Esmalte Gel Rosa Pastel",
    category: "Esmaltes",
    warehouse: "general",
    quantity: 5
  },
  {
    id: "item-2", 
    barcode: 123456,
    productName: "Esmalte Gel Rosa Pastel",
    category: "Esmaltes",
    warehouse: "general",
    quantity: 3
  },
  {
    id: "item-3",
    barcode: 789012,
    productName: "Lima Profesional 180/240",
    category: "Herramientas",
    warehouse: "general",
    quantity: 2
  },
  {
    id: "item-4",
    barcode: 789012,
    productName: "Lima Profesional 180/240", 
    category: "Herramientas",
    warehouse: "general",
    quantity: 4
  },
  {
    id: "item-5",
    barcode: 345678,
    productName: "Base Coat Fortalecedora",
    category: "Tratamientos",
    warehouse: "general",
    quantity: 1
  }
]

export default function TransferenciasPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  
  const { items, selectedIds, toggleSelection, selectGroup, clearSelection, transferSelected, setItems } = useTransferStore()

  // Simulate loading and set mock data
  useEffect(() => {
    const timer = setTimeout(() => {
      setItems(mockTransferItems)
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [setItems])

  // Filter items based on search and category
  const filteredItems = items.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.barcode.toString().includes(searchTerm)
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Group items by barcode
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.barcode]) {
      acc[item.barcode] = []
    }
    acc[item.barcode].push(item)
    return acc
  }, {} as Record<number, typeof filteredItems>)

  // Get unique categories
  const categories = Array.from(new Set(items.map(item => item.category)))

  const handleTransfer = () => {
    transferSelected()
    toast.success("Artículos transferidos al gabinete exitosamente")
  }

  const getGroupSelectionState = (barcode: number) => {
    const groupItems = groupedItems[barcode] || []
    const selectedCount = groupItems.filter(item => selectedIds.includes(item.id)).length
    
    if (selectedCount === 0) return "unchecked"
    if (selectedCount === groupItems.length) return "checked"
    return "indeterminate"
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-surface rounded animate-pulse" />
          <div className="h-4 w-96 bg-surface rounded animate-pulse" />
        </div>
        
        <div className="flex gap-4">
          <div className="h-10 w-80 bg-surface rounded animate-pulse" />
          <div className="h-10 w-48 bg-surface rounded animate-pulse" />
        </div>

        <Card>
          <CardContent className="p-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <SkeletonTransferGroup />
                <SkeletonTransferRow />
                <SkeletonTransferRow />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-text">Transferir al gabinete</h1>
        <p className="text-textSecondary">
          Selecciona los artículos del almacén general para transferir al gabinete de trabajo
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Artículos</CardTitle>
            <Boxes className="h-4 w-4 text-textSecondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seleccionados</CardTitle>
            <CheckSquare className="h-4 w-4 text-textSecondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tint">{selectedIds.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Únicos</CardTitle>
            <Boxes className="h-4 w-4 text-textSecondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(groupedItems).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
            <Boxes className="h-4 w-4 text-textSecondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
          <Input
            placeholder="Buscar por nombre o código de barras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transfer Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            Artículos disponibles para transferir
          </CardTitle>
          <CardDescription>
            Selecciona los artículos que deseas transferir del almacén general al gabinete
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {Object.keys(groupedItems).length === 0 ? (
            <div className="p-8 text-center text-textSecondary">
              <Boxes className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No se encontraron artículos</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {Object.entries(groupedItems).map(([barcode, groupItems]) => {
                const selectionState = getGroupSelectionState(Number(barcode))
                
                return (
                  <div key={barcode}>
                    {/* Group Header */}
                    <div className="bg-surface/60 p-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectionState === "checked"}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = selectionState === "indeterminate"
                            }
                          }}
                          onCheckedChange={() => selectGroup(Number(barcode))}
                          className="h-4 w-4"
                        />
                        <div className="flex items-center gap-2 text-textSecondary">
                          <Boxes className="h-4 w-4" />
                          <span className="font-medium">
                            Código de barras {barcode} —— {groupItems.length} artículos
                          </span>
                          <Badge variant="secondary" className="ml-2">
                            {groupItems[0].category}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Group Items */}
                    {groupItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 pl-8 hover:bg-highlight transition-colors cursor-pointer"
                        onClick={() => toggleSelection(item.id)}
                      >
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={selectedIds.includes(item.id)}
                            onCheckedChange={() => toggleSelection(item.id)}
                            className="h-4 w-4"
                            aria-labelledby={`product-name-${item.id}`}
                          />
                          <div className="text-sm text-textSecondary font-mono">
                            {item.id}
                          </div>
                          <div className="text-sm text-textSecondary">
                            {item.barcode}
                          </div>
                          <div 
                            id={`product-name-${item.id}`}
                            className="flex-1 font-medium text-text"
                          >
                            {item.productName}
                          </div>
                          <Badge variant="outline">
                            Cantidad: {item.quantity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Card className="shadow-lg border-2 border-tint/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium">
                  {selectedIds.length} artículos seleccionados
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleTransfer}
                    className="gap-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Transferir al gabinete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
