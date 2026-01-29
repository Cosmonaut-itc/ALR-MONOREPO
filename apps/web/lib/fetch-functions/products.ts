'use client';

import { client } from '@/lib/client';

export const getAllProducts = async () => {
	try {
		const response = await client.api.auth.products.all.$get();
		return response.json();
	} catch {
		return null;
	}
};


