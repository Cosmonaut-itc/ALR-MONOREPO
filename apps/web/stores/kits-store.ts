import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { kitSchema, receptionItemSchema } from "@/lib/schemas"

type Kit = typeof kitSchema.infer
type KitItem = typeof receptionItemSchema.infer // mismo shape que item individual

// Mock data for employees
export const mockEmployees = [
  {
    id: "emp-001",
    name: "María González",
    specialty: "Manicure Clásica",
    avatar: "/placeholder-user.jpg",
    active: true,
  },
  {
    id: "emp-002", 
    name: "Ana Rodríguez",
    specialty: "Nail Art",
    avatar: "/placeholder-user.jpg",
    active: true,
  },
  {
    id: "emp-003",
    name: "Carmen López",
    specialty: "Pedicure Spa",
    avatar: "/placeholder-user.jpg",
    active: true,
  },
  {
    id: "emp-004",
    name: "Isabel Martín",
    specialty: "Uñas Acrílicas",
    avatar: "/placeholder-user.jpg",
    active: true,
  },
  {
    id: "emp-005",
    name: "Laura Sánchez",
    specialty: "Gel Polish",
    avatar: "/placeholder-user.jpg",
    active: false,
  },
]

// Mock data for products
export const mockProducts = [
  {
    id: "prod-001",
    name: "Esmalte Base Coat",
    category: "Esmaltes",
    brand: "OPI",
    price: 15.99,
    stock: 25,
  },
  {
    id: "prod-002",
    name: "Esmalte Top Coat",
    category: "Esmaltes",
    brand: "OPI",
    price: 15.99,
    stock: 30,
  },
  {
    id: "prod-003",
    name: "Lima de Uñas 180/240",
    category: "Herramientas",
    brand: "Sally Hansen",
    price: 3.50,
    stock: 50,
  },
  {
    id: "prod-004",
    name: "Removedor de Cutícula",
    category: "Cuidado",
    brand: "CND",
    price: 12.99,
    stock: 15,
  },
  {
    id: "prod-005",
    name: "Aceite de Cutícula",
    category: "Cuidado",
    brand: "Essie",
    price: 8.99,
    stock: 20,
  },
  {
    id: "prod-006",
    name: "Esmalte Rojo Clásico",
    category: "Esmaltes",
    brand: "Chanel",
    price: 28.00,
    stock: 12,
  },
]

interface KitsState {
  kits: Kit[]
  employees: typeof mockEmployees
  products: typeof mockProducts
  /** Form draft para nueva asignación */
  draft: Partial<Kit>
  /** Items en modo inspección */
  inspectionItems: Record<string, KitItem[]> // key = kitId
  setDraft: (partial: Partial<Kit>) => void
  clearDraft: () => void
  addKit: (k: Kit) => void
  /**
   * Inspección
   */
  loadInspection: (kitId: string, items: KitItem[]) => void
  toggleReturned: (kitId: string, itemId: string) => void
  markAllReturned: (kitId: string) => void
}

export const useKitsStore = create<KitsState>()(
  devtools((set) => ({
    kits: [
      {
        id: "kit-001",
        employeeId: "emp-001",
        date: new Date().toISOString(),
        items: [
          { productId: "prod-001", qty: 2 },
          { productId: "prod-003", qty: 5 },
          { productId: "prod-004", qty: 1 },
        ],
      },
      {
        id: "kit-002", 
        employeeId: "emp-002",
        date: new Date().toISOString(),
        items: [
          { productId: "prod-002", qty: 3 },
          { productId: "prod-005", qty: 2 },
          { productId: "prod-006", qty: 4 },
        ],
      },
    ],
    employees: mockEmployees,
    products: mockProducts,
    draft: {},
    inspectionItems: {},
    setDraft: (partial) => set((s) => ({ draft: { ...s.draft, ...partial } })),
    clearDraft: () => set({ draft: {} }),
    addKit: (kit) => set((s) => ({ kits: [...s.kits, kit], draft: {} })),
    loadInspection: (kitId, items) =>
      set((s) => ({ inspectionItems: { ...s.inspectionItems, [kitId]: items } })),
    toggleReturned: (kitId, itemId) =>
      set((s) => {
        const items = s.inspectionItems[kitId] ?? []
        return {
          inspectionItems: {
            ...s.inspectionItems,
            [kitId]: items.map((it) =>
              it.id === itemId ? { ...it, received: !it.received } : it
            ),
          },
        }
      }),
    markAllReturned: (kitId) =>
      set((s) => {
        const items = s.inspectionItems[kitId] ?? []
        return {
          inspectionItems: {
            ...s.inspectionItems,
            [kitId]: items.map((it) => ({ ...it, received: true })),
          },
        }
      }),
  }))
)
