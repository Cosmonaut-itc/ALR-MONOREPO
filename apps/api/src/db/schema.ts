import { relations, sql } from 'drizzle-orm';
import { boolean, date, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified')
		.$defaultFn(() => false)
		.notNull(),
	image: text('image'),
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
	lastUsed: date('last_used'),
	lastUsedBy: uuid('last_used_by').references(() => employee.id),
	numberOfUses: integer('number_of_uses').default(0).notNull(),
	currentWarehouse: integer('current_warehouse').default(0).notNull(),
	isBeingUsed: boolean('is_being_used').default(false).notNull(),
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
	parentWarehouse: integer('parent_warehouse').default(12).notNull(),
});

export const employee = pgTable('employee', {
	id: uuid('id').default(sql`gen_random_uuid()`).notNull().primaryKey(),
	name: text('name').default('Jon Doe').notNull(),
	surname: text('surname').default('').notNull(),
	warehouse: integer('warehouse').default(1).notNull(),
	passcode: integer('passcode').default(1111).notNull(),
	userId: text('user_id').references(() => user.id),
	permissions: uuid('permissions').references(() => permissions.id),
});

export const permissions = pgTable('permissions', {
	id: uuid('id').default(sql`gen_random_uuid()`).notNull().primaryKey(),
	permission: text('permission').notNull(),
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

export const productStockRelations = relations(productStock, ({ many }) => ({
	withdrawOrderDetails: many(withdrawOrderDetails),
}));
