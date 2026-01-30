import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getQueryClient } from "@/app/get-query-client";
import type { StockLimitResponse } from "@/types";
import { createQueryKey } from "../helpers";
import { queryKeys } from "../query-keys";

type CreateStockLimitPayload = {
	warehouseId: string;
	barcode: number;
	limitType: "quantity" | "usage";
	minQuantity?: number;
	maxQuantity?: number;
	minUsage?: number | null;
	maxUsage?: number | null;
	notes?: string;
};

type UpdateStockLimitPayload = {
	warehouseId: string;
	barcode: number;
	limitType?: "quantity" | "usage";
	minQuantity?: number;
	maxQuantity?: number;
	minUsage?: number | null;
	maxUsage?: number | null;
	notes?: string;
};

type StockLimitApiError = Error & { status?: number };

const parseStockLimitResponse = async (response: Response) => {
	let result: StockLimitResponse | null = null;
	try {
		result = (await response.json()) as StockLimitResponse;
	} catch {
		// Ignore JSON parse errors; we'll handle below
	}

	if (!response.ok || !result?.success) {
		const message =
			result?.message ||
			(response.status === 400
				? "Parámetros inválidos para el límite"
				: response.status === 404
					? "No se encontró el límite solicitado"
					: response.status === 409
						? "Ya existe un límite para este producto en el almacén"
						: "Error al guardar el límite de stock");
		const error = new Error(message) as StockLimitApiError;
		error.status = response.status;
		throw error;
	}

	return result;
};

const invalidateStockLimitQueries = (warehouseId: string) => {
	const queryClient = getQueryClient();
	queryClient.invalidateQueries({
		queryKey: createQueryKey(queryKeys.stockLimits, ["all"]),
	});
	if (warehouseId) {
		queryClient.invalidateQueries({
			queryKey: createQueryKey(queryKeys.stockLimits, [warehouseId]),
		});
	}
};

export const useCreateStockLimit = () =>
	useMutation<StockLimitResponse, StockLimitApiError, CreateStockLimitPayload>({
		mutationKey: ["create-stock-limit"],
		mutationFn: async (payload) => {
			const response = await fetch("/api/auth/stock-limits", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			return parseStockLimitResponse(response);
		},
		onMutate: () => {
			toast.loading("Guardando límite...", { id: "create-stock-limit" });
		},
		onSuccess: (_data, variables) => {
			toast.success("Límite creado correctamente", {
				id: "create-stock-limit",
			});
			invalidateStockLimitQueries(variables.warehouseId);
		},
		onError: (error) => {
			toast.error(error.message || "Error al crear límite", {
				id: "create-stock-limit",
			});
		},
	});

export const useUpdateStockLimit = () =>
	useMutation<StockLimitResponse, StockLimitApiError, UpdateStockLimitPayload>({
		mutationKey: ["update-stock-limit"],
		mutationFn: async (payload) => {
			const { warehouseId, barcode, ...json } = payload;
			const response = await fetch(
				`/api/auth/stock-limits/${warehouseId}/${barcode}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(json),
				},
			);
			return parseStockLimitResponse(response);
		},
		onMutate: () => {
			toast.loading("Actualizando límite...", {
				id: "update-stock-limit",
			});
		},
		onSuccess: (_data, variables) => {
			toast.success("Límite actualizado correctamente", {
				id: "update-stock-limit",
			});
			invalidateStockLimitQueries(variables.warehouseId);
		},
		onError: (error) => {
			toast.error(error.message || "Error al actualizar límite", {
				id: "update-stock-limit",
			});
		},
	});
