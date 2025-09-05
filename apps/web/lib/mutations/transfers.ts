import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getQueryClient } from '@/app/get-query-client';
import type { TransferOrderType } from '@/types';
import { client } from '../client';
import { createQueryKey } from '../helpers';
import { queryKeys } from '../query-keys';

export const useCreateTransferOrder = () =>
	useMutation({
		mutationKey: ['create-transfer-order'],
		mutationFn: async (data: TransferOrderType) => {
			const response = await client.api.auth['warehouse-transfers'].create.$post({
				json: data,
			});
			const result = await response.json();
			if (!result?.success) {
				throw new Error(
					result?.message || 'La API devolvió éxito=false al crear el traspaso',
				);
			}
			return result;
		},
		onMutate: () => {
			toast.loading('Creando traspaso...', {
				id: 'create-transfer-order',
			});
		},
		onSuccess: (data) => {
			toast.success('Traspaso creado correctamente', {
				id: 'create-transfer-order',
			});
			// Invalidate and refetch inventory data
			const queryClient = getQueryClient();
			if (data.success && data.data) {
				queryClient.invalidateQueries({
					queryKey: createQueryKey(queryKeys.inventory, [
						data.data.transfer.sourceWarehouseId,
					]),
				});
			}
		},
		onError: (error) => {
			toast.error('Error al crear traspaso', {
				id: 'create-transfer-order',
			});
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
		},
	});

// =============================
// Update transfer overall status
// =============================

type UpdateTransferStatusPostOptions = Parameters<
	(typeof client.api.auth)['warehouse-transfers']['update-status']['$post']
>[0];
export type UpdateTransferStatusPayload = UpdateTransferStatusPostOptions extends {
	json: infer J;
}
	? J
	: never;

export const useUpdateTransferStatus = () =>
	useMutation<unknown, Error, UpdateTransferStatusPayload>({
		mutationKey: ['update-transfer-status'],
		mutationFn: async (data: UpdateTransferStatusPayload) => {
			const response = await client.api.auth['warehouse-transfers']['update-status'].$post({
				json: data,
			});
			const result: unknown = await response.json();
			// If API follows { success, message } pattern, attempt soft-check
			if (
				result &&
				typeof result === 'object' &&
				'success' in (result as Record<string, unknown>) &&
				(result as { success?: unknown }).success === false
			) {
				const message =
					((result as { message?: unknown }).message as string | undefined) ||
					'La API devolvió éxito=false al actualizar el estado del traspaso';
				throw new Error(message);
			}
			return result;
		},
		onMutate: () => {
			toast.loading('Actualizando estado del traspaso...', {
				id: 'update-transfer-status',
			});
		},
		onSuccess: () => {
			toast.success('Estado del traspaso actualizado', {
				id: 'update-transfer-status',
			});
			const queryClient = getQueryClient();
			// Invalidate receptions list and any reception detail queries
			queryClient.invalidateQueries({ queryKey: queryKeys.receptions });
			queryClient.invalidateQueries({ queryKey: queryKeys.recepcionDetail });
		},
		onError: (error) => {
			toast.error('Error al actualizar estado del traspaso', {
				id: 'update-transfer-status',
			});
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
		},
	});

// =====================================
// Update individual transfer item status
// =====================================

type UpdateTransferItemStatusPostOptions = Parameters<
	(typeof client.api.auth)['warehouse-transfers']['update-item-status']['$post']
>[0];
export type UpdateTransferItemStatusPayload = UpdateTransferItemStatusPostOptions extends {
	json: infer J;
}
	? J
	: never;

export const useUpdateTransferItemStatus = () =>
	useMutation<unknown, Error, UpdateTransferItemStatusPayload>({
		mutationKey: ['update-transfer-item-status'],
		mutationFn: async (data: UpdateTransferItemStatusPayload) => {
			const response = await client.api.auth['warehouse-transfers'][
				'update-item-status'
			].$post({
				json: data,
			});
			const result: unknown = await response.json();
			if (
				result &&
				typeof result === 'object' &&
				'success' in (result as Record<string, unknown>) &&
				(result as { success?: unknown }).success === false
			) {
				const message =
					((result as { message?: unknown }).message as string | undefined) ||
					'La API devolvió éxito=false al actualizar el estado del item';
				throw new Error(message);
			}
			return result;
		},
		onMutate: () => {
			toast.loading('Actualizando estado de ítem...', {
				id: 'update-transfer-item-status',
			});
		},
		onSuccess: () => {
			toast.success('Estado de ítem actualizado', {
				id: 'update-transfer-item-status',
			});
			const queryClient = getQueryClient();
			queryClient.invalidateQueries({ queryKey: queryKeys.recepcionDetail });
		},
		onError: (error) => {
			toast.error('Error al actualizar estado del ítem', {
				id: 'update-transfer-item-status',
			});
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
		},
	});
