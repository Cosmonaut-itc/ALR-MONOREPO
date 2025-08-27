import { type as t } from 'arktype';

// Existing schemas
export const productSchema = t({
	id: 'string.uuid',
	name: 'string',
	category: 'string',
	brand: 'string',
	sku: 'string',
	price: 'number',
	stock: 'number',
	minStock: 'number',
	maxStock: 'number',
	location: 'string',
	supplier: 'string',
	description: 'string',
	imageUrl: 'string',
	createdAt: 'string.date.iso.parse',
	updatedAt: 'string.date.iso.parse',
});

export const transferSchema = t({
	id: 'string.uuid',
	fromLocation: 'string',
	toLocation: 'string',
	items: [{ productId: 'string', qty: 'number' }, '[]'],
	status: "'pending' | 'in_transit' | 'completed' | 'cancelled'",
	requestedBy: 'string.uuid',
	approvedBy: 'string.uuid?',
	createdAt: 'string.date.iso.parse',
	updatedAt: 'string.date.iso.parse',
});

export const receptionSchema = t({
	id: 'string.uuid',
	shipmentId: 'string',
	supplier: 'string',
	items: [{ productId: 'string', expectedQty: 'number', receivedQty: 'number' }, '[]'],
	status: "'pending' | 'partial' | 'completed'",
	receivedBy: 'string.uuid',
	receivedAt: 'string.date.iso.parse?',
	createdAt: 'string.date.iso.parse',
	updatedAt: 'string.date.iso.parse',
});

// New kit schema
export const kitSchema = t({
	id: 'string.uuid',
	employeeId: 'string.uuid',
	date: 'string.date.iso.parse',
	items: [{ productId: 'string', qty: 'number' }, '[]'],
});

// Agregar después del kitSchema existente
export const kitItemSchema = t({
	id: 'string',
	uuid: 'string',
	barcode: 'number',
	productName: 'string',
	returned: 'boolean',
});

// Product stock item schema for disposal
export const productStockItemSchema = t({
	id: 'string',
	uuid: 'string',
	barcode: 'number',
	productInfo: {
		name: 'string',
		category: 'string?',
		description: 'string?',
	},
});

export type Product = typeof productSchema.infer;
export type Transfer = typeof transferSchema.infer;
export type Reception = typeof receptionSchema.infer;
export type Kit = typeof kitSchema.infer;
export type KitItem = typeof kitItemSchema.infer;
export type ProductStockItem = typeof productStockItemSchema.infer;
