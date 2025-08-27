import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { TransferOrderType } from '@/types';
import { client } from '../client';

export const useCreateTransferOrder = () =>
	useMutation({
		mutationKey: ['create-transfer-order'],
		mutationFn: async (data: TransferOrderType) => {
			const response = await client.api.auth['warehouse-transfers'].create.$post({
				json: data,
			});
			return response.json();
		},
		onMutate: () => {
			toast.loading('Creando traspaso...', {
				id: 'create-transfer-order',
			});
		},
		onSuccess: () => {
			toast.success('Traspaso creado correctamente', {
				id: 'create-transfer-order',
			});
		},
		onError: (error) => {
			toast.error('Error al crear traspaso', {
				id: 'create-transfer-order',
			});
			// biome-ignore lint/suspicious/noConsole: Needed for debugging
			console.error(error);
		},
	});
