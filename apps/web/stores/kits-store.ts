import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { kitSchema } from "@/lib/schemas"

type Kit = typeof kitSchema.infer

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

interface KitItem {
  id: string
  uuid: string
  barcode: string
  productName: string
  returned: boolean
}

interface InspectionProgress {
  total: number
  returned: number
  percentage: number
}

interface KitsState {
  kits: Kit[]
  employees: typeof mockEmployees
  products: typeof mockProducts
  inspectionItems: KitItem[]
  inspectionLoading: boolean
  /** Form draft */
  draft: Partial<Kit>
  setDraft: (partial: Partial<Kit>) => void
  clearDraft: () => void
  addKit: (k: Kit) => void
  loadInspection: (kitId: string, items: KitItem[]) => void
  toggleInspectionItem: (itemId: string) => void
  toggleInspectionGroup: (barcode: string) => void
  markAllReturned: (kitId: string) => void
  getInspectionProgress: () => InspectionProgress
}

export const useKitsStore = create<KitsState>()(
  devtools((set, get) => ({
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
    inspectionItems: [],
    inspectionLoading: false,
    draft: {},
    setDraft: (partial) => set((state) => ({ draft: { ...state.draft, ...partial } })),
    clearDraft: () => set({ draft: {} }),
    addKit: (kit) => set((state) => ({ kits: [...state.kits, kit], draft: {} })),
    
    // New inspection methods
    loadInspection: (kitId, items) => {
      set({ inspectionLoading: true });
      // Simulate loading
      setTimeout(() => {
        set({ 
          inspectionItems: items,
          inspectionLoading: false 
        });
      }, 1000);
    },

    toggleInspectionItem: (itemId) => {
      set((state) => ({
        inspectionItems: state.inspectionItems.map(item =>
          item.id === itemId 
            ? { ...item, returned: !item.returned }
            : item
        )
      }));
    },

    toggleInspectionGroup: (barcode) => {
      set((state) => {
        const groupItems = state.inspectionItems.filter(item => item.barcode === barcode);
        const allReturned = groupItems.every(item => item.returned);
        
        return {
          inspectionItems: state.inspectionItems.map(item =>
            item.barcode === barcode
              ? { ...item, returned: !allReturned }
              : item
          )
        };
      });
    },

    markAllReturned: (kitId) => {
      set((state) => ({
        inspectionItems: state.inspectionItems.map(item => ({
          ...item,
          returned: true
        }))
      }));
    },

    getInspectionProgress: () => {
      const state = get();
      const total = state.inspectionItems.length;
      const returned = state.inspectionItems.filter(item => item.returned).length;
      const percentage = total > 0 ? Math.round((returned / total) * 100) : 0;
      
      return { total, returned, percentage };
    }
  }))
)
