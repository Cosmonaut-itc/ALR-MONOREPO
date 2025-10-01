import "server-only";
import {
	buildCookieHeader,
	resolveTrustedOrigin,
} from "./server-functions-utils";

/**
 * Fetches all kits from the server
 *
 * @returns Promise resolving to all kits data
 * @throws {Error} If the fetch fails or returns a non-ok response
 */
export const fetchAllKitsServer = async () => {
	const origin = resolveTrustedOrigin();
	const url = new URL("/api/auth/kits/all", origin).toString();
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url, {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Kits fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};

/**
 * Fetches detailed information for a specific kit
 *
 * @param {string} kitId - The unique identifier of the kit
 * @returns Promise resolving to kit details data
 * @throws {Error} If kitId is not provided or if the fetch fails
 */
export const fetchKitDetailsServer = async (kitId: string) => {
	if (!kitId) {
		throw new Error("kitId is required");
	}

	const origin = resolveTrustedOrigin();
	const headers = await buildCookieHeader(origin);
	const url = new URL("/api/auth/kits/details", origin);
	url.searchParams.set("kitId", kitId);

	const res = await fetch(url.toString(), {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Kit details fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};

/**
 * Fetches all employee records from the database without any filtering
 *
 * Each employee record includes their associated permissions through a left join.
 * If the database table is empty, returns an empty array with a success response.
 *
 * @returns Promise resolving to all employee data with their permissions
 * @throws {Error} If an unexpected error occurs during data retrieval
 */
export const fetchAllEmployeesServer = async () => {
	const origin = resolveTrustedOrigin();
	const url = new URL("/api/auth/employee/all", origin).toString();
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url, {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`All employees fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};

/**
 * Fetches employee records filtered by user ID
 *
 * This endpoint retrieves employee data associated with a specific user.
 * If no employees are found for the given user ID, returns an empty array.
 *
 * @param {string} userId - The unique identifier of the user
 * @returns Promise resolving to employee data filtered by user ID
 * @throws {Error} If userId is not provided or if the fetch fails
 */
export const fetchEmployeesByUserIdServer = async (userId: string) => {
	if (!userId) {
		throw new Error("userId is required");
	}

	const origin = resolveTrustedOrigin();
	const headers = await buildCookieHeader(origin);
	const url = new URL("/api/auth/employee/by-user-id", origin);
	url.searchParams.set("userId", userId);

	const res = await fetch(url.toString(), {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Employees by user ID fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};

/**
 * Fetches employee records filtered by warehouse ID
 *
 * This endpoint retrieves all employee records associated with a specific warehouse.
 * Each employee includes their permissions data through a left join.
 * If no employees are found for the given warehouse ID, returns an empty array.
 *
 * @param {string} warehouseId - UUID of the warehouse to filter employees by
 * @returns Promise resolving to filtered employee data with their permissions
 * @throws {Error} If warehouseId is not provided or if the fetch fails
 */
export const fetchEmployeesByWarehouseIdServer = async (
	warehouseId: string,
) => {
	if (!warehouseId) {
		throw new Error("warehouseId is required");
	}

	const origin = resolveTrustedOrigin();
	const headers = await buildCookieHeader(origin);
	const url = new URL("/api/auth/employee/by-warehouse-id", origin);
	url.searchParams.set("warehouseId", warehouseId);

	const res = await fetch(url.toString(), {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Employees by warehouse ID fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};

/**
 * Fetches all available permissions from the database
 *
 * This endpoint retrieves all permission records that can be assigned to employees.
 * Used for populating permission selection dropdowns in employee management forms.
 *
 * @returns Promise resolving to all permissions data
 * @throws {Error} If the fetch fails or returns a non-ok response
 */
export const fetchAllPermissionsServer = async () => {
	const origin = resolveTrustedOrigin();
	const url = new URL("/api/auth/permissions/all", origin).toString();
	const headers = await buildCookieHeader(origin);

	const res = await fetch(url, {
		headers,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Permissions fetch failed: ${res.status} ${res.statusText} ${text}`,
		);
	}

	return res.json();
};
