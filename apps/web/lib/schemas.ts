import * as t from 'io-ts';

export const productStockItemSchema = t.type({
  id: t.string,              // UUID
  barcode: t.number,
  productName: t.string,
  category: t.string,
  warehouse: t.union([t.literal("general"), t.literal("gabinete")]),       // "general" | "gabinete"
  quantity: t.number
});

// /** rest of code here **/
