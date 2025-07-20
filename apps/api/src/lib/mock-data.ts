import { faker } from '@faker-js/faker';
import { fake, setFaker } from 'zod-schema-faker';
import { apiResponseSchema, type DataItemArticulosType } from '@/types';

setFaker(faker);

/**
 * Generates mock API response data with an array of articulos items and metadata.
 * Creates a structured response containing success status, data array with 5 mock items, and meta information.
 * @returns {ReturnType<typeof fake>} The generated mock API response containing data array and meta information.
 */
const generateMockApiResponse = () => {
	// Generate an array of 5 mock items using a for loop
	const mainResponse = fake(apiResponseSchema);
	const items: DataItemArticulosType[] = [
		{
			title: 'Red Gelish Nail Polish',
			value: 1,
			label: 'Red Gelish Nail Polish - Professional Grade',
			good_id: 'PROD_001_RED',
			cost: 10,
			unit_id: 'UNIT_001',
			unit_short_title: 'pcs',
			service_unit_id: 'SRV_001',
			service_unit_short_title: 'hrs',
			actual_cost: 89.99,
			unit_actual_cost: 89.99,
			unit_actual_cost_format: '$89.99',
			unit_equals: 1,
			barcode: 12_345,
			loyalty_abonement_type_id: 0,
			loyalty_certificate_type_id: 0,
			loyalty_allow_empty_code: 0,
			critical_amount: 5,
			desired_amount: 20,
			actual_amounts: [
				{ storage_id: 'WAREHOUSE_001', amount: '8' },
				{ storage_id: 'WAREHOUSE_002', amount: '12' },
				{ storage_id: 'WAREHOUSE_003', amount: '3' },
			],
			last_change_date: '2024-12-19T10:30:00.000Z',
		},
		{
			title: 'Blue Gelish Nail Polish',
			value: 2,
			label: 'Blue Gelish Nail Polish - Professional Grade',
			good_id: 'PROD_002_BLUE',
			cost: 45.5,
			unit_id: 'UNIT_001',
			unit_short_title: 'pcs',
			service_unit_id: 'SRV_002',
			service_unit_short_title: 'days',
			actual_cost: 45.5,
			unit_actual_cost: 45.5,
			unit_actual_cost_format: '$45.50',
			unit_equals: 1,
			barcode: 67_890,
			loyalty_abonement_type_id: 1,
			loyalty_certificate_type_id: 1,
			loyalty_allow_empty_code: 1,
			critical_amount: 10,
			desired_amount: 50,
			actual_amounts: [
				{ storage_id: 'WAREHOUSE_002', amount: '25' },
				{ storage_id: 'WAREHOUSE_003', amount: '18' },
			],
			last_change_date: '2024-12-18T14:15:00.000Z',
		},
		{
			title: 'Green Gelish Nail Polish',
			value: 3,
			label: 'Green Gelish Nail Polish - Professional Grade',
			good_id: 'PROD_003_GREEN',
			cost: 12.99,
			unit_id: 'UNIT_002',
			unit_short_title: 'pair',
			service_unit_id: 'SRV_003',
			service_unit_short_title: 'wks',
			actual_cost: 12.99,
			unit_actual_cost: 12.99,
			unit_actual_cost_format: '$12.99',
			unit_equals: 1,
			barcode: 11_111,
			loyalty_abonement_type_id: 0,
			loyalty_certificate_type_id: 0,
			loyalty_allow_empty_code: 0,
			critical_amount: 15,
			desired_amount: 100,
			actual_amounts: [
				{ storage_id: 'WAREHOUSE_001', amount: '45' },
				{ storage_id: 'WAREHOUSE_004', amount: '32' },
			],
			last_change_date: '2024-12-17T09:45:00.000Z',
		},
		{
			title: 'Yellow Gelish Nail Polish',
			value: 4,
			label: 'Yellow Gelish Nail Polish - Professional Grade',
			good_id: 'PROD_004_YELLOW',
			cost: 156.75,
			unit_id: 'UNIT_001',
			unit_short_title: 'pcs',
			service_unit_id: 'SRV_001',
			service_unit_short_title: 'hrs',
			actual_cost: 156.75,
			unit_actual_cost: 156.75,
			unit_actual_cost_format: '$156.75',
			unit_equals: 1,
			barcode: 99_999,
			loyalty_abonement_type_id: 2,
			loyalty_certificate_type_id: 2,
			loyalty_allow_empty_code: 0,
			critical_amount: 3,
			desired_amount: 15,
			actual_amounts: [
				{ storage_id: 'WAREHOUSE_003', amount: '7' },
				{ storage_id: 'WAREHOUSE_004', amount: '4' },
			],
			last_change_date: '2024-12-16T16:20:00.000Z',
		},
	];

	// Generate meta data using the apiResponseSchema's meta field
	const response = {
		success: mainResponse.success,
		data: items,
		meta: mainResponse.meta,
	};
	// Return the mock data and meta as expected by the API
	return response;
};

/**
 * Asynchronously generates mock data for Articulos using a timeout to simulate latency.
 * @returns {Promise<ReturnType<typeof fake>>} A promise that resolves to the mocked API response.
 */
export const mockDataArticulos = (): Promise<ReturnType<typeof fake>> => {
	// Return a promise that resolves after a short timeout (e.g., 300ms)
	return new Promise((resolve) => {
		setTimeout(() => {
			// Generate the mock data using the extracted function
			resolve(generateMockApiResponse());
		}, 300); // Simulate 300ms latency
	});
};
