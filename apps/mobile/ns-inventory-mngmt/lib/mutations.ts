import { useMutation, useQueryClient } from "@tanstack/react-query";
import client from "./hono-client";
import type { ApiResponse } from "@/types/types";
import { QUERY_KEYS } from "./query-keys";

/**
 * Payload type for creating a withdraw order
 * Matches the API schema exactly
 */
export interface CreateWithdrawOrderPayload {
	/** ISO date string for withdrawal date */
	dateWithdraw: string;
	/** Employee UUID */
	employeeId: string;
	/** Number of items to withdraw */
	numItems: number;
	/** Array of product stock UUIDs to withdraw */
	products: string[];
	/** Whether the order is complete */
	isComplete?: boolean;
}

/**
 * Creates a withdraw order via the API
 * @param payload - The withdraw order data to submit
 * @returns Promise resolving to the API response
 * @throws Error if the API request fails
 */
export const createWithdrawOrder = async (
	payload: CreateWithdrawOrderPayload,
): Promise<ApiResponse<unknown>> => {
	try {
		const response = await client.api.auth["withdraw-orders"].create.$post({
			json: payload,
		});

		if (!response.ok) {
			throw new Error(
				`API request failed with status: ${response.status}`,
			);
		}

		const data =
			(await response.json()) as Awaited<
				ReturnType<typeof response.json>
			>;

		return data as ApiResponse<unknown>;
	} catch (error) {
		console.error("Error creating withdraw order:", error);
		throw new Error(
			error instanceof Error
				? `Failed to create withdraw order: ${error.message}`
				: "Failed to create withdraw order: Unknown error",
		);
	}
};

/**
 * Custom hook for creating withdraw orders using TanStack Query
 * Provides mutation state, error handling, and automatic cache invalidation
 * @returns Mutation object with mutate, mutateAsync, and state properties
 */
export const useCreateWithdrawOrderMutation = () => {
	const queryClient = useQueryClient();

	return useMutation<
		ApiResponse<unknown>,
		Error,
		CreateWithdrawOrderPayload
	>({
		mutationFn: createWithdrawOrder,
		onSuccess: () => {
			// Invalidate product stock queries to refetch updated data
			queryClient.invalidateQueries({
				queryKey: [QUERY_KEYS.PRODUCT_STOCK],
			});
		},
	});
};

