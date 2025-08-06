"use client"

import { useEffect } from "react"
import { Plus, Search } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useInventoryStore } from "@/stores/inventory-store"
import { InventoryTable } from "@/components/inventory/InventoryTable"
import { NewProductModal } from "@/components/inventory/NewProductModal"
import { SkeletonInventoryTable } from "@/ui/skeletons/Skeleton.InventoryTable"
import type { ProductStockItem } from "@/lib/schemas"

export default function InventarioPage() {
  const {
    searchTerm,
    selectedCategory,
    categories,
    isLoadingGeneral,
    isLoadingGabinete,
    isNewProductModalOpen,
    setGeneralProducts,
    setGabineteProducts,
    setCategories,
    setSearchTerm,
    setSelectedCategory,
    setLoadingGeneral,
    setLoadingGabinete,
    setNewProductModalOpen,
    getFilteredProducts,
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

    // Mock general products
    setTimeout(() => {
      const mockGeneralProducts: ProductStockItem[] = [
        {
          id: "1",
          barcode: "7501234567890",
          name: "Acrílico Rosa Claro",
          category: "Acrílicos",
          stock: 25,
          lastUsed: "2024-01-15T10:30:00Z",
          inUse: true,
          location: "general"
        },
        {
          id: "2",
          barcode: "7501234567891",
          name: "Lima 80/100 Profesional",
          category: "Limas",
          stock: 45,
          lastUsed: "2024-01-14T14:20:00Z",
          inUse: false,
          location: "general"
        },
        {
          id: "3",
          barcode: "7501234567892",
          name: "Gel Constructor Transparente",
          category: "Geles",
          stock: 12,
          lastUsed: "2024-01-13T09:15:00Z",
          inUse: true,
          location: "general"
        },
        {
          id: "4",
          barcode: "7501234567893",
          name: "Base Coat Fortalecedora",
          category: "Bases y Top Coats",
          stock: 8,
          lastUsed: "2024-01-12T16:45:00Z",
          inUse: false,
          location: "general"
        },
        {
          id: "5",
          barcode: "7501234567894",
          name: "Top Coat Brillo Extremo",
          category: "Bases y Top Coats",
          stock: 3,
          lastUsed: "2024-01-11T11:30:00Z",
          inUse: true,
          location: "general"
        },
        {
          id: "6",
          barcode: "7501234567895",
          name: "Pusher de Cutícula",
          category: "Herramientas",
          stock: 15,
          lastUsed: "2024-01-10T13:20:00Z",
          inUse: false,
          location: "general"
        }
      ]
      setGeneralProducts(mockGeneralProducts)
      setLoadingGeneral(false)
    }, 1500)

    // Mock gabinete products
    setTimeout(() => {
      const mockGabineteProducts: ProductStockItem[] = [
        {
          id: "7",
          barcode: "7501234567896",
          name: "Acrílico Rojo Pasión",
          category: "Acrílicos",
          stock: 18,
          lastUsed: "2024-01-14T15:30:00Z",
          inUse: true,
          location: "gabinete"
        },
        {
          id: "8",
          barcode: "7501234567897",
          name: "Strass Cristal 2mm",
          category: "Decoración",
          stock: 200,
          lastUsed: "2024-01-13T12:15:00Z",
          inUse: false,
          location: "gabinete"
        },
        {
          id: "9",
          barcode: "7501234567898",
          name: "Aceite de Cutícula Lavanda",
          category: "Cuidado de uñas",
          stock: 6,
          lastUsed: "2024-01-12T10:45:00Z",
          inUse: true,
          location: "gabinete"
        },
        {
          id: "10",
          barcode: "7501234567899",
          name: "Lima Buffer 4 Caras",
          category: "Limas",
          stock: 22,
          lastUsed: "2024-01-11T14:20:00Z",
          inUse: false,
          location: "gabinete"
        }
      ]
      setGabineteProducts(mockGabineteProducts)
      setLoadingGabinete(false)
    }, 2000)
  }, [setGeneralProducts, setGabineteProducts, setCategories, setLoadingGeneral, setLoadingGabinete])

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedCategory("")
  }

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

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-[#F9FAFB] dark:bg-[#2D3033] theme-transition">
          <TabsTrigger 
            value="general"
            className="text-[#687076] dark:text-[#9BA1A6] data-[state=active]:text-[#11181C] dark:data-[state=active]:text-[#ECEDEE] data-[state=active]:bg-white dark:data-[state=active]:bg-[#1E1F20] theme-transition"
          >
            Almacén General
          </TabsTrigger>
          <TabsTrigger 
            value="gabinete"
            className="text-[#687076] dark:text-[#9BA1A6] data-[state=active]:text-[#11181C] dark:data-[state=active]:text-[#ECEDEE] data-[state=active]:bg-white dark:data-[state=active]:bg-[#1E1F20] theme-transition"
          >
            Gabinete
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4">
          {isLoadingGeneral ? (
            <SkeletonInventoryTable />
          ) : (
            <>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#687076] dark:text-[#9BA1A6] icon-transition" />
                  <Input
                    placeholder="Buscar producto…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] placeholder:text-[#687076] dark:placeholder:text-[#9BA1A6] focus:ring-[#0a7ea4] focus:border-[#0a7ea4] input-transition"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48 border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] focus:ring-[#0a7ea4] focus:border-[#0a7ea4] input-transition">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
                    <SelectItem value="" className="text-[#11181C] dark:text-[#ECEDEE] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition">
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
                {(searchTerm || selectedCategory) && (
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    className="border-[#E5E7EB] dark:border-[#2D3033] text-[#687076] dark:text-[#9BA1A6] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition"
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>

              {/* Table */}
              <InventoryTable products={getFilteredProducts('general')} />
            </>
          )}
        </TabsContent>

        {/* Gabinete Tab */}
        <TabsContent value="gabinete" className="space-y-4">
          {isLoadingGabinete ? (
            <SkeletonInventoryTable />
          ) : (
            <>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#687076] dark:text-[#9BA1A6] icon-transition" />
                  <Input
                    placeholder="Buscar producto…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] placeholder:text-[#687076] dark:placeholder:text-[#9BA1A6] focus:ring-[#0a7ea4] focus:border-[#0a7ea4] input-transition"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48 border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] focus:ring-[#0a7ea4] focus:border-[#0a7ea4] input-transition">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
                    <SelectItem value="" className="text-[#11181C] dark:text-[#ECEDEE] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition">
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
                {(searchTerm || selectedCategory) && (
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    className="border-[#E5E7EB] dark:border-[#2D3033] text-[#687076] dark:text-[#9BA1A6] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition"
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>

              {/* Table */}
              <InventoryTable products={getFilteredProducts('gabinete')} />
            </>
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
