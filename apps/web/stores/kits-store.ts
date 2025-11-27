import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { InspectionKitItem, InspectionProgress } from "@/types";

/**
 * Zustand store for managing kit inspection flow
 * Handles kit item return tracking and progress monitoring
 */
interface KitsState {
	/** Items currently being inspected for return */
	inspectionItems: InspectionKitItem[];
	/** Whether inspection data is loading */
	inspectionLoading: boolean;
	/** Available employees (for display) */
	employees: Array<{
		id: string;
		name: string;
		avatar?: string;
		specialty?: string;
	}>;
	/** Product lookup used for display */
	products: Array<{ id: string; name: string }>;
	/** Form draft for any temporary data storage */
	draft: Record<string, unknown>;
	/** Update draft with partial data */
	setDraft: (partial: Record<string, unknown>) => void;
	/** Clear all draft data */
	clearDraft: () => void;
	/** Set employees list */
	setEmployees: (
		employees: Array<{
			id: string;
			name: string;
			avatar?: string;
			specialty?: string;
		}>,
	) => void;
	/** Set products list */
	setProducts: (products: Array<{ id: string; name: string }>) => void;
	/** Load kit items for inspection */
	loadInspection: (kitId: string, items: InspectionKitItem[]) => void;
	/** Toggle return status of a single item */
	toggleInspectionItem: (itemId: string) => void;
	/** Toggle return status of all items with the same barcode */
	toggleInspectionGroup: (barcode: string) => void;
	/** Mark all items in a kit as returned */
	markAllReturned: (kitId: string) => void;
	/** Update observations for a specific item */
	updateItemObservations: (itemId: string, observations: string) => void;
	/** Get current inspection progress statistics */
	getInspectionProgress: () => InspectionProgress;
}

export const useKitsStore = create<KitsState>()(
	devtools(
		(set, get) => ({
			inspectionItems: [],
			inspectionLoading: false,
			employees: [],
			products: [],
			draft: {},
			setDraft: (partial) =>
				set((state) => ({ draft: { ...state.draft, ...partial } })),
			clearDraft: () => set({ draft: {} }),
			setEmployees: (employees) => set({ employees }),
			setProducts: (products) => set({ products }),

			loadInspection: (_kitId, items) => {
				set({ inspectionLoading: true });
				// Simulate loading
				setTimeout(() => {
					set({
						inspectionItems: items,
						inspectionLoading: false,
					});
				}, 1000);
			},

			toggleInspectionItem: (itemId) => {
				set((state) => ({
					inspectionItems: state.inspectionItems.map((item) =>
						item.id === itemId ? { ...item, returned: !item.returned } : item,
					),
				}));
			},

			toggleInspectionGroup: (barcode) => {
				set((state) => {
					const groupItems = state.inspectionItems.filter(
						(item) => item.barcode === barcode,
					);
					const allReturned = groupItems.every((item) => item.returned);

					return {
						inspectionItems: state.inspectionItems.map((item) =>
							item.barcode === barcode
								? { ...item, returned: !allReturned }
								: item,
						),
					};
				});
			},

			markAllReturned: (_kitId) => {
				set((state) => ({
					inspectionItems: state.inspectionItems.map((item) => ({
						...item,
						returned: true,
					})),
				}));
			},

			updateItemObservations: (itemId, observations) => {
				set((state) => ({
					inspectionItems: state.inspectionItems.map((item) =>
						item.id === itemId ? { ...item, observations } : item,
					),
				}));
			},

			getInspectionProgress: () => {
				const state = get();
				const total = state.inspectionItems.length;
				const returned = state.inspectionItems.filter(
					(item) => item.returned,
				).length;
				const percentage = total > 0 ? Math.round((returned / total) * 100) : 0;

				return { total, returned, percentage };
			},
		}),
		{ name: "kits-store" },
	),
);
