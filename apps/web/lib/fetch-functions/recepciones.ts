import { client } from "../client";

export const getWarehouseTransferById = async (warehouseId: string) => {
	try {
		const response = await client.api.auth["warehouse-transfers"].external.$get(
			{
				query: { warehouseId },
			},
		);
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};

export const getWarehouseTransferAll = async () => {
	try {
		const response = await client.api.auth["warehouse-transfers"].all.$get();
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};

export const getWarehouseTransferAllByWarehouseId = async (
	warehouseId: string,
) => {
	try {
		///api/auth/warehouse-transfers/by-warehouse
		const response = await client.api.auth["warehouse-transfers"][
			"by-warehouse"
		].$get({
			query: { warehouseId },
		});
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};

export const getTransferDetailsById = async (transferId: string) => {
	try {
		const response = await client.api.auth["warehouse-transfers"].details.$get({
			query: { transferId },
		});
		return response.json();
	} catch (error) {
		console.error(error);
		return null;
	}
};
