/**
 * Zod schemas for client-side validation
 * These mirror the validation schemas used in your Hono server
 */

import { z } from 'zod';

/**
 * Request validation schemas
 */
export const createWithdrawOrderSchema = z.object({
	dateWithdraw: z.string().describe('ISO date string for withdrawal date'),
	userId: z.string().describe('User ID from the user table'),
	numItems: z.number().int().positive().describe('Number of items to withdraw'),
	isComplete: z.boolean().optional().describe('Whether the order is complete'),
});

export const updateWithdrawOrderSchema = z.object({
	withdrawOrderId: z.string(),
	dateReturn: z.string(),
	isComplete: z.boolean(),
});

export const createWithdrawOrderDetailsSchema = z.object({
	productId: z.string(),
	withdrawOrderId: z.string(),
	dateWithdraw: z.string(),
	userId: z.string(),
});

export const updateWithdrawOrderDetailsSchema = z.object({
	id: z.string(),
	dateReturn: z.string(),
});

/**
 * Query parameter schemas
 */
export const employeeQuerySchema = z.object({
	userId: z.string(),
});

export const withdrawOrderDetailsQuerySchema = z.object({
	dateWithdraw: z.string(),
});

/**
 * Response validation schemas
 */
export const apiResponseSchema = z.object({
	success: z.boolean(),
	data: z.unknown().optional(),
	message: z.string().optional(),
	meta: z.array(z.unknown()).optional(),
});

/**
 * Type inference helpers
 */
export type CreateWithdrawOrderInput = z.infer<typeof createWithdrawOrderSchema>;
export type UpdateWithdrawOrderInput = z.infer<typeof updateWithdrawOrderSchema>;
export type CreateWithdrawOrderDetailsInput = z.infer<typeof createWithdrawOrderDetailsSchema>;
export type UpdateWithdrawOrderDetailsInput = z.infer<typeof updateWithdrawOrderDetailsSchema>;
export type EmployeeQueryInput = z.infer<typeof employeeQuerySchema>;
export type WithdrawOrderDetailsQueryInput = z.infer<typeof withdrawOrderDetailsQuerySchema>;
