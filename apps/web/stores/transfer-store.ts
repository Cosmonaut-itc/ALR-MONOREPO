import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { TransferOrderType, ProductCatalogResponse } from "@/types";
import { useAuthStore } from "./auth-store";

interface TransferItem {
	id: string;
	barcode: number;
	productName: string;
	category: string;
	warehouse: string;
	cabinet_id: string;
}

export interface TransferCandidate {
	uuid: string;
	barcode: number;
	productName: string;
	category: string;
	warehouse: string;
	cabinet_id: string;
	/**
	 * Source of the item: 'warehouse' (almacén) or 'cabinet' (gabinete)
	 * Used to determine transfer direction
	 */
	source: "warehouse" | "cabinet";
}

interface TransferState {
	/** Items currently displayed in the table (kept for potential reuse) */
	items: TransferItem[];
	/** UUID list of items selected for transfer in legacy flows */
	selectedIds: string[];

	/** The list of selected inventory UUIDs to transfer from AG to Gabinete */
	transferList: TransferCandidate[];

	destinationWarehouseId: string;

	setItems: (items: TransferItem[]) => void;
	setDestinationWarehouseId: (destinationWarehouseId: string) => void;
	toggleSelection: (id: string) => void;
	selectGroup: (barcode: number) => void;
	clearSelection: () => void;

	/** Add multiple candidates to the transfer list */
	addToTransfer: (items: TransferCandidate[]) => void;
	/** Remove one candidate from the transfer list by uuid */
	removeFromTransfer: (uuid: string) => void;
	/** Clear the transfer list */
	clearTransfer: () => void;
	/** Approve and finalize transfer - returns transformed data for mutation */
	approveTransfer: ({
		destinationWarehouseId,
		sourceWarehouseId,
		cabinetId,
		isCabinetToWarehouse,
		productCatalog,
	}: {
		destinationWarehouseId: string;
		sourceWarehouseId: string;
		cabinetId: string;
		isCabinetToWarehouse: boolean;
		productCatalog?: ProductCatalogResponse | null;
	}) => TransferOrderType;
}

export const useTransferStore = create<TransferState>()(
	devtools((set, get) => ({
		items: [],
		selectedIds: [],
		transferList: [],
		destinationWarehouseId: "",

		setItems: (items) => set({ items }),
		setDestinationWarehouseId: (destinationWarehouseId) =>
			set({ destinationWarehouseId }),

		toggleSelection: (id) =>
			set((state) => ({
				selectedIds: state.selectedIds.includes(id)
					? state.selectedIds.filter((x) => x !== id)
					: [...state.selectedIds, id],
			})),

		selectGroup: (barcode) =>
			set((state) => {
				const groupIds = state.items
					.filter((i) => i.barcode === barcode)
					.map((i) => i.id);
				const allSelected = groupIds.every((id) =>
					state.selectedIds.includes(id),
				);
				return {
					selectedIds: allSelected
						? state.selectedIds.filter((id) => !groupIds.includes(id))
						: [...state.selectedIds, ...groupIds],
				};
			}),

		clearSelection: () => set({ selectedIds: [] }),

		addToTransfer: (items) =>
			set((state) => {
				const existing = new Set(state.transferList.map((i) => i.uuid));
				const merged = [
					...state.transferList,
					...items.filter((i) => !existing.has(i.uuid)),
				];
				return { transferList: merged };
			}),

		removeFromTransfer: (uuid) =>
			set((state) => ({
				transferList: state.transferList.filter((i) => i.uuid !== uuid),
			})),

		clearTransfer: () => set({ transferList: [] }),

		approveTransfer: ({
			destinationWarehouseId,
			sourceWarehouseId,
			cabinetId,
			isCabinetToWarehouse,
			productCatalog,
		}: {
			destinationWarehouseId: string;
			sourceWarehouseId: string;
			cabinetId: string;
			isCabinetToWarehouse: boolean;
			productCatalog?: ProductCatalogResponse | null;
		}) => {
			const transferList = get().transferList;
			const currentUser = useAuthStore.getState().user;

			if (!currentUser) {
				throw new Error("Usuario no autenticado");
			}

			if (!(sourceWarehouseId && destinationWarehouseId)) {
				throw new Error("Almacén de origen o destino no especificado");
			}
			if (!cabinetId) {
				throw new Error("Gabinete de destino no especificado");
			}

			// Generate unique transfer number using timestamp
			const transferNumber = `TR-${Date.now()}`;

			// Helper function to get cost from product catalog by barcode
			const getCostFromCatalog = (barcode: number): number => {
				if (
					!productCatalog ||
					typeof productCatalog !== "object" ||
					!("success" in productCatalog) ||
					!productCatalog.success ||
					!Array.isArray(productCatalog.data)
				) {
					return 0;
				}

				const product = productCatalog.data.find(
					(p: unknown) => {
						if (typeof p !== "object" || p === null) {
							return false;
						}
						const productRecord = p as Record<string, unknown>;
						const productGoodId = productRecord.good_id;
						const productCost = productRecord.cost;
						return (
							typeof productGoodId === "number" &&
							productGoodId === barcode &&
							typeof productCost === "number"
						);
					},
				);

				return (
					(product && typeof product === "object" && "cost" in product
						? (product.cost as number | undefined)
						: undefined) ?? 0
				);
			};

			// Transform the transfer list to the expected API format
			const transformedData: TransferOrderType = {
				transferNumber,
				transferType: "internal", // Internal transfer between warehouses
				sourceWarehouseId,
				destinationWarehouseId,
				initiatedBy: currentUser.id,
				cabinetId,
				transferDetails: transferList.map((item) => ({
					productStockId: item.uuid,
					quantityTransferred: 1, // Default quantity (not specified in TransferCandidate)
					itemCondition: "good" as const, // Default to good condition
					goodId: item.barcode, // Required: product barcode
					costPerUnit: getCostFromCatalog(item.barcode), // Look up cost from product catalog
				})),
				notes: `Transfer from ${isCabinetToWarehouse ? "Gabinete" : "AG"} to ${isCabinetToWarehouse ? "AG" : "Gabinete"} - ${transferList.length} items`,
				priority: "normal" as const,
				isCabinetToWarehouse,
			};

			// Clear the transfer list after creating the order
			set({ transferList: [] });

			return transformedData;
		},
	})),
);
