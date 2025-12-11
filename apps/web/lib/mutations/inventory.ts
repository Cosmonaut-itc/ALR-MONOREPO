import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getQueryClient } from "@/app/get-query-client";
import { client } from "../client";
import { createQueryKey } from "../helpers";
import { queryKeys } from "../query-keys";

type CreateProductStockPostOptions = Parameters<
	(typeof client.api.auth)["product-stock"]["create"]["$post"]
>[0];

type CreateAltegioProductPostOptions = Parameters<
	(typeof client.api.auth)["create-product-in-altegio"]["$post"]
>[0];

export type CreateProductStockPayload = CreateProductStockPostOptions extends {
	json: infer J;
}
	? J
	: never;

/**
 * Altegio payload type extracted from CreateProductStockPayload.
 * Represents the optional altegio field structure for product stock creation.
 */
export type AltegioPayload = NonNullable<CreateProductStockPayload["altegio"]>;

export type CreateProductInAltegioPayload =
	CreateAltegioProductPostOptions extends {
		json: infer J;
	}
		? J
		: never;

export const useCreateAltegioProduct = () =>
	useMutation({
		mutationKey: ["create-product-in-altegio"],
		mutationFn: async (data: CreateProductInAltegioPayload) => {
			const response = await client.api.auth["create-product-in-altegio"].$post(
				{
					json: data,
				},
			);
			const result = await response.json();
			if (!result?.success) {
				throw new Error(
					result?.message ||
						"La API devolvi� �xito=false al crear el producto en Altegio",
				);
			}
			return result;
		},
		onMutate: () => {
			toast.loading("Creando producto en Altegio...", {
				id: "create-product-in-altegio",
			});
		},
		onSuccess: () => {
			toast.success("Producto creado en Altegio", {
				id: "create-product-in-altegio",
			});
			const queryClient = getQueryClient();
			queryClient.invalidateQueries({
				queryKey: queryKeys.productCatalog,
			});
		},
		onError: (error) => {
			toast.error("Error al crear producto en Altegio", {
				id: "create-product-in-altegio",
			});
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
		},
	});

export const useCreateInventoryItem = () =>
	useMutation({
		mutationKey: ["create-inventory-item"],
		mutationFn: async (data: CreateProductStockPayload) => {
			console.log(data);
			const response = await client.api.auth["product-stock"].create.$post({
				json: data,
			});
			const result = await response.json();
			if (!result?.success) {
				throw new Error(
					result?.message ||
						"La API devolvió éxito=false al crear el inventario",
				);
			}
			return result;
		},
		onMutate: () => {
			toast.loading("Creando inventario...", {
				id: "create-inventory-item",
			});
		},
		onSuccess: (_data, variables) => {
			toast.success("Inventario creado correctamente", {
				id: "create-inventory-item",
			});
			const queryClient = getQueryClient();

			queryClient.invalidateQueries({
				queryKey: createQueryKey(queryKeys.inventory, [
					variables.currentWarehouse,
				]),
			});
			queryClient.invalidateQueries({
				queryKey: createQueryKey(queryKeys.inventory, ["all"]),
			});
		},
		onError: (error) => {
			toast.error("Error al crear inventario", {
				id: "create-inventory-item",
			});
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
		},
	});

export const useDeleteInventoryItem = () =>
	useMutation({
		mutationKey: ["delete-inventory-item"],
		mutationFn: async (data: { id: string }) => {
			const { id } = data;
			if (!id) {
				throw new Error("ID is required");
			}
			const response = await client.api.auth["product-stock"].delete.$delete({
				query: { id },
			});
			const result = await response.json();
			if (!result?.success) {
				throw new Error(
					result?.message ||
						"La API devolvió éxito=false al eliminar el inventario",
				);
			}
			return result;
		},
		onMutate: () => {
			toast.loading("Eliminando inventario...", {
				id: "delete-inventory-item",
			});
		},
		onSuccess: (data) => {
			toast.success("Inventario eliminado correctamente", {
				id: "delete-inventory-item",
			});
			// Invalidate and refetch inventory data
			const queryClient = getQueryClient();
			if (data.success && data.data) {
				queryClient.invalidateQueries({
					queryKey: createQueryKey(queryKeys.inventory, [
						data.data.currentWarehouse,
					]),
				});
			}
		},
		onError: (error) => {
			toast.error("Error al eliminar inventario", {
				id: "delete-inventory-item",
			});
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
		},
	});

export const useSyncInventory = () =>
	useMutation({
		mutationKey: ["sync-inventory"],
		mutationFn: async () => {
			const response = await client.api.auth.inventory.sync.$post({
				json: {
					dryRun: false, // Set to true to only simulate the sync
				},
			});
			const result = await response.json();
			if (!result?.success) {
				throw new Error(
					result?.message ||
						"La API devolvió éxito=false al sincronizar el inventario",
				);
			}
			return result;
		},
		onMutate: () => {
			toast.loading("Sincronizando inventario...", {
				id: "sync-inventory",
			});
		},
		onSuccess: () => {
			toast.success("Inventario sincronizado correctamente", {
				id: "sync-inventory",
			});
			const queryClient = getQueryClient();
			queryClient.invalidateQueries({
				queryKey: createQueryKey(queryKeys.inventory, ["all"]),
			});
		},
		onError: (error) => {
			toast.error("Error al sincronizar inventario", {
				id: "sync-inventory",
			});
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
		},
	});

export const useToggleInventoryKit = () =>
	useMutation({
		mutationKey: ["toggle-inventory-kit"],
		mutationFn: async (data: {
			productStockId: string;
			invalidateContexts?: Array<string | null | undefined>;
		}) => {
			if (!data?.productStockId) {
				throw new Error("El identificador del stock es obligatorio");
			}
			const response = await client.api.auth["product-stock"][
				"update-is-kit"
			].$post({
				json: { productStockId: data.productStockId },
			});
			const result = await response.json();
			if (!result?.success) {
				throw new Error(
					result?.message ||
						"La API devolvió éxito=false al actualizar el estado de kit",
				);
			}
			return result;
		},
		onMutate: () => {
			toast.loading("Actualizando estado de kit...", {
				id: "toggle-inventory-kit",
			});
		},
		onSuccess: (_data, variables) => {
			toast.success("Estado de kit actualizado", {
				id: "toggle-inventory-kit",
			});
			const queryClient = getQueryClient();
			const contexts = new Set<string>(["all"]);
			if (Array.isArray(variables.invalidateContexts)) {
				for (const context of variables.invalidateContexts) {
					const trimmed = typeof context === "string" ? context.trim() : "";
					if (trimmed) {
						contexts.add(trimmed);
					}
				}
			}
			for (const context of contexts) {
				queryClient.invalidateQueries({
					queryKey: createQueryKey(queryKeys.inventory, [context]),
				});
			}
		},
		onError: (error) => {
			toast.error("Error al actualizar el estado de kit", {
				id: "toggle-inventory-kit",
			});
			// biome-ignore lint/suspicious/noConsole: Needed para depuración
			console.error(error);
		},
	});

export const useUpdateInventoryIsEmpty = () =>
	useMutation({
		mutationKey: ["update-inventory-is-empty"],
		mutationFn: async (data: {
			productIds: string[];
			invalidateContexts?: Array<string | null | undefined>;
		}) => {
			if (
				!data?.productIds ||
				!Array.isArray(data.productIds) ||
				data.productIds.length === 0
			) {
				throw new Error("Los identificadores de producto son obligatorios");
			}
			const response = await client.api.auth["product-stock"][
				"update-is-empty"
			].$post({
				json: { productIds: data.productIds },
			});
			const result = await response.json();
			if (!result?.success) {
				throw new Error(
					result?.message ||
						"La API devolvió éxito=false al actualizar el estado vacío",
				);
			}
			return result;
		},
		onMutate: () => {
			toast.loading("Actualizando estado vacío...", {
				id: "update-inventory-is-empty",
			});
		},
		onSuccess: (_data, variables) => {
			toast.success("Estado vacío actualizado", {
				id: "update-inventory-is-empty",
			});
			const queryClient = getQueryClient();
			const contexts = new Set<string>(["all"]);
			if (Array.isArray(variables.invalidateContexts)) {
				for (const context of variables.invalidateContexts) {
					const trimmed = typeof context === "string" ? context.trim() : "";
					if (trimmed) {
						contexts.add(trimmed);
					}
				}
			}
			for (const context of contexts) {
				queryClient.invalidateQueries({
					queryKey: createQueryKey(queryKeys.inventory, [context]),
				});
			}
		},
		onError: (error) => {
			toast.error("Error al actualizar el estado vacío", {
				id: "update-inventory-is-empty",
			});
			// biome-ignore lint/suspicious/noConsole: Needed para depuración
			console.error(error);
		},
	});
