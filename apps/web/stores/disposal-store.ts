import { create } from "zustand"
import { devtools } from "zustand/middleware"
import type { ProductStockItem } from "@/lib/schemas"

interface DisposalState {
  current?: ProductStockItem
  reason?: "consumido" | "dañado" | "otro"
  open: boolean
  isLoading: boolean
  /** Open dialog for specific item */
  show: (item: ProductStockItem) => void
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
    
    show: (item) => set({ current: item, open: true }),
    
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
  }))
)
