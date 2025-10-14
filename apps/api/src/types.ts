import { z } from 'zod';

// ArticulosAllTypes - API Response Schema
const actualAmountSchema = z.object({
	storage_id: z.number(), // API returns numbers for storage_id
	amount: z.number(), // API returns numbers for amount (can be negative)
});

export const dataItemSchema = z.object({
	title: z.string(),
	value: z.string(), // API returns strings for value, not numbers
	label: z.string(),
	article: z.string(), // New field - article description
	category: z.string(), // New field - category name
	category_id: z.number(), // New field - category ID
	salon_id: z.number(), // New field - salon/location ID
	good_id: z.number(), // API returns numbers for good_id
	cost: z.coerce.number(),
	unit_id: z.number(), // API returns numbers for unit_id
	unit_short_title: z.string(),
	service_unit_id: z.number(), // API returns numbers for service_unit_id
	service_unit_short_title: z.string(),
	actual_cost: z.coerce.number(),
	unit_actual_cost: z.coerce.number(),
	unit_actual_cost_format: z.string(),
	unit_equals: z.coerce.number(),
	barcode: z.string(), // API returns strings for barcode (can be empty)
	is_chain: z.boolean(), // New field - chain indicator
	comment: z.string(), // New field - comment (can be empty)
	loyalty_abonement_type_id: z.number(),
	loyalty_certificate_type_id: z.number(),
	loyalty_allow_empty_code: z.number(),
	loyalty_serial_number_limited: z.number(), // New field - serial number limitation
	critical_amount: z.number(),
	desired_amount: z.number(),
	actual_amounts: z.array(actualAmountSchema),
	last_change_date: z.string().refine(
		(val) => {
			// More flexible date validation - accept various date formats
			try {
				const date = new Date(val);
				return !Number.isNaN(date.getTime());
			} catch {
				return false;
			}
		},
		{ message: 'Invalid date format' },
	),
	is_goods_mark_enabled: z.boolean(), // New field - goods mark enablement
	loyalty_expiration_type_id: z.number().nullable(), // New field - nullable expiration type
});

export const apiResponseSchema = z.object({
	success: z.boolean(),
	data: z.array(dataItemSchema),
	meta: z.array(z.unknown()),
});

export const articulosAllParamsSchema = z.object({
	company_id: z.string(),
});

export type DataItemArticulosType = z.infer<typeof dataItemSchema>;

// --- Generate the Mock Data using the correct library ---

export type SucursalBosqueStorage = {
	id: 1308654;
	consumables: 2624863;
	sales: 2624864;
};
export type SucursalValleRealStorage = {
	id: 729299;
	consumables: 1460023;
	sales: 1460024;
};
export type SucursalProvidenciaStorage = {
	id: 706097;
	consumables: 1412069;
	sales: 1412070;
};
export type ProductArrivalDocumentTypeId = 3;
export const DistributionCenterId = '4818f28e-daf8-42f4-8d55-088d260b118d';
