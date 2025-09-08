import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getQueryClient } from '@/app/get-query-client';
import { client } from '@/lib/client';
import { queryKeys } from '@/lib/query-keys';

// Update kit observations mutation
type UpdateKitPostOptions = Parameters<(typeof client.api.auth.kits)['update']['$post']>[0];
export type UpdateKitPayload = UpdateKitPostOptions extends { json: infer J } ? J : never;

export const useUpdateKit = () =>
	useMutation<unknown, Error, UpdateKitPayload>({
		mutationKey: ['update-kit'],
		mutationFn: async (data: UpdateKitPayload) => {
			const response = await client.api.auth.kits.update.$post({ json: data });
			const result: unknown = await response.json();
			if (
				result &&
				typeof result === 'object' &&
				'success' in (result as Record<string, unknown>) &&
				(result as { success?: unknown }).success === false
			) {
				const message =
					((result as { message?: unknown }).message as string | undefined) ||
					'La API devolvió éxito=false al actualizar el kit';
				throw new Error(message);
			}
			return result;
		},
		onMutate: () => {
			toast.loading('Actualizando kit...', { id: 'update-kit' });
		},
		onSuccess: () => {
			toast.success('Kit actualizado', { id: 'update-kit' });
			const qc = getQueryClient();
			qc.invalidateQueries({ queryKey: queryKeys.kits });
		},
		onError: (error) => {
			toast.error('Error al actualizar kit', { id: 'update-kit' });
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
		},
	});

// Update kit item status (returned)
type UpdateKitItemStatusPostOptions = Parameters<
	(typeof client.api.auth.kits)['items']['update-status']['$post']
>[0];
export type UpdateKitItemStatusPayload = UpdateKitItemStatusPostOptions extends {
	json: infer J;
}
	? J
	: never;

export const useUpdateKitItemStatus = () =>
	useMutation<unknown, Error, UpdateKitItemStatusPayload>({
		mutationKey: ['update-kit-item-status'],
		mutationFn: async (data: UpdateKitItemStatusPayload) => {
			const response = await client.api.auth.kits.items['update-status'].$post({
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
					'La API devolvió éxito=false al actualizar estado del artículo';
				throw new Error(message);
			}
			return result;
		},
		onMutate: () => {
			toast.loading('Actualizando estado de artículo...', { id: 'update-kit-item-status' });
		},
		onSuccess: () => {
			toast.success('Estado actualizado', { id: 'update-kit-item-status' });
			const qc = getQueryClient();
			qc.invalidateQueries({ queryKey: queryKeys.kits });
		},
		onError: (error) => {
			toast.error('Error al actualizar estado del artículo', {
				id: 'update-kit-item-status',
			});
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
		},
	});
