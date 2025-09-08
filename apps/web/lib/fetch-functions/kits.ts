'use client';
import { client } from '@/lib/client';

export const getAllKits = async () => {
	try {
		const response = await client.api.auth.kits.all.$get();
		return response.json();
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Needed for debugging
		console.error(error);
		return null;
	}
};

export const getKitsByEmployee = async (employeeId: string) => {
	try {
		const response = await client.api.auth.kits['by-employee'].$get({
			query: { employeeId },
		});
		return response.json();
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Needed for debugging
		console.error(error);
		return null;
	}
};
