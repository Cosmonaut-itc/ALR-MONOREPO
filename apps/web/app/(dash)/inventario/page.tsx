"use client"

import { useEffect } from "react"
import { Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useInventoryStore } from "@/stores/inventory-store"
import { InventoryTable } from "@/components/inventory/InventoryTable"
import { ProductCombobox } from "@/components/inventory/ProductCombobox"
import { NewProductModal } from "@/components/inventory/NewProductModal"
import { SkeletonInventoryTable } from "@/ui/skeletons/Skeleton.InventoryTable"
import type { ProductStockItem, ProductCatalog } from "@/lib/schemas"

// Helper function to generate UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export default function InventarioPage() {
  const {
    searchTerm,
    selectedCategory,
    selectedWarehouse,
    categories,
    productCatalog,
    isLoadingStock,
    isLoadingCatalog,
    isNewProductModalOpen,
    setStockItems,
    setProductCatalog,
    setCategories,
    setSearchTerm,
    setSelectedCategory,
    setSelectedWarehouse,
    setLoadingStock,
    setLoadingCatalog,
    setNewProductModalOpen,
    getFilteredStockItems,
  } = useInventoryStore()

  // Mock data loading
  useEffect(() => {
    // Mock categories
    const mockCategories = [
      "Acrílicos",
      "Limas",
      "Geles",
      "Bases y Top Coats",
      "Herramientas",
      "Decoración",
      "Cuidado de uñas"
    ]
    setCategories(mockCategories)

    // Mock product catalog
    setTimeout(() => {
      const mockCatalog: ProductCatalog[] = [
        {
          barcode: 7501234567890,
          name: "Acrílico Rosa Claro",
          category: "Acrílicos",
          description: "Acrílico de alta calidad en tono rosa claro"
        },
        {
          barcode: 7501234567891,
          name: "Lima 80/100 Profesional",
          category: "Limas",
          description: "Lima profesional de doble cara"
        },
        {
          barcode: 7501234567892,
          name: "Gel Constructor Transparente",
          category: "Geles",
          description: "Gel constructor de alta resistencia"
        },
        {
          barcode: 7501234567893,
          name: "Base Coat Fortalecedora",
          category: "Bases y Top Coats",
          description: "Base fortalecedora para uñas débiles"
        },
        {
          barcode: 7501234567894,
          name: "Top Coat Brillo Extremo",
          category: "Bases y Top Coats",
          description: "Top coat con acabado de brillo extremo"
        },
        {
          barcode: 7501234567895,
          name: "Pusher de Cutícula",
          category: "Herramientas",
          description: "Herramienta para empujar cutículas"
        },
        {
          barcode: 7501234567896,
          name: "Acrílico Rojo Pasión",
          category: "Acrílicos",
          description: "Acrílico en tono rojo intenso"
        },
        {
          barcode: 7501234567897,
          name: "Strass Cristal 2mm",
          category: "Decoración",
          description: "Cristales decorativos de 2mm"
        },
        {
          barcode: 7501234567898,
          name: "Aceite de Cutícula Lavanda",
          category: "Cuidado de uñas",
          description: "Aceite nutritivo con aroma a lavanda"
        },
        {
          barcode: 7501234567899,
          name: "Lima Buffer 4 Caras",
          category: "Limas",
          description: "Lima buffer de 4 caras para pulir"
        }
      ]
      setProductCatalog(mockCatalog)
      setLoadingCatalog(false)
    }, 1000)

    // Mock stock items with UUIDs
    setTimeout(() => {
      const mockStockItems: ProductStockItem[] = [
        {
          id: "item-001",
          uuid: generateUUID(),
          barcode: 7501234567890,
          lastUsed: "2024-01-15T10:30:00Z",
          lastUsedBy: "María González",
          numberOfUses: 15,
          currentWarehouse: 1,
          isBeingUsed: true,
          firstUsed: "2023-12-01T09:00:00Z"
        },
        {
          id: "item-002",
          uuid: generateUUID(),
          barcode: 7501234567890,
          lastUsed: "2024-01-14T14:20:00Z",
          lastUsedBy: "Ana Martínez",
          numberOfUses: 8,
          currentWarehouse: 1,
          isBeingUsed: false,
          firstUsed: "2023-12-15T11:30:00Z"
        },
        {
          id: "item-003",
          uuid: generateUUID(),
          barcode: 7501234567891,
          lastUsed: "2024-01-13T09:15:00Z",
          lastUsedBy: "Carmen López",
          numberOfUses: 22,
          currentWarehouse: 1,
          isBeingUsed: false,
          firstUsed: "2023-11-20T08:45:00Z"
        },
        {
          id: "item-004",
          uuid: generateUUID(),
          barcode: 7501234567892,
          lastUsed: "2024-01-12T16:45:00Z",
          lastUsedBy: "Sofía Ruiz",
          numberOfUses: 12,
          currentWarehouse: 2,
          isBeingUsed: true,
          firstUsed: "2023-12-10T10:15:00Z"
        },
        {
          id: "item-005",
          uuid: generateUUID(),
          barcode: 7501234567893,
          numberOfUses: 0,
          currentWarehouse: 1,
          isBeingUsed: false,
          firstUsed: "2024-01-10T12:00:00Z"
        },
        {
          id: "item-006",
          uuid: generateUUID(),
          barcode: 7501234567894,
          lastUsed: "2024-01-11T11:30:00Z",
          lastUsedBy: "Elena Vega",
          numberOfUses: 5,
          currentWarehouse: 2,
          isBeingUsed: true,
          firstUsed: "2024-01-05T14:20:00Z"
        },
        {
          id: "item-007",
          uuid: generateUUID(),
          barcode: 7501234567895,
          lastUsed: "2024-01-10T13:20:00Z",
          lastUsedBy: "Patricia Morales",
          numberOfUses: 18,
          currentWarehouse: 1,
          isBeingUsed: false,
          firstUsed: "2023-11-25T16:30:00Z"
        },
        {
          id: "item-008",
          uuid: generateUUID(),
          barcode: 7501234567896,
          lastUsed: "2024-01-14T15:30:00Z",
          lastUsedBy: "Lucía Herrera",
          numberOfUses: 9,
          currentWarehouse: 2,
          isBeingUsed: true,
          firstUsed: "2023-12-20T09:45:00Z"
        },
        {
          id: "item-009",
          uuid: generateUUID(),
          barcode: 7501234567897,
          numberOfUses: 0,
          currentWarehouse: 2,
          isBeingUsed: false,
          firstUsed: "2024-01-08T11:00:00Z"
        },
        {
          id: "item-010",
          uuid: generateUUID(),
          barcode: 7501234567898,
          lastUsed: "2024-01-12T10:45:00Z",
          lastUsedBy: "Raquel Torres",
          numberOfUses: 7,
          currentWarehouse: 2,
          isBeingUsed: false,
          firstUsed: "2023-12-28T13:15:00Z"
        },
        {
          id: "item-011",
          uuid: generateUUID(),
          barcode: 7501234567890,
          lastUsed: "2024-01-13T16:15:00Z",
          lastUsedBy: "Isabella Moreno",
          numberOfUses: 11,
          currentWarehouse: 2,
          isBeingUsed: false,
          firstUsed: "2023-12-05T10:30:00Z"
        },
        {
          id: "item-012",
          uuid: generateUUID(),
          barcode: 7501234567899,
          lastUsed: "2024-01-11T14:20:00Z",
          lastUsedBy: "Valentina Castro",
          numberOfUses: 6,
          currentWarehouse: 1,
          isBeingUsed: true,
          firstUsed: "2024-01-02T09:45:00Z"
        }
      ]
      setStockItems(mockStockItems)
      setLoadingStock(false)
    }, 1500)
  }, [setStockItems, setProductCatalog, setCategories, setLoadingStock, setLoadingCatalog])

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedCategory(undefined)
    setSelectedWarehouse(undefined)
  }

  const filteredItems = getFilteredStockItems()
  const generalItems = filteredItems.filter(item => item.currentWarehouse === 1)
  const gabineteItems = filteredItems.filter(item => item.currentWarehouse === 2)

  const isLoading = isLoadingStock || isLoadingCatalog

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 bg-white dark:bg-[#151718] theme-transition">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
          Inventario
        </h1>
        <p className="text-[#687076] dark:text-[#9BA1A6] text-transition">
          Gestiona el inventario de almacén general y gabinete
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Product Search Combobox */}
          <div className="flex-1">
            <ProductCombobox
              products={productCatalog}
              value={searchTerm}
              onValueChange={setSearchTerm}
              placeholder="Buscar por nombre o código de barras..."
            />
          </div>
          
          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value === "all" ? undefined : value)}>
            <SelectTrigger className="w-full lg:w-48 border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] focus:ring-[#0a7ea4] focus:border-[#0a7ea4] input-transition">
              <SelectValue placeholder="Todas las categorías" />
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
          
          {/* Warehouse Filter */}
          <Select value={selectedWarehouse?.toString()} onValueChange={(value) => setSelectedWarehouse(value === "all" ? undefined : parseInt(value))}>
            <SelectTrigger className="w-full lg:w-48 border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] focus:ring-[#0a7ea4] focus:border-[#0a7ea4] input-transition">
              <SelectValue placeholder="Todos los almacenes" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
              <SelectItem value="all" className="text-[#11181C] dark:text-[#ECEDEE] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition">
                Todos los almacenes
              </SelectItem>
              <SelectItem value="1" className="text-[#11181C] dark:text-[#ECEDEE] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition">
                Almacén General
              </SelectItem>
              <SelectItem value="2" className="text-[#11181C] dark:text-[#ECEDEE] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition">
                Gabinete
              </SelectItem>
            </SelectContent>
          </Select>
          
          {/* Clear Filters */}
          {(searchTerm || selectedCategory || selectedWarehouse) && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="border-[#E5E7EB] dark:border-[#2D3033] text-[#687076] dark:text-[#9BA1A6] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition"
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-[#F9FAFB] dark:bg-[#2D3033] theme-transition">
          <TabsTrigger 
            value="general"
            className="text-[#687076] dark:text-[#9BA1A6] data-[state=active]:text-[#11181C] dark:data-[state=active]:text-[#ECEDEE] data-[state=active]:bg-white dark:data-[state=active]:bg-[#1E1F20] theme-transition"
          >
            Almacén General ({generalItems.length})
          </TabsTrigger>
          <TabsTrigger 
            value="gabinete"
            className="text-[#687076] dark:text-[#9BA1A6] data-[state=active]:text-[#11181C] dark:data-[state=active]:text-[#ECEDEE] data-[state=active]:bg-white dark:data-[state=active]:bg-[#1E1F20] theme-transition"
          >
            Gabinete ({gabineteItems.length})
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4">
          {isLoading ? (
            <SkeletonInventoryTable />
          ) : (
            <InventoryTable items={generalItems} />
          )}
        </TabsContent>

        {/* Gabinete Tab */}
        <TabsContent value="gabinete" className="space-y-4">
          {isLoading ? (
            <SkeletonInventoryTable />
          ) : (
            <InventoryTable items={gabineteItems} />
          )}
        </TabsContent>
      </Tabs>

      {/* Floating Action Button */}
      <Button
        onClick={() => setNewProductModalOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#0a7ea4] hover:bg-[#0a7ea4]/90 text-white shadow-lg theme-transition z-50"
        size="icon"
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">Nuevo artículo</span>
      </Button>

      {/* New Product Modal */}
      <NewProductModal
        open={isNewProductModalOpen}
        onOpenChange={setNewProductModalOpen}
      />
    </div>
  )
}
