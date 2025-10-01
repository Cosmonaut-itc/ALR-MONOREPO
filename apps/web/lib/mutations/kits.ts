import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getQueryClient } from "@/app/get-query-client";
import { client } from "@/lib/client";
import { queryKeys } from "@/lib/query-keys";
import { createQueryKey } from "../helpers";

// Update kit observations mutation
type UpdateKitPostOptions = Parameters<
	(typeof client.api.auth.kits)["update"]["$post"]
>[0];
export type UpdateKitPayload = UpdateKitPostOptions extends { json: infer J }
	? J
	: never;

export const useUpdateKit = () =>
	useMutation<unknown, Error, UpdateKitPayload>({
		mutationKey: ["update-kit"],
		mutationFn: async (data: UpdateKitPayload) => {
			const response = await client.api.auth.kits.update.$post({ json: data });
			const result: unknown = await response.json();
			if (
				result &&
				typeof result === "object" &&
				"success" in (result as Record<string, unknown>) &&
				(result as { success?: unknown }).success === false
			) {
				const message =
					((result as { message?: unknown }).message as string | undefined) ||
					"La API devolvió éxito=false al actualizar el kit";
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
			toast.error("Error al actualizar kit", { id: "update-kit" });
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
		},
	});

// Update kit item status (returned)
type UpdateKitItemStatusPostOptions = Parameters<
	(typeof client.api.auth.kits)["items"]["update-status"]["$post"]
>[0];
export type UpdateKitItemStatusPayload =
	UpdateKitItemStatusPostOptions extends {
		json: infer J;
	}
		? J
		: never;

export const useUpdateKitItemStatus = () =>
	useMutation<unknown, Error, UpdateKitItemStatusPayload>({
		mutationKey: ["update-kit-item-status"],
		mutationFn: async (data: UpdateKitItemStatusPayload) => {
			const response = await client.api.auth.kits.items["update-status"].$post({
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
			});
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
		},
	});

// Create kit mutation
type CreateKitPostOptions = Parameters<
	(typeof client.api.auth.kits)["create"]["$post"]
>[0];
export type CreateKitPayload = CreateKitPostOptions extends { json: infer J }
	? J
	: never;

export const useCreateKit = () =>
	useMutation<unknown, Error, CreateKitPayload>({
		mutationKey: ["create-kit"],
		mutationFn: async (data: CreateKitPayload) => {
			const response = await client.api.auth.kits.create.$post({ json: data });
			const result: unknown = await response.json();
			if (
				result &&
				typeof result === "object" &&
				"success" in (result as Record<string, unknown>) &&
				(result as { success?: unknown }).success === false
			) {
				const message =
					((result as { message?: unknown }).message as string | undefined) ||
					"La API devolvió éxito=false al crear el kit";
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
			toast.error("Error al crear kit", { id: "create-kit" });
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
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
		onError: (error) => {
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error("Error updating product stock usage:", error);
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
			toast.error("Error al crear empleado", { id: "create-employee" });
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
		},
	});
