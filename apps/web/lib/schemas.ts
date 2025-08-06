import { t } from "arktype"

export const productStatSchema = t({
  id: "string",
  name: "string", 
  uses: "number"
})

export const employeeUseSchema = t({
  id: "string",
  fullname: "string",
  avatarUrl: "string.url?",
  productName: "string"
})

export const efficiencySchema = t({
  productId: "string",
  efficiency: "number"
})

// New dashboard schemas
export const topProductSchema = t({
  id: "string",
  name: "string",
  uses: "number"
})

export const activeEmployeeSchema = t({
  id: "string",
  fullname: "string",
  avatarUrl: "string.url?",
  productName: "string"
})

export const dashboardMetricSchema = t({
  id: "string",
  label: "string",
  value: "number",
  icon: "string"
})

// Inventory schemas
export const productStockItemSchema = t({
  id: "string",
  barcode: "string",
  name: "string",
  category: "string",
  stock: "number",
  lastUsed: "string", // ISO date string
  inUse: "boolean",
  location: "'general' | 'gabinete'" // almacén general o gabinete
})

export type ProductStat = typeof productStatSchema.infer
export type EmployeeUse = typeof employeeUseSchema.infer
export type Efficiency = typeof efficiencySchema.infer
export type TopProduct = typeof topProductSchema.infer
export type ActiveEmployee = typeof activeEmployeeSchema.infer
export type DashboardMetric = typeof dashboardMetricSchema.infer
export type ProductStockItem = typeof productStockItemSchema.infer
