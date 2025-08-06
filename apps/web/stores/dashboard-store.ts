import { create } from "zustand"
import type { TopProduct, ActiveEmployee, DashboardMetric } from "@/lib/schemas"

interface DashboardState {
  // User info
  userName: string
  branchName: string
  
  // Dashboard data
  metrics: DashboardMetric[]
  topProducts: TopProduct[]
  activeEmployees: ActiveEmployee[]
  efficiencyData: number
  
  // Loading states
  isLoadingMetrics: boolean
  isLoadingTopProducts: boolean
  isLoadingActiveEmployees: boolean
  isLoadingEfficiency: boolean
  
  // Actions
  setUserInfo: (userName: string, branchName: string) => void
  setMetrics: (metrics: DashboardMetric[]) => void
  setTopProducts: (products: TopProduct[]) => void
  setActiveEmployees: (employees: ActiveEmployee[]) => void
  setEfficiencyData: (efficiency: number) => void
  setLoadingMetrics: (loading: boolean) => void
  setLoadingTopProducts: (loading: boolean) => void
  setLoadingActiveEmployees: (loading: boolean) => void
  setLoadingEfficiency: (loading: boolean) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  // Initial user info
  userName: "Usuario",
  branchName: "Sucursal Principal",
  
  // Initial data
  metrics: [],
  topProducts: [],
  activeEmployees: [],
  efficiencyData: 0,
  
  // Initial loading states
  isLoadingMetrics: true,
  isLoadingTopProducts: true,
  isLoadingActiveEmployees: true,
  isLoadingEfficiency: true,
  
  // Actions
  setUserInfo: (userName, branchName) => set({ userName, branchName }),
  setMetrics: (metrics) => set({ metrics }),
  setTopProducts: (products) => set({ topProducts: products }),
  setActiveEmployees: (employees) => set({ activeEmployees: employees }),
  setEfficiencyData: (efficiency) => set({ efficiencyData: efficiency }),
  setLoadingMetrics: (loading) => set({ isLoadingMetrics: loading }),
  setLoadingTopProducts: (loading) => set({ isLoadingTopProducts: loading }),
  setLoadingActiveEmployees: (loading) => set({ isLoadingActiveEmployees: loading }),
  setLoadingEfficiency: (loading) => set({ isLoadingEfficiency: loading }),
}))
