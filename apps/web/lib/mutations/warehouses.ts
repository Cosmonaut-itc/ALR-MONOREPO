import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getQueryClient } from '@/app/get-query-client';
import { client } from '../client';
import { queryKeys } from '../query-keys';

type CreateWarehousePostOptions = Parameters<
	(typeof client.api.auth)['warehouse']['create']['$post']
>[0];

export type CreateWarehousePayload = CreateWarehousePostOptions extends {
	json: infer J;
}
	? J
	: never;

/**
 * Payload for updating warehouse Altegio configuration
 * All fields except warehouseId are optional
 */
export type UpdateWarehouseAltegioConfigPayload = {
	warehouseId: string;
	altegioId?: number;
	consumablesId?: number;
	salesId?: number;
	isCedis?: boolean;
};

/**
 * Custom React Query mutation hook for updating warehouse Altegio configuration.
 *
 * This hook allows updating a warehouse's Altegio integration settings including
 * altegioId, consumablesId, salesId, and isCedis flag.
 *
 * @returns {ReturnType<typeof useMutation>} The mutation object for updating warehouse Altegio config.
 *
 * @example
 * const { mutateAsync, isPending } = useUpdateWarehouseAltegioConfigMutation();
 * await mutateAsync({
 *   warehouseId: '123e4567-e89b-12d3-a456-426614174000',
 *   altegioId: 12345,
 *   consumablesId: 67890,
 *   salesId: 11111,
 *   isCedis: true
 * });
 */
export const useUpdateWarehouseAltegioConfigMutation = () =>
	useMutation({
		mutationKey: ['update-warehouse-altegio-config'],
		mutationFn: async (
			data: UpdateWarehouseAltegioConfigPayload,
		): Promise<unknown> => {
			const { warehouseId, ...json } = data;
			const response = await fetch(
				`/api/auth/warehouse/${warehouseId}/update-altegio-config`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(json),
				},
			);

			if (!response.ok) {
				const errorText = await response
					.text()
					.catch(() => 'Error desconocido');
				throw new Error(
					`Error al actualizar configuración de Altegio: ${errorText}`,
				);
			}

			return response.json();
		},
		onMutate: () => {
			toast.loading('Actualizando configuración de Altegio...', {
				id: 'update-warehouse-altegio-config',
			});
		},
		onSuccess: () => {
			toast.success('Configuración de Altegio actualizada correctamente', {
				id: 'update-warehouse-altegio-config',
			});
			const queryClient = getQueryClient();
			queryClient.invalidateQueries({ queryKey: queryKeys.warehouses });
		},
		onError: (error) => {
			const errorMessage =
				error instanceof Error
					? error.message
					: 'Error al actualizar configuración de Altegio';
			toast.error(errorMessage, {
				id: 'update-warehouse-altegio-config',
			});			console.error(error);
		},
	});

export const useCreateWarehouseMutation = () =>
	useMutation({
		mutationKey: ['create-warehouse'],
		mutationFn: async (data: CreateWarehousePayload) => {
			const response = await client.api.auth.warehouse.create.$post({
				json: data,
			});
			const result = await response.json();
			if (!result?.success) {
				throw new Error(
					result?.message ||
						'La API devolvió éxito=false al crear la bodega',
				);
			}
			return result;
		},
		onMutate: () => {
			toast.loading('Creando bodega...', {
				id: 'create-warehouse',
			});
		},
		onSuccess: () => {
			toast.success('Bodega creada correctamente', {
				id: 'create-warehouse',
			});
			const queryClient = getQueryClient();
			queryClient.invalidateQueries({ queryKey: queryKeys.warehouses });
		},
		onError: (error) => {
			toast.error('Error al crear bodega', {
				id: 'create-warehouse',
			});			console.error(error);
		},
	});
