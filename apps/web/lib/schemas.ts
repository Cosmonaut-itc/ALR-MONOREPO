import * as t from 'io-ts';

export const productStockItemSchema = t.type({
  id: t.string,              // UUID
  barcode: t.number,
  productName: t.string,
  category: t.string,
  warehouse: t.union([t.literal("general"), t.literal("gabinete")]),       // "general" | "gabinete"
  quantity: t.number
});

export const kitItemSchema = t.type({
  productId: t.string,
  qty: t.number
});

export const kitSchema = t.type({
  id: t.string,              // UUID
  employeeId: t.string,      // UUID
  date: t.string,            // ISO date string
  items: t.array(kitItemSchema)
});

// /** rest of code here **/
