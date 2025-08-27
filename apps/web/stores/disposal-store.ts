import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ProductStockItem } from '@/lib/schemas';

type DisposalReason = 'consumido' | 'dañado' | 'otro';

interface DisposalState {
	current?: ProductStockItem;
	reason?: DisposalReason;
	open: boolean;
	isLoading: boolean;

	/** Abrir diálogo para artículo específico */
	show: (item: ProductStockItem) => void;

	/** Cerrar diálogo y resetear */
	hide: () => void;

	/** Establecer motivo de baja */
	setReason: (reason: DisposalReason) => void;

	/** Confirmar baja del artículo */
	confirm: () => Promise<void>;
}

export const useDisposalStore = create<DisposalState>()(
	devtools(
		(set, get) => ({
			current: undefined,
			reason: undefined,
			open: false,
			isLoading: false,

			show: (item) =>
				set({
					current: item,
					open: true,
					reason: undefined,
				}),

			hide: () =>
				set({
					current: undefined,
					reason: undefined,
					open: false,
					isLoading: false,
				}),

			setReason: (reason) => set({ reason }),

			confirm: async () => {
				const { current, reason } = get();

				if (!current) {
					return;
				}

				if (!reason) {
					return;
				}

				set({ isLoading: true });

				try {
					// TODO: Integrar llamada a la API
					// await fetch('/api/dispose', { ... })

					// Simulación de llamada API
					await new Promise((resolve) => setTimeout(resolve, 1000));

					// Log disposal action (will be replaced with proper API call)
					// Article disposed: current.id, Reason: reason

					set({
						current: undefined,
						reason: undefined,
						open: false,
						isLoading: false,
					});
				} catch {
					// Error disposing article
					set({ isLoading: false });
				}
			},
		}),
		{
			name: 'disposal-store',
		},
	),
);
