import { create } from 'zustand'
import type { ProductStockItem, ProductCatalog } from '@/lib/schemas'

interface InventoryStore {
  // Products
  stockItems: ProductStockItem[]
  productCatalog: ProductCatalog[]
  
  // Filters
  searchTerm: string
  selectedCategory: string | undefined
  selectedWarehouse: number | undefined // 1 = general, 2 = gabinete
  categories: string[]
  
  // Loading states
  isLoadingStock: boolean
  isLoadingCatalog: boolean
  
  // Modal state
  isNewProductModalOpen: boolean
  
  // Actions
  setStockItems: (items: ProductStockItem[]) => void
  setProductCatalog: (catalog: ProductCatalog[]) => void
  setCategories: (categories: string[]) => void
  setSearchTerm: (term: string) => void
  setSelectedCategory: (category: string | undefined) => void
  setSelectedWarehouse: (warehouse: number | undefined) => void
  setLoadingStock: (loading: boolean) => void
  setLoadingCatalog: (loading: boolean) => void
  setNewProductModalOpen: (open: boolean) => void
  
  // Computed
  getFilteredStockItems: () => (ProductStockItem & { productInfo: ProductCatalog | undefined })[]
  getProductByBarcode: (barcode: number) => ProductCatalog | undefined
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  // Initial state
  stockItems: [],
  productCatalog: [],
  searchTerm: '',
  selectedCategory: undefined,
  selectedWarehouse: undefined,
  categories: [],
  isLoadingStock: true,
  isLoadingCatalog: true,
  isNewProductModalOpen: false,
  
  // Actions
  setStockItems: (items) => set({ stockItems: items }),
  setProductCatalog: (catalog) => set({ productCatalog: catalog }),
  setCategories: (categories) => set({ categories }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSelectedWarehouse: (warehouse) => set({ selectedWarehouse: warehouse }),
  setLoadingStock: (loading) => set({ isLoadingStock: loading }),
  setLoadingCatalog: (loading) => set({ isLoadingCatalog: loading }),
  setNewProductModalOpen: (open) => set({ isNewProductModalOpen: open }),
  
  // Computed
  getFilteredStockItems: () => {
    const { stockItems, productCatalog, searchTerm, selectedCategory, selectedWarehouse } = get()
    
    return stockItems
      .filter((item) => {
        // Filter by warehouse
        if (selectedWarehouse && item.currentWarehouse !== selectedWarehouse) {
          return false
        }
        
        const productInfo = productCatalog.find(p => p.barcode === item.barcode)
        
        // Filter by search term (name or barcode)
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase()
          const matchesBarcode = item.barcode.toString().includes(searchTerm)
          const matchesName = productInfo?.name.toLowerCase().includes(searchLower) || false
          
          if (!matchesBarcode && !matchesName) {
            return false
          }
        }
        
        // Filter by category
        if (selectedCategory && productInfo?.category !== selectedCategory) {
          return false
        }
        
        return true
      })
      .map((item) => ({
        ...item,
        productInfo: productCatalog.find(p => p.barcode === item.barcode)
      }))
  },
  
  getProductByBarcode: (barcode) => {
    const { productCatalog } = get()
    return productCatalog.find(p => p.barcode === barcode)
  }
}))
