import { create } from "zustand"
import type { ProductStockItem } from "@/lib/schemas"

interface InventoryState {
  // Data
  generalProducts: ProductStockItem[]
  gabineteProducts: ProductStockItem[]
  categories: string[]
  
  // Filters
  searchTerm: string
  selectedCategory: string
  
  // Loading states
  isLoadingGeneral: boolean
  isLoadingGabinete: boolean
  
  // Modal state
  isNewProductModalOpen: boolean
  
  // Actions
  setGeneralProducts: (products: ProductStockItem[]) => void
  setGabineteProducts: (products: ProductStockItem[]) => void
  setCategories: (categories: string[]) => void
  setSearchTerm: (term: string) => void
  setSelectedCategory: (category: string) => void
  setLoadingGeneral: (loading: boolean) => void
  setLoadingGabinete: (loading: boolean) => void
  setNewProductModalOpen: (open: boolean) => void
  
  // Computed
  getFilteredProducts: (location: 'general' | 'gabinete') => ProductStockItem[]
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  // Initial data
  generalProducts: [],
  gabineteProducts: [],
  categories: [],
  
  // Initial filters
  searchTerm: "",
  selectedCategory: "",
  
  // Initial loading states
  isLoadingGeneral: true,
  isLoadingGabinete: true,
  
  // Initial modal state
  isNewProductModalOpen: false,
  
  // Actions
  setGeneralProducts: (products) => set({ generalProducts: products }),
  setGabineteProducts: (products) => set({ gabineteProducts: products }),
  setCategories: (categories) => set({ categories }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setLoadingGeneral: (loading) => set({ isLoadingGeneral: loading }),
  setLoadingGabinete: (loading) => set({ isLoadingGabinete: loading }),
  setNewProductModalOpen: (open) => set({ isNewProductModalOpen: open }),
  
  // Computed
  getFilteredProducts: (location) => {
    const { searchTerm, selectedCategory } = get()
    const products = location === 'general' ? get().generalProducts : get().gabineteProducts
    
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.barcode.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = !selectedCategory || product.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })
  }
}))
