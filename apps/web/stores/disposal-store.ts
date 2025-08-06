import { create } from "zustand"
import { devtools } from "zustand/middleware"
import * as t from 'io-ts'
import { productStockItemSchema } from "@/lib/schemas"

type ProductStockItem = t.TypeOf<typeof productStockItemSchema>

interface DisposalState {
  current?: ProductStockItem
  reason?: "consumido" | "dañado" | "otro"
  open: boolean
  loading: boolean
  /** Open dialog for specific item */
  show: (item: ProductStockItem) => void
  /** Close dialog & reset */
  hide: () => void
  setReason: (r: "consumido" | "dañado" | "otro") => void
  setLoading: (loading: boolean) => void
  /** Stub that will eventually POST /api/dispose */
  confirm: () => Promise<void>
}

export const useDisposalStore = create<DisposalState>()(
  devtools((set, get) => ({
    current: undefined,
    reason: undefined,
    open: false,
    loading: false,
    show: (item) => set({ current: item, open: true }),
    hide: () => set({ current: undefined, reason: undefined, open: false }),
    setReason: (reason) => set({ reason }),
    setLoading: (loading) => set({ loading }),
    confirm: async () => {
      const state = get()
      if (!state.current || !state.reason) return

      set({ loading: true })
      
      try {
        // TODO: integrate API call
        // await fetch('/api/dispose', {
        //   method: 'POST',
        //   body: JSON.stringify({
        //     itemId: state.current.id,
        //     reason: state.reason
        //   })
        // })
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        console.log("Disposed", state.current.id, "reason:", state.reason)
        set({ current: undefined, reason: undefined, open: false, loading: false })
      } catch (error) {
        console.error("Error disposing item:", error)
        set({ loading: false })
        throw error
      }
    },
  }))
)
