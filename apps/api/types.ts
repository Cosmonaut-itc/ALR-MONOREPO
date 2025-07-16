import { z } from 'zod';

// ArticulosAllTypes - API Response Schema
const actualAmountSchema = z.object({
	storage_id: z.string(),
	amount: z.string(),
});

const dataItemSchema = z.object({
	title: z.string(),
	value: z.string(),
	label: z.string(),
	good_id: z.string(),
	cost: z.string(),
	unit_id: z.string(),
	unit_short_title: z.string(),
	service_unit_id: z.string(),
	service_unit_short_title: z.string(),
	actual_cost: z.string(),
	unit_actual_cost: z.string(),
	unit_actual_cost_format: z.string(),
	unit_equals: z.string(),
	barcode: z.string(),
	loyalty_abonement_type_id: z.number(),
	loyalty_certificate_type_id: z.number(),
	loyalty_allow_empty_code: z.number(),
	critical_amount: z.number(),
	desired_amount: z.number(),
	actual_amounts: z.array(actualAmountSchema),
	last_change_date: z.string().datetime(),
});

export const apiResponseSchema = z.object({
	success: z.boolean(),
	data: z.array(dataItemSchema),
	meta: z.array(z.unknown()),
});

export const articulosAllParamsSchema = z.object({
	company_id: z.string(),
});
