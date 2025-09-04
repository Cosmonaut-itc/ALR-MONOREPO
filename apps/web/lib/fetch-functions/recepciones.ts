import { client } from '../client';

export const getWarehouseTransferById = async (warehouseId: string) => {
	try {
		const response = await client.api.auth['warehouse-transfers'].external.$get({
			query: { warehouseId },
		});
		return response.json();
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Needed for debugging
		console.error(error);
		return null;
	}
};
