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
      <div className="flex-1 space-y-6 p-4 md:p-6 bg-white dark:bg-[#151718] theme-transition">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-[#F9FAFB] dark:bg-[#1E1F20] rounded animate-pulse" />
          <div className="h-4 w-96 bg-[#F9FAFB] dark:bg-[#1E1F20] rounded animate-pulse" />
        </div>
        
        <div className="flex gap-4">
          <div className="h-10 w-80 bg-[#F9FAFB] dark:bg-[#1E1F20] rounded animate-pulse" />
          <div className="h-10 w-48 bg-[#F9FAFB] dark:bg-[#1E1F20] rounded animate-pulse" />
        </div>

        <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#1E1F20] card-transition">
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
    <div className="flex-1 space-y-6 p-4 md:p-6 bg-white dark:bg-[#151718] theme-transition">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
          Transferir al gabinete
        </h1>
        <p className="text-[#687076] dark:text-[#9BA1A6] text-transition">
          Selecciona los artículos del almacén general para transferir al gabinete de trabajo
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#11181C] dark:text-[#ECEDEE] text-transition">Total Artículos</CardTitle>
            <Boxes className="h-4 w-4 text-[#687076] dark:text-[#9BA1A6]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">{items.length}</div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#11181C] dark:text-[#ECEDEE] text-transition">Seleccionados</CardTitle>
            <CheckSquare className="h-4 w-4 text-[#687076] dark:text-[#9BA1A6]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0a7ea4]">{selectedIds.length}</div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#11181C] dark:text-[#ECEDEE] text-transition">Productos Únicos</CardTitle>
            <Boxes className="h-4 w-4 text-[#687076] dark:text-[#9BA1A6]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">{Object.keys(groupedItems).length}</div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#11181C] dark:text-[#ECEDEE] text-transition">Categorías</CardTitle>
            <Boxes className="h-4 w-4 text-[#687076] dark:text-[#9BA1A6]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">{categories.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#687076] dark:text-[#9BA1A6]" />
          <Input
            placeholder="Buscar por nombre o código de barras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] focus:ring-[#0a7ea4] focus:border-[#0a7ea4] input-transition"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full lg:w-48 border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] focus:ring-[#0a7ea4] focus:border-[#0a7ea4] input-transition">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
            <SelectItem value="all" className="text-[#11181C] dark:text-[#ECEDEE] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition">
              Todas las categorías
            </SelectItem>
            {categories.map((category) => (
              <SelectItem 
                key={category} 
                value={category}
                className="text-[#11181C] dark:text-[#ECEDEE] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition"
              >
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transfer Table */}
      <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#1E1F20] card-transition">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#11181C] dark:text-[#ECEDEE] text-transition">
            <Boxes className="h-5 w-5" />
            Artículos disponibles para transferir
          </CardTitle>
          <CardDescription className="text-[#687076] dark:text-[#9BA1A6] text-transition">
            Selecciona los artículos que deseas transferir del almacén general al gabinete
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {Object.keys(groupedItems).length === 0 ? (
            <div className="p-8 text-center text-[#687076] dark:text-[#9BA1A6] text-transition">
              <Boxes className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No se encontraron artículos</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB] dark:divide-[#2D3033]">
              {Object.entries(groupedItems).map(([barcode, groupItems]) => {
                const selectionState = getGroupSelectionState(Number(barcode))
                
                return (
                  <div key={barcode}>
                    {/* Group Header */}
                    <div className="bg-[#F9FAFB]/60 dark:bg-[#1E1F20]/60 p-4 border-b border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
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
                        <div className="flex items-center gap-2 text-[#687076] dark:text-[#9BA1A6] text-transition">
                          <Boxes className="h-4 w-4" />
                          <span className="font-medium">
                            Código de barras {barcode} —— {groupItems.length} artículos
                          </span>
                          <Badge variant="secondary" className="ml-2 bg-[#0a7ea4]/10 text-[#0a7ea4] hover:bg-[#0a7ea4]/20 theme-transition">
                            {groupItems[0].category}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Group Items */}
                    {groupItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 pl-8 hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] transition-colors cursor-pointer theme-transition"
                        onClick={() => toggleSelection(item.id)}
                      >
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={selectedIds.includes(item.id)}
                            onCheckedChange={() => toggleSelection(item.id)}
                            className="h-4 w-4"
                            aria-labelledby={`product-name-${item.id}`}
                          />
                          <div className="text-sm text-[#687076] dark:text-[#9BA1A6] font-mono text-transition">
                            {item.id}
                          </div>
                          <div className="text-sm text-[#687076] dark:text-[#9BA1A6] text-transition">
                            {item.barcode}
                          </div>
                          <div 
                            id={`product-name-${item.id}`}
                            className="flex-1 font-medium text-[#11181C] dark:text-[#ECEDEE] text-transition"
                          >
                            {item.productName}
                          </div>
                          <Badge 
                            variant="outline" 
                            className="border-[#E5E7EB] dark:border-[#2D3033] text-[#687076] dark:text-[#9BA1A6] theme-transition"
                          >
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
          <Card className="shadow-lg border-2 border-[#0a7ea4]/20 bg-white dark:bg-[#1E1F20] theme-transition">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium text-[#11181C] dark:text-[#ECEDEE] text-transition">
                  {selectedIds.length} artículos seleccionados
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    className="gap-2 border-[#E5E7EB] dark:border-[#2D3033] text-[#687076] dark:text-[#9BA1A6] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleTransfer}
                    className="gap-2 bg-[#0a7ea4] hover:bg-[#0a7ea4]/90 text-white theme-transition"
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
