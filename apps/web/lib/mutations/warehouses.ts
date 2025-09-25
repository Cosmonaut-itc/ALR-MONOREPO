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
			});
			// biome-ignore lint/suspicious/noConsole: logging
			console.error(error);
		},
	});
