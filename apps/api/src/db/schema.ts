import { relations, sql } from 'drizzle-orm';
import {
	type AnyPgColumn,
	boolean,
	date,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified')
		.$defaultFn(() => false)
		.notNull(),
	image: text('image'),
	role: text('role').default('employee').notNull(), // User role: admin, manager, employee, viewer
	warehouseId: uuid('warehouse_id').references((): AnyPgColumn => warehouse.id), // Reference to assigned warehouse
	createdAt: timestamp('created_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp('updated_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()),
	updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date()),
});

export const apikey = pgTable('apikey', {
	id: text('id').primaryKey(),
	name: text('name'),
	start: text('start'),
	prefix: text('prefix'),
	key: text('key').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	refillInterval: integer('refill_interval'),
	refillAmount: integer('refill_amount'),
	lastRefillAt: timestamp('last_refill_at'),
	enabled: boolean('enabled').default(true),
	rateLimitEnabled: boolean('rate_limit_enabled').default(true),
	rateLimitTimeWindow: integer('rate_limit_time_window').default(86_400_000),
	rateLimitMax: integer('rate_limit_max').default(10),
	requestCount: integer('request_count'),
	remaining: integer('remaining'),
	lastRequest: timestamp('last_request'),
	expiresAt: timestamp('expires_at'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	permissions: text('permissions'),
	metadata: text('metadata'),
});

//Create a health check table
export const healthCheck = pgTable('health_check', {
	id: text('id').primaryKey(),
	status: text('status').notNull(),
	timestamp: timestamp('timestamp')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	message: text('message'),
});

export const productStock = pgTable('product_stock', {
	id: uuid('id').defaultRandom().primaryKey().notNull(),
	barcode: integer('barcode').default(0).notNull(),
	description: text('description'),
	lastUsed: date('last_used'),
	lastUsedBy: uuid('last_used_by').references(() => employee.id),
	numberOfUses: integer('number_of_uses').default(0).notNull(),
	isDeleted: boolean('is_deleted').default(false).notNull(),
	currentWarehouse: uuid('current_warehouse')
		.notNull()
		.references(() => warehouse.id, {
			onUpdate: 'cascade',
			onDelete: 'restrict',
		}),
	// Optional current cabinet location for internal moves
	currentCabinet: uuid('current_cabinet').references(() => cabinetWarehouse.id),
	isBeingUsed: boolean('is_being_used').default(false).notNull(),
	isKit: boolean('is_kit').default(false).notNull(),
	firstUsed: date('first_used'),
});

export const withdrawOrder = pgTable('withdraw_order', {
	id: uuid('id').defaultRandom().primaryKey().notNull(),
	dateWithdraw: date('date_withdraw').defaultNow().notNull(),
	dateReturn: date('date_return'),
	userId: uuid('user_id').references(() => employee.id),
	numItems: integer('num_items').default(1).notNull(),
	isComplete: boolean('is_complete').default(false),
});

export const withdrawOrderDetails = pgTable('withdraw_order_details', {
	id: uuid('id').defaultRandom().primaryKey().notNull(),
	productId: uuid('product_id')
		.notNull()
		.references(() => productStock.id, {
			onUpdate: 'cascade',
			onDelete: 'cascade',
		}),
	withdrawOrderId: uuid('withdraw_order_id').references(() => withdrawOrder.id),
	dateWithdraw: date('date_withdraw').defaultNow().notNull(),
	dateReturn: date('date_return'),
});

export const cabinetWarehouse = pgTable('cabinet_warehouse', {
	id: uuid('id').default(sql`gen_random_uuid()`).notNull().primaryKey(),
	name: text('name').default('warehouse 1').notNull(),
	warehouseId: uuid('warehouse_id')
		.notNull()
		.references(() => warehouse.id, {
			onUpdate: 'cascade',
			onDelete: 'restrict',
		}),
});

/**
 * Main warehouse table for comprehensive warehouse management
 * Independent from cabinet_warehouse with complete operational details
 */
export const warehouse = pgTable('warehouse', {
	// Primary identification
	id: uuid('id').default(sql`gen_random_uuid()`).notNull().primaryKey(),
	name: text('name').notNull(),
	code: text('code').notNull().unique(),
	description: text('description'),

	// Business logic
	isActive: boolean('is_active').default(true).notNull(),
	allowsInbound: boolean('allows_inbound').default(true).notNull(),
	allowsOutbound: boolean('allows_outbound').default(true).notNull(),
	requiresApproval: boolean('requires_approval').default(false).notNull(),

	// Operational hours
	operatingHoursStart: text('operating_hours_start').default('08:00'),
	operatingHoursEnd: text('operating_hours_end').default('18:00'),
	timeZone: text('time_zone').default('UTC'),

	// Audit and tracking
	createdAt: timestamp('created_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp('updated_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	createdBy: text('created_by').references((): AnyPgColumn => user.id),
	lastModifiedBy: text('last_modified_by').references((): AnyPgColumn => user.id),

	// Additional metadata
	altegioId: integer('altegio_id').default(0).notNull(),
	notes: text('notes'),
	customFields: text('custom_fields'), // JSON string for additional custom data
});

export const employee = pgTable('employee', {
	id: uuid('id').default(sql`gen_random_uuid()`).notNull().primaryKey(),
	name: text('name').default('Jon Doe').notNull(),
	surname: text('surname').default('').notNull(),
	warehouseId: uuid('warehouse_id')
		.notNull()
		.references(() => warehouse.id, {
			onUpdate: 'cascade',
			onDelete: 'restrict',
		}),
	passcode: integer('passcode').default(1111).notNull(),
	userId: text('user_id').references(() => user.id),
	permissions: uuid('permissions').references(() => permissions.id),
});

export const permissions = pgTable('permissions', {
	id: uuid('id').default(sql`gen_random_uuid()`).notNull().primaryKey(),
	permission: text('permission').notNull(),
});

/**
 * Warehouse transfer table for tracking all stock movements
 * Handles both external (Distribution Center → Almacen) and internal (Almacen → Counter) transfers
 * Contains general information about the transfer order
 */
export const warehouseTransfer = pgTable('warehouse_transfer', {
	// Primary identification
	id: uuid('id').defaultRandom().primaryKey().notNull(),

	// Transfer details
	transferNumber: text('transfer_number').notNull().unique(), // Human-readable transfer reference
	transferType: text('transfer_type').notNull().default('internal'), // 'external' (DC → Almacen) or 'internal' (Almacen → Counter)
	sourceWarehouseId: uuid('source_warehouse_id')
		.notNull()
		.references(() => warehouse.id, {
			onUpdate: 'cascade',
			onDelete: 'restrict',
		}),
	destinationWarehouseId: uuid('destination_warehouse_id')
		.notNull()
		.references(() => warehouse.id, {
			onUpdate: 'cascade',
			onDelete: 'restrict',
		}),

	// Optional destination cabinet for internal transfers
	cabinetId: uuid('cabinet_id').references(() => cabinetWarehouse.id),

	// Status and timing
	transferDate: timestamp('transfer_date').defaultNow().notNull(),
	completedDate: timestamp('completed_date'),
	isCompleted: boolean('is_completed').default(false).notNull(),
	isPending: boolean('is_pending').default(true).notNull(),
	isCancelled: boolean('is_cancelled').default(false).notNull(),

	// User tracking
	initiatedBy: text('initiated_by').notNull(),
	completedBy: text('completed_by').references(() => user.id, {
		onUpdate: 'cascade',
		onDelete: 'restrict',
	}),

	// Transfer metadata
	totalItems: integer('total_items').default(0).notNull(),
	transferReason: text('transfer_reason'), // Reason for the transfer
	notes: text('notes'), // Additional comments
	priority: text('priority').default('normal').notNull(), // normal, high, urgent

	// Audit fields
	createdAt: timestamp('created_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp('updated_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
});

/**
 * Warehouse transfer details table for tracking individual items in transfers
 * Each row represents one product stock item being transferred (external or internal)
 */
export const warehouseTransferDetails = pgTable('warehouse_transfer_details', {
	// Primary identification
	id: uuid('id').defaultRandom().primaryKey().notNull(),

	// Foreign key relationships
	transferId: uuid('transfer_id')
		.notNull()
		.references(() => warehouseTransfer.id, {
			onUpdate: 'cascade',
			onDelete: 'cascade',
		}),
	productStockId: uuid('product_stock_id')
		.notNull()
		.references(() => productStock.id, {
			onUpdate: 'cascade',
			onDelete: 'restrict',
		}),

	// Item transfer details
	quantityTransferred: integer('quantity_transferred').default(1).notNull(),
	itemCondition: text('item_condition').default('good').notNull(), // good, damaged, needs_inspection
	itemNotes: text('item_notes'), // Notes specific to this item

	// Status tracking for individual items
	isReceived: boolean('is_received').default(false).notNull(),
	receivedDate: timestamp('received_date'),
	receivedBy: text('received_by').references(() => user.id, {
		onUpdate: 'cascade',
		onDelete: 'restrict',
	}),

	// Audit fields
	createdAt: timestamp('created_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp('updated_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
});

/**
 * Kits table for tracking equipment kits assigned to employees
 * Each kit contains multiple product stock items that are assigned together
 */
export const kits = pgTable('kits', {
	// Primary identification
	id: uuid('id').defaultRandom().primaryKey().notNull(),

	// Kit details
	numProducts: integer('num_products').default(0).notNull(),
	assignedDate: date('assigned_date').defaultNow().notNull(),
	assignedEmployee: uuid('assigned_employee')
		.notNull()
		.references(() => employee.id, {
			onUpdate: 'cascade',
			onDelete: 'restrict',
		}),
	observations: text('observations'),

	// Audit fields
	createdAt: timestamp('created_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp('updated_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
});

/**
 * Kit details table for tracking individual items within each kit
 * Each record represents one product stock item that is part of a kit
 */
export const kitsDetails = pgTable('kits_details', {
	// Primary identification
	id: uuid('id').defaultRandom().primaryKey().notNull(),

	// Foreign key relationships
	kitId: uuid('kit_id')
		.notNull()
		.references(() => kits.id, {
			onUpdate: 'cascade',
			onDelete: 'cascade',
		}),
	productId: uuid('product_id')
		.notNull()
		.references(() => productStock.id, {
			onUpdate: 'cascade',
			onDelete: 'restrict',
		}),

	// Item details
	observations: text('observations'),
	isReturned: boolean('is_returned').default(false).notNull(),
	returnedDate: date('returned_date'),

	// Audit fields
	createdAt: timestamp('created_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp('updated_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
});

/**
 * Product stock usage history table for tracking all product movements and usage
 * This table maintains a complete audit trail of how products are used throughout the system
 * Each record represents a single usage/movement event of a product stock item
 */
export const productStockUsageHistory = pgTable('product_stock_usage_history', {
	// Primary identification
	id: uuid('id').defaultRandom().primaryKey().notNull(),

	// Product and employee references (required)
	productStockId: uuid('product_stock_id')
		.notNull()
		.references(() => productStock.id, {
			onUpdate: 'cascade',
			onDelete: 'restrict',
		}),
	employeeId: uuid('employee_id')
		.notNull()
		.references(() => employee.id, {
			onUpdate: 'cascade',
			onDelete: 'restrict',
		}),

	// Warehouse where the movement/usage occurred (required)
	warehouseId: uuid('warehouse_id')
		.notNull()
		.references(() => warehouse.id, {
			onUpdate: 'cascade',
			onDelete: 'restrict',
		}),

	// Optional references - only one should be set depending on the type of usage
	// If used in a warehouse transfer
	warehouseTransferId: uuid('warehouse_transfer_id').references(() => warehouseTransfer.id, {
		onUpdate: 'cascade',
		onDelete: 'set null',
	}),
	// If used in a kit
	kitId: uuid('kit_id').references(() => kits.id, {
		onUpdate: 'cascade',
		onDelete: 'set null',
	}),

	// Movement/usage type and details
	movementType: text('movement_type').notNull(), // 'transfer', 'kit_assignment', 'kit_return', 'withdraw', 'return', 'other'
	action: text('action').notNull(), // 'checkout', 'checkin', 'transfer', 'assign', 'return'
	notes: text('notes'), // Additional notes about the usage/movement

	// Timestamp of when this usage occurred
	usageDate: timestamp('usage_date')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),

	// Previous and new warehouse (for tracking location changes)
	previousWarehouseId: uuid('previous_warehouse_id').references(() => warehouse.id, {
		onUpdate: 'cascade',
		onDelete: 'set null',
	}),
	newWarehouseId: uuid('new_warehouse_id').references(() => warehouse.id, {
		onUpdate: 'cascade',
		onDelete: 'set null',
	}),

	// Audit fields
	createdAt: timestamp('created_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
});

// Relations
export const withdrawOrderRelations = relations(withdrawOrder, ({ many }) => ({
	details: many(withdrawOrderDetails),
}));

export const withdrawOrderDetailsRelations = relations(withdrawOrderDetails, ({ one }) => ({
	withdrawOrder: one(withdrawOrder, {
		fields: [withdrawOrderDetails.withdrawOrderId],
		references: [withdrawOrder.id],
	}),
	productStock: one(productStock, {
		fields: [withdrawOrderDetails.productId],
		references: [productStock.id],
	}),
}));

export const warehouseRelations = relations(warehouse, ({ one, many }) => ({
	// User who created the warehouse
	creator: one(user, {
		fields: [warehouse.createdBy],
		references: [user.id],
		relationName: 'warehouseCreator',
	}),
	// User who last modified the warehouse
	lastModifier: one(user, {
		fields: [warehouse.lastModifiedBy],
		references: [user.id],
		relationName: 'warehouseModifier',
	}),
	// Users assigned to this warehouse
	assignedUsers: many(user),
	// Product stock currently in this warehouse
	productStock: many(productStock),
	// Transfers originating from this warehouse
	outgoingTransfers: many(warehouseTransfer, {
		relationName: 'sourceWarehouse',
	}),
	// Transfers coming to this warehouse
	incomingTransfers: many(warehouseTransfer, {
		relationName: 'destinationWarehouse',
	}),
	// Product usage history at this warehouse
	usageHistory: many(productStockUsageHistory, {
		relationName: 'usageWarehouse',
	}),
	// Usage history where this was the previous warehouse
	usageHistoryAsPrevious: many(productStockUsageHistory, {
		relationName: 'previousWarehouse',
	}),
	// Usage history where this is the new warehouse
	usageHistoryAsNew: many(productStockUsageHistory, {
		relationName: 'newWarehouse',
	}),
}));

// Warehouse transfer relations
export const warehouseTransferRelations = relations(warehouseTransfer, ({ one, many }) => ({
	// Source warehouse relation
	sourceWarehouse: one(warehouse, {
		fields: [warehouseTransfer.sourceWarehouseId],
		references: [warehouse.id],
		relationName: 'sourceWarehouse',
	}),
	// Destination warehouse relation
	destinationWarehouse: one(warehouse, {
		fields: [warehouseTransfer.destinationWarehouseId],
		references: [warehouse.id],
		relationName: 'destinationWarehouse',
	}),
	// Employee who initiated the transfer
	initiator: one(employee, {
		fields: [warehouseTransfer.initiatedBy],
		references: [employee.id],
		relationName: 'transferInitiator',
	}),
	// Employee who completed the transfer
	completer: one(employee, {
		fields: [warehouseTransfer.completedBy],
		references: [employee.id],
		relationName: 'transferCompleter',
	}),
	// Optional cabinet for internal transfers
	cabinet: one(cabinetWarehouse, {
		fields: [warehouseTransfer.cabinetId],
		references: [cabinetWarehouse.id],
	}),
	// Transfer details (one-to-many)
	details: many(warehouseTransferDetails),
	// Usage history related to this transfer
	usageHistory: many(productStockUsageHistory),
}));

export const warehouseTransferDetailsRelations = relations(warehouseTransferDetails, ({ one }) => ({
	// Parent transfer relation
	transfer: one(warehouseTransfer, {
		fields: [warehouseTransferDetails.transferId],
		references: [warehouseTransfer.id],
	}),
	// Product stock item being transferred
	productStock: one(productStock, {
		fields: [warehouseTransferDetails.productStockId],
		references: [productStock.id],
	}),
	// Employee who received the item
	receiver: one(employee, {
		fields: [warehouseTransferDetails.receivedBy],
		references: [employee.id],
		relationName: 'itemReceiver',
	}),
}));

// ProductStock relations including both withdraw orders and warehouse transfers
export const productStockRelations = relations(productStock, ({ one, many }) => ({
	// Current warehouse where the product is located
	currentWarehouse: one(warehouse, {
		fields: [productStock.currentWarehouse],
		references: [warehouse.id],
	}),
	// Employee who last used the product
	lastUsedByEmployee: one(employee, {
		fields: [productStock.lastUsedBy],
		references: [employee.id],
	}),
	// Withdraw order details
	withdrawOrderDetails: many(withdrawOrderDetails),
	// Warehouse transfer details
	warehouseTransferDetails: many(warehouseTransferDetails),
	// Kit details (items that are part of kits)
	kitDetails: many(kitsDetails),
	// Usage history for this product
	usageHistory: many(productStockUsageHistory),
}));

// Employee relations including transfer activities (external and internal)
export const employeeRelations = relations(employee, ({ many, one }) => ({
	// User account relation
	user: one(user, {
		fields: [employee.userId],
		references: [user.id],
	}),
	// Permissions relation
	permissions: one(permissions, {
		fields: [employee.permissions],
		references: [permissions.id],
	}),
	// Product stock last used by this employee
	lastUsedProducts: many(productStock),
	// Transfers initiated by this employee
	initiatedTransfers: many(warehouseTransfer, {
		relationName: 'transferInitiator',
	}),
	// Transfers completed by this employee
	completedTransfers: many(warehouseTransfer, {
		relationName: 'transferCompleter',
	}),
	// Items received by this employee
	receivedItems: many(warehouseTransferDetails, {
		relationName: 'itemReceiver',
	}),
	// Kits assigned to this employee
	assignedKits: many(kits),
	// Product usage history performed by this employee
	productUsageHistory: many(productStockUsageHistory),
}));

// User relations for warehouse assignment and account management
export const userRelations = relations(user, ({ one, many }) => ({
	// Assigned warehouse relation
	warehouse: one(warehouse, {
		fields: [user.warehouseId],
		references: [warehouse.id],
	}),
	// Sessions associated with this user
	sessions: many(session),
	// Accounts associated with this user
	accounts: many(account),
	// API keys associated with this user
	apiKeys: many(apikey),
	// Employee profile (if user is an employee)
	employee: one(employee, {
		fields: [user.id],
		references: [employee.userId],
	}),
	// Warehouses created by this user
	createdWarehouses: many(warehouse, {
		relationName: 'warehouseCreator',
	}),
	// Warehouses last modified by this user
	lastModifiedWarehouses: many(warehouse, {
		relationName: 'warehouseModifier',
	}),
}));

// Kits relations
export const kitsRelations = relations(kits, ({ one, many }) => ({
	// Employee assigned to this kit
	assignedEmployee: one(employee, {
		fields: [kits.assignedEmployee],
		references: [employee.id],
	}),
	// Kit details (one-to-many)
	details: many(kitsDetails),
	// Usage history related to this kit
	usageHistory: many(productStockUsageHistory),
}));

export const kitsDetailsRelations = relations(kitsDetails, ({ one }) => ({
	// Parent kit relation
	kit: one(kits, {
		fields: [kitsDetails.kitId],
		references: [kits.id],
	}),
	// Product stock item in this kit
	productStock: one(productStock, {
		fields: [kitsDetails.productId],
		references: [productStock.id],
	}),
}));

// Product stock usage history relations
export const productStockUsageHistoryRelations = relations(productStockUsageHistory, ({ one }) => ({
	// Product stock that was used/moved
	productStock: one(productStock, {
		fields: [productStockUsageHistory.productStockId],
		references: [productStock.id],
	}),
	// Employee who performed the usage/movement
	employee: one(employee, {
		fields: [productStockUsageHistory.employeeId],
		references: [employee.id],
	}),
	// Warehouse where the movement occurred
	warehouse: one(warehouse, {
		fields: [productStockUsageHistory.warehouseId],
		references: [warehouse.id],
		relationName: 'usageWarehouse',
	}),
	// Previous warehouse (for location tracking)
	previousWarehouse: one(warehouse, {
		fields: [productStockUsageHistory.previousWarehouseId],
		references: [warehouse.id],
		relationName: 'previousWarehouse',
	}),
	// New warehouse (for location tracking)
	newWarehouse: one(warehouse, {
		fields: [productStockUsageHistory.newWarehouseId],
		references: [warehouse.id],
		relationName: 'newWarehouse',
	}),
	// Optional warehouse transfer relation
	warehouseTransfer: one(warehouseTransfer, {
		fields: [productStockUsageHistory.warehouseTransferId],
		references: [warehouseTransfer.id],
	}),
	// Optional kit relation
	kit: one(kits, {
		fields: [productStockUsageHistory.kitId],
		references: [kits.id],
	}),
}));
