import { create } from "zustand"
import { devtools } from "zustand/middleware"

// Mock data for nail salon employees
const mockEmployees = [
  { id: "emp-1", name: "María González", specialty: "Manicure" },
  { id: "emp-2", name: "Ana Rodríguez", specialty: "Pedicure" },
  { id: "emp-3", name: "Carmen López", specialty: "Nail Art" },
  { id: "emp-4", name: "Sofia Martínez", specialty: "Gel/Acrílico" },
  { id: "emp-5", name: "Isabella Torres", specialty: "Manicure Rusa" },
]

// Mock products for nail salon
const mockProducts = [
  { id: "prod-1", name: "Esmalte Rojo Clásico", category: "Esmaltes", stock: 25 },
  { id: "prod-2", name: "Base Coat Fortalecedora", category: "Bases", stock: 15 },
  { id: "prod-3", name: "Top Coat Brillo", category: "Acabados", stock: 20 },
  { id: "prod-4", name: "Lima Profesional 180/240", category: "Herramientas", stock: 50 },
  { id: "prod-5", name: "Aceite Cutícula Almendra", category: "Cuidado", stock: 30 },
  { id: "prod-6", name: "Removedor Sin Acetona", category: "Removedores", stock: 12 },
  { id: "prod-7", name: "Gel Constructor Rosa", category: "Geles", stock: 8 },
  { id: "prod-8", name: "Decoraciones Strass", category: "Decoración", stock: 100 },
]

export interface Kit {
  id: string
  employeeId: string
  employeeName: string
  date: string
  items: Array<{ productId: string, productName: string, qty: number }>
  totalProducts: number
}

export interface KitItem {
  productId: string
  productName: string
  qty: number
}

interface KitsState {
  kits: Kit[]
  employees: typeof mockEmployees
  products: typeof mockProducts
  draft: {
    employeeId?: string
    employeeName?: string
    date?: string
    items?: KitItem[]
  }
  setDraft: (partial: Partial<KitsState['draft']>) => void
  clearDraft: () => void
  addKit: (kit: Kit) => void
  isLoading: boolean
  setLoading: (loading: boolean) => void
}

export const useKitsStore = create<KitsState>()(
  devtools((set, get) => ({
    kits: [
      // Mock data for demonstration
      {
        id: "kit-1",
        employeeId: "emp-1",
        employeeName: "María González",
        date: new Date().toISOString().split('T')[0],
        items: [
          { productId: "prod-1", productName: "Esmalte Rojo Clásico", qty: 2 },
          { productId: "prod-2", productName: "Base Coat Fortalecedora", qty: 1 },
          { productId: "prod-4", productName: "Lima Profesional 180/240", qty: 3 },
        ],
        totalProducts: 6
      },
      {
        id: "kit-2", 
        employeeId: "emp-3",
        employeeName: "Carmen López",
        date: new Date().toISOString().split('T')[0],
        items: [
          { productId: "prod-7", productName: "Gel Constructor Rosa", qty: 1 },
          { productId: "prod-8", productName: "Decoraciones Strass", qty: 5 },
          { productId: "prod-3", productName: "Top Coat Brillo", qty: 1 },
        ],
        totalProducts: 7
      }
    ],
    employees: mockEmployees,
    products: mockProducts,
    draft: {},
    setDraft: (partial) => set((state) => ({ 
      draft: { ...state.draft, ...partial } 
    })),
    clearDraft: () => set({ draft: {} }),
    addKit: (kit) => set((state) => ({ 
      kits: [...state.kits, kit], 
      draft: {} 
    })),
    isLoading: false,
    setLoading: (loading) => set({ isLoading: loading }),
  }))
)
