import { create } from "zustand"
import { devtools } from "zustand/middleware"
import type { Kit } from "@/lib/schemas"

// Mock data for employees
const mockEmployees = [
  { id: "emp-1", name: "María González", specialty: "Manicure Clásica", avatar: "/placeholder-user.jpg" },
  { id: "emp-2", name: "Ana Rodríguez", specialty: "Nail Art", avatar: "/placeholder-user.jpg" },
  { id: "emp-3", name: "Carmen López", specialty: "Pedicure", avatar: "/placeholder-user.jpg" },
  { id: "emp-4", name: "Sofia Martínez", specialty: "Uñas Acrílicas", avatar: "/placeholder-user.jpg" },
  { id: "emp-5", name: "Isabella Torres", specialty: "Gel Polish", avatar: "/placeholder-user.jpg" }
];

// Mock data for products
const mockProducts = [
  { id: "prod-1", name: "Esmalte Rojo Clásico", category: "Esmaltes", price: 15.99 },
  { id: "prod-2", name: "Base Coat Fortalecedora", category: "Bases", price: 18.50 },
  { id: "prod-3", name: "Top Coat Brillante", category: "Acabados", price: 16.75 },
  { id: "prod-4", name: "Lima de Uñas Profesional", category: "Herramientas", price: 8.99 },
  { id: "prod-5", name: "Aceite Cuticular", category: "Cuidado", price: 12.50 },
  { id: "prod-6", name: "Removedor de Esmalte", category: "Limpieza", price: 9.99 },
  { id: "prod-7", name: "Algodón Cosmético", category: "Consumibles", price: 5.50 },
  { id: "prod-8", name: "Palitos de Naranjo", category: "Herramientas", price: 3.99 }
];

interface KitsState {
  kits: Kit[]
  employees: typeof mockEmployees
  products: typeof mockProducts
  /** Form draft */
  draft: Partial<Kit>
  setDraft: (partial: Partial<Kit>) => void
  clearDraft: () => void
  addKit: (k: Kit) => void
  getEmployeeById: (id: string) => typeof mockEmployees[0] | undefined
  getProductById: (id: string) => typeof mockProducts[0] | undefined
}

export const useKitsStore = create<KitsState>()(
  devtools((set, get) => ({
    kits: [
      {
        id: "kit-1",
        employeeId: "emp-1",
        date: new Date().toISOString().split('T')[0],
        items: [
          { productId: "prod-1", qty: 2 },
          { productId: "prod-2", qty: 1 },
          { productId: "prod-4", qty: 3 }
        ]
      },
      {
        id: "kit-2",
        employeeId: "emp-2",
        date: new Date().toISOString().split('T')[0],
        items: [
          { productId: "prod-3", qty: 1 },
          { productId: "prod-5", qty: 2 },
          { productId: "prod-7", qty: 5 }
        ]
      }
    ],
    employees: mockEmployees,
    products: mockProducts,
    draft: {},
    setDraft: partial => set(state => ({ draft: { ...state.draft, ...partial } })),
    clearDraft: () => set({ draft: {} }),
    addKit: kit => set(state => ({ kits: [...state.kits, kit], draft: {} })),
    getEmployeeById: (id: string) => get().employees.find(emp => emp.id === id),
    getProductById: (id: string) => get().products.find(prod => prod.id === id),
  })),
)
