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

// Updated inventory schemas
export const productStockItemSchema = t({
  id: "string",
  uuid: "string", // Unique UUID for each product instance
  barcode: "number",
  lastUsed: "string.date.iso.parse?",
  lastUsedBy: "string?",
  numberOfUses: "number",
  currentWarehouse: "number", // 1 = general, 2 = gabinete
  isBeingUsed: "boolean",
  firstUsed: "string.date.iso.parse?"
})

// Product catalog schema (for product details by barcode)
export const productCatalogSchema = t({
  barcode: "number",
  name: "string",
  category: "string",
  description: "string?"
})

// Reception schemas
export const receptionSchema = t({
  shipmentNumber: "string",
  arrivalDate: "string.date.iso.parse",
  lines: "array<{ barcode: number, quantity: number }>"
})

export const receptionHistorySchema = t({
  id: "string",
  shipmentNumber: "string",
  arrivalDate: "string.date.iso.parse",
  totalItems: "number",
  receivedBy: "string",
  createdAt: "string.date.iso.parse"
})

// New reception schemas for distribution center
export const receptionHeaderSchema = t({
  shipmentId: "string",          // UUID
  arrivalDate: "string.date.iso.parse",
  totalItems: "number",
  status: t.union("pendiente", "completada")
})

export const receptionItemSchema = t({
  id: "string",              // UUID
  barcode: "number",
  productName: "string",
  received: "boolean"
})

export type ProductStat = typeof productStatSchema.infer
export type EmployeeUse = typeof employeeUseSchema.infer
export type Efficiency = typeof efficiencySchema.infer
export type TopProduct = typeof topProductSchema.infer
export type ActiveEmployee = typeof activeEmployeeSchema.infer
export type DashboardMetric = typeof dashboardMetricSchema.infer
export type ProductStockItem = typeof productStockItemSchema.infer
export type ProductCatalog = typeof productCatalogSchema.infer
export type Reception = typeof receptionSchema.infer
export type ReceptionHistory = typeof receptionHistorySchema.infer
export type ReceptionHeader = typeof receptionHeaderSchema.infer
export type ReceptionItem = typeof receptionItemSchema.infer
