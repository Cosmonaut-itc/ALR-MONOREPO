/** biome-ignore-all lint/suspicious/noConsole: Needed for debugging */

'use client';
import { client } from '../client';

export const getInventory = async () => {
	try {
		const response = await client.api.auth['product-stock']['with-employee'].$get();
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};
