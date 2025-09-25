import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ReceptionItem } from '@/types';

type TransferDraftPriority = 'normal' | 'high' | 'urgent';

type TransferDraftItem = {
	productStockId: string;
	productName: string;
	barcode: number;
	quantity: number;
	itemNotes?: string;
};

interface TransferDraftState {
	sourceWarehouseId: string;
	destinationWarehouseId: string;
	scheduledDate: string | null;
	transferNotes: string;
	priority: TransferDraftPriority;
	items: TransferDraftItem[];
}

interface ReceptionStore {
	items: ReceptionItem[];
	setItems: (items: ReceptionItem[]) => void;
	toggleReceived: (itemId: string) => void;
	markAllReceived: () => void;
	getReceivedCount: () => number;
	getTotalCount: () => number;
	isAllReceived: () => boolean;

	transferDraft: TransferDraftState;
	updateTransferDraft: (partial: Partial<Omit<TransferDraftState, 'items'>>) => void;
	resetTransferDraft: () => void;
	addDraftItem: (item: TransferDraftItem) => void;
	removeDraftItem: (productStockId: string) => void;
	updateDraftItemQuantity: (productStockId: string, quantity: number) => void;
	setDraftItemNote: (productStockId: string, note: string) => void;
	getDraftItemCount: () => number;
}

export const useReceptionStore = create<ReceptionStore>()(
	devtools(
		persist(
			(set, get) => ({
				items: [],
				transferDraft: {
					sourceWarehouseId: '',
					destinationWarehouseId: '',
					scheduledDate: null,
					transferNotes: '',
					priority: 'normal',
					items: [],
				},

				setItems: (items) => set({ items }),

				toggleReceived: (itemId) =>
					set((state) => ({
						items: state.items.map((item) =>
							item.id === itemId ? { ...item, received: !item.received } : item,
						),
					})),

				markAllReceived: () =>
					set((state) => ({
						items: state.items.map((item) => ({ ...item, received: true })),
					})),

				getReceivedCount: () => {
					const { items } = get();
					return items.filter((item) => item.received).length;
				},

				getTotalCount: () => {
					const { items } = get();
					return items.length;
				},

				isAllReceived: () => {
					const { items } = get();
					return items.length > 0 && items.every((item) => item.received);
				},

				updateTransferDraft: (partial) =>
					set((state) => ({
						transferDraft: {
							...state.transferDraft,
							...partial,
						},
					})),

				resetTransferDraft: () =>
					set({
						transferDraft: {
							sourceWarehouseId: '',
							destinationWarehouseId: '',
							scheduledDate: null,
							transferNotes: '',
							priority: 'normal',
							items: [],
						},
					}),

				addDraftItem: (item) =>
					set((state) => {
						const existing = state.transferDraft.items.find(
							(draftItem) => draftItem.productStockId === item.productStockId,
						);
						const items = existing
							? state.transferDraft.items.map((draftItem) =>
									draftItem.productStockId === item.productStockId
										? {
												...draftItem,
												quantity: draftItem.quantity + item.quantity,
											}
										: draftItem,
								)
							: [...state.transferDraft.items, item];
						return {
							transferDraft: {
								...state.transferDraft,
								items,
							},
						};
					}),

				removeDraftItem: (productStockId) =>
					set((state) => ({
						transferDraft: {
							...state.transferDraft,
							items: state.transferDraft.items.filter(
								(item) => item.productStockId !== productStockId,
							),
						},
					})),

				updateDraftItemQuantity: (productStockId, quantity) =>
					set((state) => {
						const normalized =
							Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
						return {
							transferDraft: {
								...state.transferDraft,
								items: state.transferDraft.items.map((item) =>
									item.productStockId === productStockId
										? { ...item, quantity: normalized }
										: item,
								),
							},
						};
					}),

				setDraftItemNote: (productStockId, note) =>
					set((state) => ({
						transferDraft: {
							...state.transferDraft,
							items: state.transferDraft.items.map((item) =>
								item.productStockId === productStockId
									? { ...item, itemNotes: note }
									: item,
							),
						},
					})),

				getDraftItemCount: () => {
					const {
						transferDraft: { items },
					} = get();
					return items.reduce((total, item) => total + item.quantity, 0);
				},
			}),
			{
				name: 'reception-store',
				partialize: (state) => ({
					transferDraft: state.transferDraft,
				}),
			},
		),
		{ name: 'reception-store-devtools' },
	),
);
