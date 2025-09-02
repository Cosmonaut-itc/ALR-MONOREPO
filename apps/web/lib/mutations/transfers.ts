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
