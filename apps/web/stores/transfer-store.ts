import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { productStockItemSchema } from "@/lib/schemas"

type ProductStockItem = typeof productStockItemSchema.infer

interface TransferState {
  /** Items currently displayed in the table */
  items: ProductStockItem[]
  /** UUID list of items selected for transfer */
  selectedIds: string[]
  toggleSelection: (id: string) => void
  selectGroup: (barcode: number) => void
  clearSelection: () => void
  setItems: (items: ProductStockItem[]) => void
  /** Stub that will eventually POST to /api/transfer */
  transferSelected: () => void
}

export const useTransferStore = create<TransferState>()(
  devtools((set, get) => ({
    items: [],          // populated via props in the page
    selectedIds: [],
    
    setItems: (items) => set({ items }),
    
    toggleSelection: (id) =>
      set((state) => ({
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds.filter(x => x !== id)
          : [...state.selectedIds, id],
      })),
    
    selectGroup: (barcode) =>
      set((state) => {
        const groupIds = state.items
          .filter(i => i.barcode === barcode)
          .map(i => i.id)
        const allSelected = groupIds.every(id =>
          state.selectedIds.includes(id),
        )
        return {
          selectedIds: allSelected
            ? state.selectedIds.filter(id => !groupIds.includes(id))
            : [...state.selectedIds, ...groupIds],
        }
      }),
    
    clearSelection: () => set({ selectedIds: [] }),
    
    transferSelected: () => {
      // TODO: integrate API call
      console.log("Transferred →", get().selectedIds)
      set({ selectedIds: [] })
    },
  })),
)
