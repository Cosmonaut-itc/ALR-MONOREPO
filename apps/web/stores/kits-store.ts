import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Kit } from "@/lib/schemas";

// Mock data for employees
export const mockEmployees = [
  {
    id: "emp-001",
    name: "María González",
    specialty: "Manicure Clásica",
    avatar: "/placeholder-user.jpg"
  },
  {
    id: "emp-002", 
    name: "Ana Rodríguez",
    specialty: "Nail Art",
    avatar: "/placeholder-user.jpg"
  },
  {
    id: "emp-003",
    name: "Carmen López",
    specialty: "Pedicure Spa",
    avatar: "/placeholder-user.jpg"
  },
  {
    id: "emp-004",
    name: "Isabel Martín",
    specialty: "Uñas Acrílicas",
    avatar: "/placeholder-user.jpg"
  }
];

// Mock data for products
export const mockProducts = [
  {
    id: "prod-001",
    name: "Esmalte Base Coat",
    category: "Esmaltes",
    stock: 25
  },
  {
    id: "prod-002",
    name: "Esmalte Top Coat",
    category: "Esmaltes", 
    stock: 30
  },
  {
    id: "prod-003",
    name: "Lima de Uñas 180/240",
    category: "Herramientas",
    stock: 50
  },
  {
    id: "prod-004",
    name: "Removedor de Cutícula",
    category: "Tratamientos",
    stock: 15
  },
  {
    id: "prod-005",
    name: "Aceite de Cutícula",
    category: "Tratamientos",
    stock: 20
  },
  {
    id: "prod-006",
    name: "Esmalte Rojo Clásico",
    category: "Esmaltes",
    stock: 12
  }
];

interface KitsState {
  kits: Kit[];
  employees: typeof mockEmployees;
  products: typeof mockProducts;
  /** Form draft */
  draft: Partial<Kit>;
  setDraft: (partial: Partial<Kit>) => void;
  clearDraft: () => void;
  addKit: (k: Kit) => void;
}

export const useKitsStore = create<KitsState>()(
  devtools((set) => ({
    kits: [
      // Mock kit data
      {
        id: "kit-001",
        employeeId: "emp-001",
        date: new Date().toISOString().split('T')[0],
        items: [
          { productId: "prod-001", qty: 2 },
          { productId: "prod-003", qty: 1 },
          { productId: "prod-005", qty: 1 }
        ]
      },
      {
        id: "kit-002", 
        employeeId: "emp-002",
        date: new Date().toISOString().split('T')[0],
        items: [
          { productId: "prod-002", qty: 1 },
          { productId: "prod-006", qty: 3 },
          { productId: "prod-004", qty: 1 }
        ]
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
  }))
);
