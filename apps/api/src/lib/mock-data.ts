import { faker } from '@faker-js/faker';
import { fake, setFaker } from 'zod-schema-faker';
import { apiResponseSchema, type DataItemArticulosType, dataItemSchema } from '@/types';

setFaker(faker);

/**
 * Generates mock API response data with an array of articulos items and metadata.
 * Creates a structured response containing success status, data array with 5 mock items, and meta information.
 * @returns {ReturnType<typeof fake>} The generated mock API response containing data array and meta information.
 */
const generateMockApiResponse = () => {
	// Generate an array of 5 mock items using a for loop
	const mainResponse = fake(apiResponseSchema);
	const items: DataItemArticulosType[] = [];
	for (let i = 0; i < 5; i++) {
		const item = fake(dataItemSchema);
		items.push(item);
	}
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
