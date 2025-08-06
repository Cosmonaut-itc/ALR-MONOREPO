import { create } from "zustand"
import { devtools } from "zustand/middleware"
import type { ProductStockItem } from "@/lib/schemas"

interface ProductStockItemWithInfo extends ProductStockItem {
  productInfo?: { name: string; barcode: number }
}

interface DisposalState {
  current?: ProductStockItemWithInfo
  reason?: "consumido" | "dañado" | "otro"
  open: boolean
  isLoading: boolean
  /** Open dialog for specific item */
  show: (item: ProductStockItemWithInfo) => void
  /** Close dialog & reset */
  hide: () => void
  setReason: (r: "consumido" | "dañado" | "otro") => void
  /** Stub that will eventually POST /api/dispose */
  confirm: () => Promise<void>
}

export const useDisposalStore = create<DisposalState>()(
  devtools((set, get) => ({
    current: undefined,
    reason: undefined,
    open: false,
    isLoading: false,
    
    show: (item) => set({ current: item, open: true, reason: undefined }),
    
    hide: () => set({ 
      current: undefined, 
      reason: undefined, 
      open: false,
      isLoading: false 
    }),
    
    setReason: (reason) => set({ reason }),
    
    confirm: async () => {
      const { current, reason } = get()
      if (!current || !reason) return
      
      set({ isLoading: true })
      
      try {
        // TODO: integrate API call
        // await fetch('/api/dispose', { method: 'POST', body: JSON.stringify({ id: current.id, reason }) })
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        console.log("Disposed", current.id, "reason:", reason)
        
        set({ 
          current: undefined, 
          reason: undefined, 
          open: false,
          isLoading: false 
        })
      } catch (error) {
        console.error("Error disposing item:", error)
        set({ isLoading: false })
        throw error
      }
    },
  }), {
    name: "disposal-store"
  })
)
