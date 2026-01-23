import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getQueryClient } from "@/app/get-query-client";
import { client } from "@/lib/client";
import { queryKeys } from "@/lib/query-keys";
import type { KitDetails } from "@/types";
import { createQueryKey } from "../helpers";

/**
 * Standard API response structure
 */
type ApiResponse<T> = {
	success: boolean;
	data?: T;
	message?: string;
};

/**
 * Type for the update kit mutation POST options
 */
type UpdateKitPostOptions = Parameters<
	(typeof client.api.auth.kits)["update"]["$post"]
>[0];

/**
 * Payload for updating kit observations and status
 */
export type UpdateKitPayload = UpdateKitPostOptions extends { json: infer J }
	? J
	: never;

/**
 * Hook for updating kit information (observations, status, etc.)
 * Returns the updated kit details on success
 */
export const useUpdateKit = () =>
	useMutation<ApiResponse<KitDetails>, Error, UpdateKitPayload>({
		mutationKey: ["update-kit"],
		mutationFn: async (
			data: UpdateKitPayload,
		): Promise<ApiResponse<KitDetails>> => {
			const response = await client.api.auth.kits.update.$post({ json: data });
			const result = (await response.json()) as ApiResponse<KitDetails>;
			if (
				result &&
				typeof result === "object" &&
				"success" in result &&
				result.success === false
			) {
				const message =
					result.message || "La API devolvió éxito=false al actualizar el kit";
				throw new Error(message);
			}
			return result;
		},
		onMutate: () => {
			toast.loading("Actualizando kit...", { id: "update-kit" });
		},
		onSuccess: () => {
			toast.success("Kit actualizado", { id: "update-kit" });
			const qc = getQueryClient();
			qc.invalidateQueries({ queryKey: queryKeys.kits });
		},
		onError: (error) => {
			toast.error("Error al actualizar kit", { id: "update-kit" });			console.error(error);
		},
	});

/**
 * Type for the update kit item status mutation POST options
 */
type UpdateKitItemStatusPostOptions = Parameters<
	(typeof client.api.auth.kits)["items"]["update-status"]["$post"]
>[0];

/**
 * Payload for updating kit item status (returned/not returned)
 */
export type UpdateKitItemStatusPayload =
	UpdateKitItemStatusPostOptions extends {
		json: infer J;
	}
		? J
		: never;

/**
 * Hook for updating individual kit item return status
 * Returns the updated kit item on success
 */
export const useUpdateKitItemStatus = () =>
	useMutation<
		ApiResponse<{ kitItemId: string; isReturned: boolean }>,
		Error,
		UpdateKitItemStatusPayload
	>({
		mutationKey: ["update-kit-item-status"],
		mutationFn: async (
			data: UpdateKitItemStatusPayload,
		): Promise<ApiResponse<{ kitItemId: string; isReturned: boolean }>> => {
			const response = await client.api.auth.kits.items["update-status"].$post({
				json: data,
			});
			const result = (await response.json()) as ApiResponse<{
				kitItemId: string;
				isReturned: boolean;
			}>;
			if (
				result &&
				typeof result === "object" &&
				"success" in result &&
				result.success === false
			) {
				const message =
					result.message ||
					"La API devolvió éxito=false al actualizar estado del artículo";
				throw new Error(message);
			}
			return result;
		},
		onMutate: () => {
			toast.loading("Actualizando estado de artículo...", {
				id: "update-kit-item-status",
			});
		},
		onSuccess: () => {
			toast.success("Estado actualizado", { id: "update-kit-item-status" });
			const qc = getQueryClient();
			qc.invalidateQueries({ queryKey: queryKeys.kits });
		},
		onError: (error) => {
			toast.error("Error al actualizar estado del artículo", {
				id: "update-kit-item-status",
			});			console.error(error);
		},
	});

/**
 * Type for the create kit mutation POST options
 */
type CreateKitPostOptions = Parameters<
	(typeof client.api.auth.kits)["create"]["$post"]
>[0];

/**
 * Payload for creating a new kit
 */
export type CreateKitPayload = CreateKitPostOptions extends { json: infer J }
	? J
	: never;

/**
 * Hook for creating a new kit
 * Returns the newly created kit details on success
 */
export const useCreateKit = () =>
	useMutation<ApiResponse<KitDetails>, Error, CreateKitPayload>({
		mutationKey: ["create-kit"],
		mutationFn: async (
			data: CreateKitPayload,
		): Promise<ApiResponse<KitDetails>> => {
			const response = await client.api.auth.kits.create.$post({ json: data });
			const result = (await response.json()) as ApiResponse<KitDetails>;
			if (
				result &&
				typeof result === "object" &&
				"success" in result &&
				result.success === false
			) {
				const message =
					result.message || "La API devolvió éxito=false al crear el kit";
				throw new Error(message);
			}
			return result;
		},
		onMutate: () => {
			toast.loading("Creando kit...", { id: "create-kit" });
		},
		onSuccess: () => {
			toast.success("Kit creado", { id: "create-kit" });
			const qc = getQueryClient();
			qc.invalidateQueries({ queryKey: queryKeys.kits });
		},
		onError: (error) => {
			toast.error("Error al crear kit", { id: "create-kit" });			console.error(error);
		},
	});

// Update product stock usage mutation
/**
 * Payload for updating product stock usage information
 * Tracks when products are being used, by whom, and usage counts
 */
export type UpdateProductStockUsagePayload = {
	/** UUID of the product stock to update */
	productStockId: string;
	/** Whether the product is currently being used */
	isBeingUsed?: boolean;
	/** UUID of the employee who last used the product */
	lastUsedBy?: string;
	/** ISO date string for when the product was last used */
	lastUsed?: string;
	/** ISO date string for when the product was first used */
	firstUsed?: string;
	/** Whether to increment the numberOfUses counter */
	incrementUses?: boolean;
};

/**
 * Hook for updating product stock usage information
 * This mutation updates usage tracking fields like isBeingUsed, lastUsedBy, and usage counts
 */
export const useUpdateProductStockUsage = () =>
	useMutation<unknown, Error, UpdateProductStockUsagePayload>({
		mutationKey: ["update-product-stock-usage"],
		mutationFn: async (data: UpdateProductStockUsagePayload) => {
			const response = await client.api.auth["product-stock"][
				"update-usage"
			].$post({ json: data });
			if (!response.ok) {
				throw new Error(
					`Failed to update product stock usage: ${response.statusText}`,
				);
			}

			const result: unknown = await response.json();
			if (
				result &&
				typeof result === "object" &&
				"success" in (result as Record<string, unknown>) &&
				(result as { success?: unknown }).success === false
			) {
				const message =
					((result as { message?: unknown }).message as string | undefined) ||
					"La API devolvió éxito=false al actualizar el uso del producto";
				throw new Error(message);
			}
			return result;
		},
		onSuccess: (data: unknown) => {
			toast.success("Uso del producto actualizado", {
				id: "update-product-stock-usage",
			});
			const queryClient = getQueryClient();
			queryClient.invalidateQueries({
				queryKey: createQueryKey(queryKeys.inventory, [
					(data as { data: { currentWarehouse: string } }).data
						.currentWarehouse,
				]),
			});
			queryClient.invalidateQueries({
				queryKey: createQueryKey(queryKeys.inventory, ["all"]),
			});
		},
		onError: (error) => {			console.error("Error updating product stock usage:", error);
		},
	});

// Create employee mutation
type CreateEmployeePostOptions = Parameters<
	(typeof client.api.auth.employee)["create"]["$post"]
>[0];
export type CreateEmployeePayload = CreateEmployeePostOptions extends {
	json: infer J;
}
	? J
	: never;

export const useCreateEmployee = () =>
	useMutation<unknown, Error, CreateEmployeePayload>({
		mutationKey: ["create-employee"],
		mutationFn: async (data: CreateEmployeePayload) => {
			const response = await client.api.auth.employee.create.$post({
				json: data,
			});
			const result: unknown = await response.json();
			if (
				result &&
				typeof result === "object" &&
				"success" in (result as Record<string, unknown>) &&
				(result as { success?: unknown }).success === false
			) {
				const message =
					((result as { message?: unknown }).message as string | undefined) ||
					"La API devolvió éxito=false al crear el empleado";
				throw new Error(message);
			}
			return result;
		},
		onMutate: () => {
			toast.loading("Creando empleado...", { id: "create-employee" });
		},
		onSuccess: () => {
			toast.success("Empleado creado exitosamente", { id: "create-employee" });
			const qc = getQueryClient();
			qc.invalidateQueries({ queryKey: ["employees"] });
		},
		onError: (error) => {
			toast.error("Error al crear empleado", { id: "create-employee" });			console.error(error);
		},
	});
