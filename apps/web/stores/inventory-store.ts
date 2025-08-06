// Create the complete inventory store

import { create } from 'zustand'
import type { ProductStockItem } from '@/lib/schemas'

interface InventoryStore {
  // Products
  generalProducts: ProductStockItem[]
  gabineteProducts: ProductStockItem[]
  
  // Filters
  searchTerm: string
  selectedCategory: string | undefined
  categories: string[]
  
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
  setSelectedCategory: (category: string | undefined) => void
  setLoadingGeneral: (loading: boolean) => void
  setLoadingGabinete: (loading: boolean) => void
  setNewProductModalOpen: (open: boolean) => void
  
  // Computed
  getFilteredProducts: (location: 'general' | 'gabinete') => ProductStockItem[]
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  // Initial state
  generalProducts: [],
  gabineteProducts: [],
  searchTerm: '',
  selectedCategory: undefined,
  categories: [],
  isLoadingGeneral: true,
  isLoadingGabinete: true,
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
    const { generalProducts, gabineteProducts, searchTerm, selectedCategory } = get()
    const products = location === 'general' ? generalProducts : gabineteProducts
    
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.barcode.includes(searchTerm)
      const matchesCategory = !selectedCategory || product.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })
  }
}))
