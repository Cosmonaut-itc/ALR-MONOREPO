import { z } from "zod";

// Add the productStockItemSchema to the existing schemas

export const productStockItemSchema = z.object({
  id: z.string(),
  barcode: z.string(),
  name: z.string(),
  category: z.string(),
  stock: z.number(),
  lastUsed: z.string(),
  inUse: z.boolean(),
  location: z.enum(["general", "gabinete"])
})

export type ProductStockItem = z.infer<typeof productStockItemSchema>
