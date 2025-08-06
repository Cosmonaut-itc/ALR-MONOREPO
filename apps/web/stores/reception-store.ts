import { create } from 'zustand'
import type { ReceptionItem } from '@/lib/schemas'

interface ReceptionStore {
  items: ReceptionItem[]
  setItems: (items: ReceptionItem[]) => void
  toggleReceived: (itemId: string) => void
  markAllReceived: () => void
  getReceivedCount: () => number
  getTotalCount: () => number
  isAllReceived: () => boolean
}

export const useReceptionStore = create<ReceptionStore>((set, get) => ({
  items: [],
  
  setItems: (items) => set({ items }),
  
  toggleReceived: (itemId) => set((state) => ({
    items: state.items.map(item =>
      item.id === itemId ? { ...item, received: !item.received } : item
    )
  })),
  
  markAllReceived: () => set((state) => ({
    items: state.items.map(item => ({ ...item, received: true }))
  })),
  
  getReceivedCount: () => {
    const { items } = get()
    return items.filter(item => item.received).length
  },
  
  getTotalCount: () => {
    const { items } = get()
    return items.length
  },
  
  isAllReceived: () => {
    const { items } = get()
    return items.length > 0 && items.every(item => item.received)
  }
}))
