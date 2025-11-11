import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getQueryClient } from "@/app/get-query-client";
import { client } from "@/lib/client";
import { createQueryKey } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";

type CreateReplenishmentOrderPostOptions = Parameters<
	(typeof client.api.auth)["replenishment-orders"]["$post"]
>[0];

/**
 * Type inference for the JSON payload expected by the API
 */
type InferredPayload =
	CreateReplenishmentOrderPostOptions extends { json: infer J }
		? J
		: never;

/**
 * Explicit type definition for replenishment order detail items.
 * Only includes fields that should be sent when creating a new order.
 * Note: sent_quantity and buy_order_generated should NOT be included
 * as they don't exist in the database schema.
 */
export type ReplenishmentOrderDetailItem = {
	barcode: number;
	quantity: number;
};

/**
 * Explicit type definition for creating a replenishment order.
 * This ensures type safety and prevents sending invalid fields.
 */
export type CreateReplenishmentOrderPayload = {
	sourceWarehouseId: string;
	cedisWarehouseId: string;
	items: ReplenishmentOrderDetailItem[];
	notes?: string;
};

/**
 * Runtime validation function to ensure payload only contains valid fields.
 * This prevents accidentally sending fields that don't exist in the database.
 *
 * @param payload - The payload to validate
 * @returns The validated payload with only allowed fields
 */
function validateCreatePayload(
	payload: CreateReplenishmentOrderPayload,
): CreateReplenishmentOrderPayload {
	// Ensure items only contain barcode and quantity
	const validatedItems: ReplenishmentOrderDetailItem[] = payload.items.map(
		(item) => ({
			barcode: Number(item.barcode),
			quantity: Number(item.quantity),
		}),
	);

	return {
		sourceWarehouseId: String(payload.sourceWarehouseId),
		cedisWarehouseId: String(payload.cedisWarehouseId),
		items: validatedItems,
		...(payload.notes && { notes: String(payload.notes) }),
	};
}

type UpdateReplenishmentOrderPutOptions = Parameters<
	(typeof client.api.auth)["replenishment-orders"][":id"]["$put"]
>[0];

export type UpdateReplenishmentOrderPayload =
	UpdateReplenishmentOrderPutOptions;

type LinkTransferPatchOptions = Parameters<
	(typeof client.api.auth)["replenishment-orders"][":id"]["link-transfer"]["$patch"]
>[0];

export type LinkTransferToReplenishmentOrderPayload =
	LinkTransferPatchOptions;

const invalidateReplenishmentQueries = (orderId?: string | null) => {
	const queryClient = getQueryClient();
	queryClient.invalidateQueries({ queryKey: queryKeys.replenishmentOrders });
	if (orderId) {
		queryClient.invalidateQueries({
			queryKey: createQueryKey(queryKeys.replenishmentOrderDetail, [orderId]),
		});
	}
};

/**
 * Hook for creating a new replenishment order.
 * Includes runtime validation to ensure only valid fields are sent.
 *
 * @returns Mutation hook for creating replenishment orders
 */
export const useCreateReplenishmentOrder = () =>
	useMutation({
		mutationKey: ["create-replenishment-order"],
		mutationFn: async (data: CreateReplenishmentOrderPayload) => {
			// Validate and sanitize the payload to ensure only valid fields are sent
			const validatedData = validateCreatePayload(data);

			// Type assertion to satisfy the API client type, but we've validated the structure
			const response = await client.api.auth["replenishment-orders"].$post({
				json: validatedData as InferredPayload,
			});
			const result = await response.json();
			if (!result?.success) {
				throw new Error(
					result?.message ||
						"La API devolvió éxito=false al crear el pedido de reabastecimiento",
				);
			}
			return result;
		},
		onMutate: () => {
			toast.loading("Creando pedido...", {
				id: "create-replenishment-order",
			});
		},
		onSuccess: (data) => {
			toast.success("Pedido creado correctamente", {
				id: "create-replenishment-order",
			});
			const orderId =
				data && typeof data === "object" && "data" in data
					? (data as { data?: { id?: string | null } }).data?.id
					: undefined;
			invalidateReplenishmentQueries(orderId);
		},
		onError: (error) => {
			toast.error("Error al crear pedido", {
				id: "create-replenishment-order",
			});
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
		},
	});

export const useUpdateReplenishmentOrder = () =>
	useMutation({
		mutationKey: ["update-replenishment-order"],
		mutationFn: async (options: UpdateReplenishmentOrderPayload) => {
			const response = await client.api.auth["replenishment-orders"][":id"].$put(
				options,
			);
			const result = await response.json();
			if (!result?.success) {
				throw new Error(
					result?.message ||
						"La API devolvió éxito=false al actualizar el pedido de reabastecimiento",
				);
			}
			return result;
		},
		onMutate: () => {
			toast.loading("Actualizando pedido...", {
				id: "update-replenishment-order",
			});
		},
		onSuccess: (_, variables) => {
			toast.success("Pedido actualizado", {
				id: "update-replenishment-order",
			});
			const orderId = variables?.param?.id;
			invalidateReplenishmentQueries(orderId);
		},
		onError: (error) => {
			toast.error("Error al actualizar pedido", {
				id: "update-replenishment-order",
			});
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
		},
	});

export const useLinkTransferToReplenishmentOrder = () =>
	useMutation({
		mutationKey: ["link-transfer-to-replenishment-order"],
		mutationFn: async (options: LinkTransferToReplenishmentOrderPayload) => {
			const response =
				await client.api.auth["replenishment-orders"][":id"]["link-transfer"].$patch(
					options,
				);
			const result = await response.json();
			if (!result?.success) {
				throw new Error(
					result?.message ||
						"La API devolvió éxito=false al vincular el traspaso con el pedido",
				);
			}
			return result;
		},
		onMutate: () => {
			toast.loading("Vinculando traspaso con pedido...", {
				id: "link-transfer-to-replenishment-order",
			});
		},
		onSuccess: (_, variables) => {
			toast.success("Traspaso vinculado correctamente", {
				id: "link-transfer-to-replenishment-order",
			});
			const orderId = variables?.param?.id;
			invalidateReplenishmentQueries(orderId);
		},
		onError: (error) => {
			toast.error("Error al vincular traspaso", {
				id: "link-transfer-to-replenishment-order",
			});
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
		},
	});
