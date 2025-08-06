import { create } from "zustand"
import { devtools } from "zustand/middleware"
import * as t from 'io-ts'
import { kitSchema } from "@/lib/schemas"

type Kit = t.TypeOf<typeof kitSchema>

interface KitsState {
  kits: Kit[]
  /** Form draft */
  draft: Partial<Kit>
  setDraft: (partial: Partial<Kit>) => void
  clearDraft: () => void
  addKit: (k: Kit) => void
  loading: boolean
  setLoading: (loading: boolean) => void
}

export const useKitsStore = create<KitsState>()(
  devtools((set) => ({
    kits: [
      // Mock data for nail salon
      {
        id: "kit-001",
        employeeId: "emp-001",
        date: new Date().toISOString().split('T')[0],
        items: [
          { productId: "prod-001", qty: 2 },
          { productId: "prod-002", qty: 1 },
          { productId: "prod-003", qty: 3 }
        ]
      },
      {
        id: "kit-002", 
        employeeId: "emp-002",
        date: new Date().toISOString().split('T')[0],
        items: [
          { productId: "prod-004", qty: 1 },
          { productId: "prod-005", qty: 2 }
        ]
      }
    ],
    draft: {},
    loading: false,
    setDraft: (partial) => set((state) => ({ 
      draft: { ...state.draft, ...partial } 
    })),
    clearDraft: () => set({ draft: {} }),
    addKit: (kit) => set((state) => ({ 
      kits: [...state.kits, kit], 
      draft: {} 
    })),
    setLoading: (loading) => set({ loading })
  }))
)
