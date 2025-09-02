import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getQueryClient } from '@/app/get-query-client';
import { client } from '../client';
import { createQueryKey } from '../helpers';
import { queryKeys } from '../query-keys';

export const useDeleteInventoryItem = () =>
	useMutation({
		mutationKey: ['delete-inventory-item'],
		mutationFn: async (data: { id: string }) => {
			const { id } = data;
			if (!id) {
				throw new Error('ID is required');
			}
			const response = await client.api.auth['product-stock'].delete.$delete({
				query: { id },
			});
			const result = await response.json();
			if (!result?.success) {
				throw new Error(
					result?.message || 'La API devolvió éxito=false al eliminar el inventario',
				);
			}
			return result;
		},
		onMutate: () => {
			toast.loading('Eliminando inventario...', {
				id: 'delete-inventory-item',
			});
		},
		onSuccess: (data) => {
			toast.success('Inventario eliminado correctamente', {
				id: 'delete-inventory-item',
			});
			// Invalidate and refetch inventory data
			const queryClient = getQueryClient();
			if (data.success && data.data) {
				queryClient.invalidateQueries({
					queryKey: createQueryKey(queryKeys.inventory, [data.data.currentWarehouse]),
				});
			}
		},
		onError: (error) => {
			toast.error('Error al eliminar inventario', {
				id: 'delete-inventory-item',
			});
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
		},
	});
