import { create } from "zustand"
import { devtools } from "zustand/middleware"

interface TransferItem {
  id: string
  barcode: number
  productName: string
  category: string
  warehouse: string
  quantity: number
}

export interface TransferCandidate {
  uuid: string
  barcode: number
  productName: string
  category: string
}

interface TransferState {
  /** Items currently displayed in the table (kept for potential reuse) */
  items: TransferItem[]
  /** UUID list of items selected for transfer in legacy flows */
  selectedIds: string[]

  /** The list of selected inventory UUIDs to transfer from AG to Gabinete */
  transferList: TransferCandidate[]

  setItems: (items: TransferItem[]) => void
  toggleSelection: (id: string) => void
  selectGroup: (barcode: number) => void
  clearSelection: () => void

  /** Add multiple candidates to the transfer list */
  addToTransfer: (items: TransferCandidate[]) => void
  /** Remove one candidate from the transfer list by uuid */
  removeFromTransfer: (uuid: string) => void
  /** Clear the transfer list */
  clearTransfer: () => void
  /** Approve and finalize transfer (no API yet) */
  approveTransfer: () => void
}

export const useTransferStore = create<TransferState>()(
  devtools((set, get) => ({
    items: [],
    selectedIds: [],
    transferList: [],

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

    addToTransfer: (items) =>
      set((state) => {
        const existing = new Set(state.transferList.map(i => i.uuid))
        const merged = [
          ...state.transferList,
          ...items.filter(i => !existing.has(i.uuid)),
        ]
        return { transferList: merged }
      }),

    removeFromTransfer: (uuid) =>
      set((state) => ({
        transferList: state.transferList.filter(i => i.uuid !== uuid),
      })),

    clearTransfer: () => set({ transferList: [] }),

    approveTransfer: () => {
      // Placeholder: log and clear
      console.log("Approved transfer →", get().transferList)
      set({ transferList: [] })
    },
  })),
)
