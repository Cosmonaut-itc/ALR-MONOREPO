import { create } from "zustand"
import { devtools } from "zustand/middleware"

interface ProductStockItem {
  id: string
  nombre: string
  codigoBarras: string
  cantidad: number
  categoria: string
  marca: string
  precio: number
}

interface DisposalState {
  current?: ProductStockItem
  reason?: "consumido" | "dañado" | "otro"
  open: boolean
  isLoading: boolean
  
  /** Abrir diálogo para artículo específico */
  show: (item: ProductStockItem) => void
  
  /** Cerrar diálogo y resetear */
  hide: () => void
  
  /** Establecer motivo de baja */
  setReason: (reason: "consumido" | "dañado" | "otro") => void
  
  /** Confirmar baja del artículo */
  confirm: () => Promise<void>
}

export const useDisposalStore = create<DisposalState>()(
  devtools((set, get) => ({
    current: undefined,
    reason: undefined,
    open: false,
    isLoading: false,

    show: (item) => set({ 
      current: item, 
      open: true,
      reason: undefined 
    }),

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
        // TODO: Integrar llamada a la API
        // await fetch('/api/dispose', { ... })
        
        // Simulación de llamada API
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        console.log("Artículo dado de baja:", current.id, "Motivo:", reason)
        
        set({ 
          current: undefined, 
          reason: undefined, 
          open: false,
          isLoading: false 
        })
      } catch (error) {
        console.error("Error al dar de baja el artículo:", error)
        set({ isLoading: false })
      }
    },
  }), {
    name: "disposal-store"
  })
)
