import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getQueryClient } from "@/app/get-query-client";
import { client } from "../client";
import { createQueryKey } from "../helpers";
import { queryKeys } from "../query-keys";

type CreateProductStockPostOptions = Parameters<
	(typeof client.api.auth)["product-stock"]["create"]["$post"]
>[0];

export type CreateProductStockPayload = CreateProductStockPostOptions extends {
	json: infer J;
}
	? J
	: never;

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
		},
		onError: (error) => {
			toast.error("Error al sincronizar inventario", {
				id: "sync-inventory",
			});
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
		},
	});
