"use memo";
"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, ExternalLink, Package, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	getAllProducts,
	getAllWarehouses,
	getCabinetWarehouse,
	getInventoryByWarehouse,
} from "@/lib/fetch-functions/inventory";
import { getReplenishmentOrderById } from "@/lib/fetch-functions/replenishment-orders";
import { createQueryKey } from "@/lib/helpers";
import {
	useLinkTransferToReplenishmentOrder,
	useUpdateReplenishmentOrder,
} from "@/lib/mutations/replenishment-orders";
import { useCreateTransferOrder } from "@/lib/mutations/transfers";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import type {
	ProductCatalogItem,
	ProductCatalogResponse,
	ReplenishmentOrderDetail,
	WarehouseMap,
} from "@/types";

type InventoryResponse = Awaited<
	ReturnType<typeof getInventoryByWarehouse>
> | null;

type WarehousesResponse = Awaited<ReturnType<typeof getAllWarehouses>>;

type OrderDetailResponse = ReplenishmentOrderDetail | null;

type ParsedOrderDetail = {
	id: string;
	orderNumber: string;
	notes: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	sourceWarehouseId: string;
	cedisWarehouseId: string;
	isSent: boolean;
	isReceived: boolean;
	warehouseTransferId: string | null;
	itemsCount: number;
	hasRelatedTransfer: boolean;
	items: Array<{
		id: string;
		barcode: number;
		quantity: number;
		notes: string | null;
	}>;
};

type WarehouseOption = {
	id: string;
	name: string;
	code?: string;
};

type CabinetMapping = Map<
	string,
	{ cabinetId: string; warehouseName: string; warehouseId: string }
>;

type InventoryStockItem = {
	id: string;
	barcode: number;
	description: string | null;
	currentWarehouse: string | null;
};

type SelectedItemsMap = Record<string, string[]>;

type PedidoDetailsPageProps = {
	orderId: string;
	isEncargado: boolean;
};

const parseBarcode = (value: unknown): number | null => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string" && value.trim().length > 0) {
		const parsed = Number.parseInt(value, 10);
		if (!Number.isNaN(parsed)) {
			return parsed;
		}
	}
	return null;
};

const STATUS_LABELS: Record<"open" | "sent" | "received", string> = {
	open: "Abierto",
	sent: "Enviado",
	received: "Recibido",
};

const STATUS_VARIANTS: Record<
	"open" | "sent" | "received",
	"outline" | "secondary" | "default"
> = {
	open: "outline",
	sent: "secondary",
	received: "default",
};

const formatDate = (value: string | null | undefined) => {
	if (!value) {
		return "Sin fecha";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "Sin fecha";
	}
	return format(date, "PPpp", { locale: es });
};

const formatRelative = (value: string | null | undefined) => {
	if (!value) {
		return "";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "";
	}
	return formatDistanceToNow(date, { addSuffix: true, locale: es });
};

const parseOrderDetail = (
	response: OrderDetailResponse,
): ParsedOrderDetail | null => {
	if (!response || typeof response !== "object" || !("success" in response)) {
		return null;
	}
	if (!response.success || !response.data) {
		return null;
	}
	const data = response.data as Record<string, unknown>;
	const id = typeof data.id === "string" ? data.id : "";
	if (!id) {
		return null;
	}
	const details = Array.isArray(data.details) ? data.details : [];
	return {
		id,
		orderNumber:
			typeof data.orderNumber === "string" && data.orderNumber.length > 0
				? data.orderNumber
				: id,
		notes: typeof data.notes === "string" ? data.notes : null,
		createdAt: typeof data.createdAt === "string" ? data.createdAt : null,
		updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
		sourceWarehouseId:
			typeof data.sourceWarehouseId === "string" ? data.sourceWarehouseId : "",
		cedisWarehouseId:
			typeof data.cedisWarehouseId === "string" ? data.cedisWarehouseId : "",
		isSent: Boolean(data.isSent),
		isReceived: Boolean(data.isReceived),
		warehouseTransferId:
			typeof data.warehouseTransferId === "string"
				? data.warehouseTransferId
				: null,
		itemsCount: typeof data.itemsCount === "number" ? data.itemsCount : 0,
		hasRelatedTransfer: Boolean(data.hasRelatedTransfer),
		items: details
			.map((detail) => {
				if (!detail || typeof detail !== "object") {
					return null;
				}
				const record = detail as Record<string, unknown>;
				const detailId = typeof record.id === "string" ? record.id : undefined;
				const barcode =
					typeof record.barcode === "number"
						? record.barcode
						: typeof record.barcode === "string"
							? Number.parseInt(record.barcode, 10)
							: undefined;
				const quantityRaw =
					typeof record.quantity === "number"
						? record.quantity
						: typeof record.quantity === "string"
							? Number.parseInt(record.quantity, 10)
							: undefined;
				if (
					!detailId ||
					!barcode ||
					quantityRaw == null ||
					Number.isNaN(quantityRaw)
				) {
					return null;
				}
				return {
					id: detailId,
					barcode,
					quantity: quantityRaw,
					notes: typeof record.notes === "string" ? record.notes : null,
				};
			})
			.filter(
				(
					item,
				): item is {
					id: string;
					barcode: number;
					quantity: number;
					notes: string | null;
				} => Boolean(item),
			),
	};
};

const statusFromOrder = (
	order: ParsedOrderDetail | null,
): "open" | "sent" | "received" => {
	if (!order) {
		return "open";
	}
	if (order.isReceived) {
		return "received";
	}
	if (order.isSent) {
		return "sent";
	}
	return "open";
};

const buildCabinetMap = (cabinetWarehouse: WarehouseMap): CabinetMapping => {
	const map: CabinetMapping = new Map();
	if (
		!cabinetWarehouse ||
		typeof cabinetWarehouse !== "object" ||
		!("success" in cabinetWarehouse) ||
		!cabinetWarehouse.success
	) {
		return map;
	}

	const entries = Array.isArray(cabinetWarehouse.data)
		? (cabinetWarehouse.data as Array<Record<string, unknown>>)
		: [];

	for (const rawEntry of entries) {
		if (!rawEntry || typeof rawEntry !== "object") {
			continue;
		}
		const entry = rawEntry as Record<string, unknown>;

		const warehouseId =
			typeof entry.warehouseId === "string" &&
			entry.warehouseId.trim().length > 0
				? entry.warehouseId.trim()
				: typeof entry.warehouse_id === "string" &&
						entry.warehouse_id.trim().length > 0
					? entry.warehouse_id.trim()
					: null;
		const cabinetId =
			typeof entry.cabinetId === "string" && entry.cabinetId.trim().length > 0
				? entry.cabinetId.trim()
				: typeof entry.cabinet_id === "string" &&
						entry.cabinet_id.trim().length > 0
					? entry.cabinet_id.trim()
					: null;
		const warehouseName =
			typeof entry.warehouseName === "string" &&
			entry.warehouseName.trim().length > 0
				? entry.warehouseName.trim()
				: typeof entry.warehouse_name === "string" &&
						entry.warehouse_name.trim().length > 0
					? entry.warehouse_name.trim()
					: null;

		if (warehouseId && cabinetId) {
			map.set(warehouseId, {
				cabinetId,
				warehouseId,
				warehouseName: warehouseName ?? `Almacén ${warehouseId.slice(0, 6)}`,
			});
		}
	}

	return map;
};

const parseWarehouses = (response: WarehousesResponse): WarehouseOption[] => {
	if (
		!response ||
		typeof response !== "object" ||
		!("data" in response) ||
		!response.data
	) {
		return [];
	}
	return (response.data as Array<Record<string, unknown>>)
		.map((item): WarehouseOption | null => {
			if (!item || typeof item !== "object") {
				return null;
			}
			const id = item.id;
			const name = item.name;
			const code = item.code;
			if (typeof id !== "string" || id.trim().length === 0) {
				return null;
			}
			const trimmedId = id.trim();
			const trimmedName =
				typeof name === "string" && name.trim().length > 0
					? name.trim()
					: `Almacén ${trimmedId.slice(0, 6)}`;
			const codeValue =
				typeof code === "string" && code.trim().length > 0
					? code.trim()
					: undefined;
			const result: WarehouseOption = {
				id: trimmedId,
				name: trimmedName,
				...(codeValue ? { code: codeValue } : {}),
			};
			return result;
		})
		.filter((item): item is WarehouseOption => Boolean(item));
};

const parseInventory = (response: InventoryResponse): InventoryStockItem[] => {
	if (
		!response ||
		typeof response !== "object" ||
		!("success" in response) ||
		!response.success ||
		!response.data
	) {
		return [];
	}
	const warehouseEntries = Array.isArray(response.data.warehouse)
		? (response.data.warehouse as Array<Record<string, unknown>>)
		: [];

	return warehouseEntries
		.map((entry) => {
			if (!entry || typeof entry !== "object") {
				return null;
			}
			const productStock = (
				entry as {
					productStock?: Record<string, unknown>;
				}
			).productStock;
			if (!productStock || typeof productStock !== "object") {
				return null;
			}
			const id = typeof productStock.id === "string" ? productStock.id : null;
			const barcode =
				typeof productStock.barcode === "number"
					? productStock.barcode
					: typeof productStock.barcode === "string"
						? Number.parseInt(productStock.barcode, 10)
						: null;
			if (!id || !barcode || Number.isNaN(barcode)) {
				return null;
			}
			return {
				id,
				barcode,
				description:
					typeof productStock.description === "string"
						? productStock.description
						: null,
				currentWarehouse:
					typeof productStock.currentWarehouse === "string"
						? productStock.currentWarehouse
						: null,
			};
		})
		.filter((item): item is InventoryStockItem => Boolean(item));
};

export function PedidoDetailsPage({
	orderId,
	isEncargado,
}: PedidoDetailsPageProps) {
	const router = useRouter();
	const currentUser = useAuthStore((state) => state.user);

	const { data: orderResponse } = useSuspenseQuery<
		OrderDetailResponse,
		Error,
		OrderDetailResponse
	>({
		queryKey: createQueryKey(queryKeys.replenishmentOrderDetail, [orderId]),
		queryFn: () => getReplenishmentOrderById(orderId),
	});

	const { data: productCatalog } = useSuspenseQuery<
		ProductCatalogResponse | null,
		Error,
		ProductCatalogResponse | null
	>({
		queryKey: queryKeys.productCatalog,
		queryFn: getAllProducts,
	});

	const parsedOrder = useMemo(
		() => parseOrderDetail(orderResponse),
		[orderResponse],
	);

	const cedisWarehouseId = parsedOrder?.cedisWarehouseId ?? null;

	const { data: inventoryResponse } = useSuspenseQuery<
		InventoryResponse,
		Error,
		InventoryResponse
	>({
		queryKey: createQueryKey(queryKeys.inventory, [
			cedisWarehouseId ?? "unknown",
		]),
		queryFn: () =>
			cedisWarehouseId
				? getInventoryByWarehouse(cedisWarehouseId)
				: Promise.resolve(null),
	});

	const { data: cabinetWarehouseResponse } = useSuspenseQuery<
		WarehouseMap,
		Error,
		WarehouseMap
	>({
		queryKey: queryKeys.cabinetWarehouse,
		queryFn: getCabinetWarehouse,
	});

	const { data: warehousesResponse } = useSuspenseQuery<
		WarehousesResponse,
		Error,
		WarehousesResponse
	>({
		queryKey: queryKeys.warehouses,
		queryFn: getAllWarehouses,
	});

	const createTransferMutation = useCreateTransferOrder();
	const linkTransferMutation = useLinkTransferToReplenishmentOrder();
	const updateOrderMutation = useUpdateReplenishmentOrder();

	const [selectedItems, setSelectedItems] = useState<SelectedItemsMap>({});
	const [itemSearch, setItemSearch] = useState("");
	const [stockDialogDetailId, setStockDialogDetailId] = useState<string | null>(
		null,
	);
	const [stockDialogSearch, setStockDialogSearch] = useState("");
	const [transferNotes, setTransferNotes] = useState("");
	const [priority, setPriority] = useState<"normal" | "urgent" | "high">(
		"normal",
	);
	const [showZeroQuantityDialog, setShowZeroQuantityDialog] = useState(false);
	const [pendingTransferAction, setPendingTransferAction] = useState<
		(() => Promise<void>) | null
	>(null);

	const warehouseOptions = useMemo(
		() => parseWarehouses(warehousesResponse),
		[warehousesResponse],
	);

	const warehousesMap = useMemo(() => {
		const map = new Map<string, WarehouseOption>();
		for (const warehouse of warehouseOptions) {
			map.set(warehouse.id, warehouse);
		}
		return map;
	}, [warehouseOptions]);

	const cabinetMap = useMemo(
		() => buildCabinetMap(cabinetWarehouseResponse),
		[cabinetWarehouseResponse],
	);

	const inventoryItems = useMemo(
		() => parseInventory(inventoryResponse),
		[inventoryResponse],
	);

	const inventoryByBarcode = useMemo(() => {
		const map = new Map<number, InventoryStockItem[]>();
		for (const item of inventoryItems) {
			const list = map.get(item.barcode) ?? [];
			list.push(item);
			map.set(item.barcode, list);
		}
		return map;
	}, [inventoryItems]);

	const productInfoByBarcode = useMemo(() => {
		const map = new Map<number, { name: string; category: string }>();

		// 1) Prefer inventory descriptions (most up to date on hand)
		for (const item of inventoryItems) {
			if (!item.barcode || map.has(item.barcode)) continue;
			const description =
				item.description && item.description.trim().length > 0
					? item.description.trim()
					: null;
			if (description) {
				map.set(item.barcode, {
					name: description,
					category: "Sin categoría",
				});
			}
		}

		// 2) Fallback to product catalog (barcode or good_id)
		if (
			productCatalog &&
			typeof productCatalog === "object" &&
			"success" in productCatalog &&
			productCatalog.success &&
			Array.isArray(productCatalog.data)
		) {
			for (const rawProduct of productCatalog.data as ProductCatalogItem[]) {
				const parsedBarcode =
					parseBarcode(rawProduct.barcode) ?? parseBarcode(rawProduct.good_id);
				if (parsedBarcode == null || Number.isNaN(parsedBarcode)) {
					continue;
				}
				const existing = map.get(parsedBarcode);
				const nameCandidate =
					typeof rawProduct.title === "string" &&
					rawProduct.title.trim().length > 0
						? rawProduct.title.trim()
						: `Producto ${parsedBarcode}`;
				const categoryCandidate =
					typeof rawProduct.category === "string" &&
					rawProduct.category.trim().length > 0
						? rawProduct.category.trim()
						: existing?.category ?? "Sin categoría";

				if (existing) {
					map.set(parsedBarcode, {
						name: existing.name,
						category: categoryCandidate,
					});
					continue;
				}

				map.set(parsedBarcode, {
					name: nameCandidate,
					category: categoryCandidate,
				});
			}
		}
		return map;
	}, [productCatalog, inventoryItems]);

	const resolveProductInfo = useCallback(
		(barcode: number) => {
			const info = productInfoByBarcode.get(barcode);
			if (info) return info;
			return {
				name: `Producto ${barcode}`,
				category: "Sin categoría",
			};
		},
		[productInfoByBarcode],
	);

	const status = statusFromOrder(parsedOrder);

	const sourceWarehouseName = useMemo(() => {
		if (!parsedOrder?.sourceWarehouseId) {
			return "Sin origen";
		}
		const candidate = warehousesMap.get(parsedOrder.sourceWarehouseId);
		if (candidate) {
			return candidate.name;
		}
		return `Almacén ${parsedOrder.sourceWarehouseId.slice(0, 6)}`;
	}, [parsedOrder, warehousesMap]);

	const cedisWarehouseName = useMemo(() => {
		if (!parsedOrder?.cedisWarehouseId) {
			return "Sin CEDIS";
		}
		const candidate = warehousesMap.get(parsedOrder.cedisWarehouseId);
		if (candidate) {
			return candidate.name;
		}
		return `CEDIS ${parsedOrder.cedisWarehouseId.slice(0, 6)}`;
	}, [parsedOrder, warehousesMap]);

	const toggleSelection = useCallback(
		(detailId: string, stockId: string, requested: number) => {
			setSelectedItems((prev) => {
				const current = prev[detailId] ?? [];
				const exists = current.includes(stockId);
				if (exists) {
					return {
						...prev,
						[detailId]: current.filter((id) => id !== stockId),
					};
				}
				if (current.length >= requested) {
					toast.error(
						`Este artículo requiere ${requested} pieza(s). Elimina alguno antes de agregar otra.`,
					);
					return prev;
				}
				return {
					...prev,
					[detailId]: [...current, stockId],
				};
			});
		},
		[],
	);

	const normalizedItemSearch = itemSearch.trim().toLowerCase();

	const enrichedItems = useMemo(() => {
		if (!parsedOrder) {
			return [];
		}

		return parsedOrder.items.map((item) => {
			const productInfo = resolveProductInfo(item.barcode);
			const displayName = productInfo.name;
			const category = productInfo.category;
			const availableStocks = inventoryByBarcode.get(item.barcode) ?? [];
			const selectedForItem = selectedItems[item.id] ?? [];
			const searchPool = [
				displayName.toLowerCase(),
				item.barcode.toString(),
				category.toLowerCase(),
				item.notes?.toLowerCase() ?? "",
			];

			const matchesSearch =
				normalizedItemSearch.length === 0 ||
				searchPool.some((value) => value.includes(normalizedItemSearch));

			return {
				detailId: item.id,
				barcode: item.barcode,
				displayName,
				category,
				requestedQuantity: item.quantity,
				selectedIds: selectedForItem,
				availableStocks,
				matchesSearch,
				itemNotes: item.notes,
			};
		});
	}, [
		inventoryByBarcode,
		normalizedItemSearch,
		parsedOrder,
		resolveProductInfo,
		selectedItems,
	]);

	const filteredItems = useMemo(
		() => enrichedItems.filter((item) => item.matchesSearch),
		[enrichedItems],
	);

	const stockDialogItem = useMemo(() => {
		if (!stockDialogDetailId) return null;
		return enrichedItems.find((item) => item.detailId === stockDialogDetailId) ?? null;
	}, [enrichedItems, stockDialogDetailId]);

	const filteredDialogStocks = useMemo(() => {
		if (!stockDialogItem) return [];
		const term = stockDialogSearch.trim().toLowerCase();
		if (!term) return stockDialogItem.availableStocks;
		return stockDialogItem.availableStocks.filter((stock) =>
			stock.id.toLowerCase().includes(term),
		);
	}, [stockDialogItem, stockDialogSearch]);

	const hasSearchTerm = normalizedItemSearch.length > 0;
	const itemsToRender = hasSearchTerm ? filteredItems : enrichedItems;
	const noItemsMatchSearch = hasSearchTerm && filteredItems.length === 0;

	const handleSelectAllForItem = useCallback(
		(detailId: string, requested: number, available: InventoryStockItem[]) => {
			setSelectedItems((prev) => {
				const current = prev[detailId] ?? [];
				const remainingSlots = Math.max(requested - current.length, 0);
				if (remainingSlots <= 0) {
					return prev;
				}
				const candidateIds = available
					.map((stock) => stock.id)
					.filter((id) => !current.includes(id));
				if (candidateIds.length === 0) {
					return prev;
				}
				return {
					...prev,
					[detailId]: [...current, ...candidateIds.slice(0, remainingSlots)],
				};
			});
		},
		[],
	);

	const handleStockDialogOpenChange = useCallback((open: boolean) => {
		if (!open) {
			setStockDialogDetailId(null);
			setStockDialogSearch("");
		}
	}, []);

	const handleClearSelectionForItem = useCallback((detailId: string) => {
		setSelectedItems((prev) => {
			const current = prev[detailId];
			if (!current || current.length === 0) {
				return prev;
			}
			return {
				...prev,
				[detailId]: [],
			};
		});
	}, []);

	const fulfillmentProgress = useMemo(() => {
		if (!parsedOrder) {
			return {
				requested: 0,
				selected: 0,
				missing: 0,
				complete: false,
			};
		}

		let requestedTotal = 0;
		let selectedTotal = 0;
		let isComplete = true;

		for (const item of parsedOrder.items) {
			const requestedQuantity = item.quantity ?? 0;
			const selectedForItem = selectedItems[item.id]?.length ?? 0;

			requestedTotal += requestedQuantity;
			selectedTotal += selectedForItem;

			if (selectedForItem !== requestedQuantity) {
				isComplete = false;
			}
		}

		const missingTotal = Math.max(requestedTotal - selectedTotal, 0);

		return {
			requested: requestedTotal,
			selected: selectedTotal,
			missing: missingTotal,
			complete: isComplete && requestedTotal > 0,
		};
	}, [parsedOrder, selectedItems]);

	const hasCompleteFulfillment = fulfillmentProgress.complete;
	const pendingPieces = fulfillmentProgress.missing;

	/**
	 * Checks if any items have zero selected products
	 * @returns Array of items with zero selections, including their display info
	 */
	const getZeroQuantityItems = useCallback(() => {
		if (!parsedOrder) {
			return [];
		}
	return parsedOrder.items
		.map((item) => {
			const selectedCount = selectedItems[item.id]?.length ?? 0;
			if (selectedCount === 0) {
				const productInfo = resolveProductInfo(item.barcode);
				return {
					barcode: item.barcode,
					displayName: productInfo.name,
					requestedQuantity: item.quantity,
				};
			}
			return null;
		})
		.filter(
			(
				item,
			): item is {
				barcode: number;
				displayName: string;
				requestedQuantity: number;
			} => item !== null,
		);
	}, [parsedOrder, resolveProductInfo, selectedItems]);

	/**
	 * Creates the transfer order and updates the replenishment order with sent quantities
	 */
	const executeCreateTransfer = useCallback(async () => {
		if (!parsedOrder) {
			toast.error("No se encontró la información del pedido.");
			return;
		}

		if (!isEncargado) {
			toast.error("Esta acción está disponible únicamente para encargados.");
			return;
		}

		if (!currentUser?.id) {
			toast.error(
				"No se encontró el usuario actual. Inicia sesión nuevamente.",
			);
			return;
		}

		if (!parsedOrder.cedisWarehouseId) {
			toast.error("El pedido no tiene CEDIS asignado.");
			return;
		}

		if (!parsedOrder.sourceWarehouseId) {
			toast.error("El pedido no tiene bodega destino.");
			return;
		}

		// Check if a transfer already exists for this order
		if (parsedOrder.warehouseTransferId) {
			toast.info(
				"Este pedido ya tiene un traspaso asociado. Actualizando estado...",
			);
			try {
				// Try to update the order status if it's not already sent
				if (!parsedOrder.isSent) {
					const orderItems = parsedOrder.items.map((item) => {
						const selectedCount = selectedItems[item.id]?.length ?? 0;
						return {
							barcode: item.barcode,
							quantity: item.quantity,
							sentQuantity: selectedCount,
							notes: item.notes ?? undefined,
						};
					});

					await updateOrderMutation.mutateAsync({
						param: { id: parsedOrder.id },
						json: {
							isSent: true,
							items: orderItems,
						},
					});
				}
				toast.success("Estado del pedido actualizado.");
				router.push("/pedidos");
				return;
			} catch (error) {
				if (error instanceof Error && error.message) {
					toast.error(
						`Error al actualizar el pedido: ${error.message}. El traspaso ya existe con ID: ${parsedOrder.warehouseTransferId}`,
					);
				} else {
					toast.error(
						`No se pudo actualizar el pedido. El traspaso ya existe con ID: ${parsedOrder.warehouseTransferId}`,
					);
				}
				return;
			}
		}

		const cabinetInfo = cabinetMap.get(parsedOrder.sourceWarehouseId);
		const cabinetId = cabinetInfo?.cabinetId ?? parsedOrder.sourceWarehouseId;

		const transferDetails = parsedOrder.items.flatMap((item) => {
			const selections = selectedItems[item.id] ?? [];
			return selections.map((productStockId) => ({
				productStockId,
				quantityTransferred: 1,
				itemCondition: "good" as const,
				goodId: item.barcode,
				costPerUnit: 0,
			}));
		});

		let transferIdCandidate: string | null = null;

		// Only create transfer if there are selected items
		if (transferDetails.length > 0) {
			try {
					const transferPayload = {
						transferNumber: `TR-${Date.now()}`,
						transferType: "external" as const,
						sourceWarehouseId: parsedOrder.cedisWarehouseId,
						destinationWarehouseId: parsedOrder.sourceWarehouseId,
						initiatedBy: currentUser.id,
						cabinetId,
						transferDetails,
						notes:
							transferNotes.trim().length > 0
								? transferNotes.trim()
								: `Traspaso generado desde pedido ${parsedOrder.orderNumber}`,
						priority,
						isCabinetToWarehouse: false,
					};

				const transferResult =
					await createTransferMutation.mutateAsync(transferPayload);

				transferIdCandidate =
					(transferResult as Record<string, unknown>)?.data &&
					typeof (transferResult as { data?: unknown }).data === "object"
						? ((
								transferResult as {
									data?: { transfer?: { id?: string }; id?: string };
								}
							).data?.transfer?.id ??
							(
								transferResult as {
									data?: { transfer?: { id?: string }; id?: string };
								}
							).data?.id ??
							null)
						: null;

				if (!transferIdCandidate) {
					toast.warning(
						"No se pudo determinar el identificador del traspaso creado.",
					);
					return;
				}

				// Try to link the transfer to the order
				try {
					await linkTransferMutation.mutateAsync({
						param: { id: parsedOrder.id },
						json: { warehouseTransferId: transferIdCandidate },
					});
				} catch (linkError) {
					// If linking fails, warn the user but don't fail completely
					// The transfer was created, but the link failed
					if (linkError instanceof Error && linkError.message) {
						toast.warning(
							`Traspaso creado exitosamente (ID: ${transferIdCandidate}), pero no se pudo vincular al pedido: ${linkError.message}. Puedes vincularlo manualmente más tarde.`,
							{ duration: 6000 },
						);
					} else {
						toast.warning(
							`Traspaso creado exitosamente (ID: ${transferIdCandidate}), pero no se pudo vincular al pedido. Puedes vincularlo manualmente más tarde.`,
							{ duration: 6000 },
						);
					}
					// Still try to update order status if needed
					try {
						const orderItems = parsedOrder.items.map((item) => {
							const selectedCount = selectedItems[item.id]?.length ?? 0;
							return {
								barcode: item.barcode,
								quantity: item.quantity,
								sentQuantity: selectedCount,
							notes: item.notes ?? undefined,
							};
						});

						await updateOrderMutation.mutateAsync({
							param: { id: parsedOrder.id },
							json: {
								isSent: true,
								items: orderItems,
							},
						});
					} catch {
						// Ignore status update errors if linking already failed
					}
					router.push("/pedidos");
					return;
				}
			} catch (error) {
				if (error instanceof Error && error.message) {
					toast.error(`Error al crear el traspaso: ${error.message}`);
				} else {
					toast.error("No se pudo crear el traspaso.");
				}
				return;
			}
		}

		// Update order with sent quantities for each item
		try {
			const orderItems = parsedOrder.items.map((item) => {
				const selectedCount = selectedItems[item.id]?.length ?? 0;
				return {
					barcode: item.barcode,
					quantity: item.quantity,
					sentQuantity: selectedCount,
							notes: item.notes ?? undefined,
				};
			});

			await updateOrderMutation.mutateAsync({
				param: { id: parsedOrder.id },
				json: {
					isSent: true,
					items: orderItems,
				},
			});
		} catch (statusError) {
			// Status update failure is less critical since transfer and link succeeded
			if (statusError instanceof Error && statusError.message) {
				toast.warning(
					`Traspaso creado y vinculado, pero no se pudo actualizar el estado: ${statusError.message}`,
				);
			} else {
				toast.warning(
					"Traspaso creado y vinculado, pero no se pudo actualizar el estado del pedido.",
				);
			}
		}

		toast.success("Traspaso generado y pedido actualizado.");
		router.push("/pedidos");
	}, [
		parsedOrder,
		isEncargado,
		currentUser,
		cabinetMap,
		selectedItems,
		transferNotes,
		priority,
		createTransferMutation,
		linkTransferMutation,
		updateOrderMutation,
		router,
	]);

	/**
	 * Handles the initial transfer creation flow, checking for zero quantity items
	 */
	const handleCreateTransfer = useCallback(async () => {
		if (!parsedOrder) {
			toast.error("No se encontró la información del pedido.");
			return;
		}

		if (!isEncargado) {
			toast.error("Esta acción está disponible únicamente para encargados.");
			return;
		}

		if (!currentUser?.id) {
			toast.error(
				"No se encontró el usuario actual. Inicia sesión nuevamente.",
			);
			return;
		}

		if (!parsedOrder.cedisWarehouseId) {
			toast.error("El pedido no tiene CEDIS asignado.");
			return;
		}

		if (!parsedOrder.sourceWarehouseId) {
			toast.error("El pedido no tiene bodega destino.");
			return;
		}

		// Check for items with zero selected quantities
		const zeroQuantityItems = getZeroQuantityItems();

		if (zeroQuantityItems.length > 0) {
			// Store the action to execute after confirmation
			setPendingTransferAction(() => executeCreateTransfer);
			setShowZeroQuantityDialog(true);
			return;
		}

		// No zero quantity items, proceed directly
		await executeCreateTransfer();
	}, [
		parsedOrder,
		isEncargado,
		currentUser?.id,
		getZeroQuantityItems,
		executeCreateTransfer,
	]);

	/**
	 * Handles confirmation of transfer with zero quantity items
	 */
	const handleConfirmZeroQuantity = useCallback(async () => {
		setShowZeroQuantityDialog(false);
		if (pendingTransferAction) {
			await pendingTransferAction();
			setPendingTransferAction(null);
		}
	}, [pendingTransferAction]);

	/**
	 * Handles cancellation of transfer with zero quantity items
	 */
	const handleCancelZeroQuantity = useCallback(() => {
		setShowZeroQuantityDialog(false);
		setPendingTransferAction(null);
	}, []);

	if (!parsedOrder) {
		return (
			<div className="theme-transition flex-1 space-y-6 bg-white p-4 md:p-6 dark:bg-[#151718]">
				<div className="flex items-center gap-3">
					<Button onClick={() => router.push("/pedidos")} variant="ghost">
						Volver
					</Button>
					<h1 className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
						Pedido no encontrado
					</h1>
				</div>
				<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="py-12 text-center text-[#687076] dark:text-[#9BA1A6]">
						No fue posible cargar la información del pedido solicitado.
					</CardContent>
				</Card>
			</div>
		);
	}

	const warehouseTransferLink = parsedOrder.warehouseTransferId
		? `/recepciones/${parsedOrder.warehouseTransferId}`
		: null;

	return (
		<div className="theme-transition flex-1 space-y-6 bg-white p-4 md:p-6 dark:bg-[#151718]">
			<header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-3">
						<Button
							className="h-10 w-10 rounded-full border-[#E5E7EB] bg-white text-[#11181C] hover:bg-[#F3F4F6] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
							onClick={() => router.back()}
							size="icon"
							variant="outline"
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<div>
							<h1 className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
								Pedido {parsedOrder.orderNumber}
							</h1>
							<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
								Revisión de artículos y estado del pedido.
							</p>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<Badge variant={STATUS_VARIANTS[status]}>
							{STATUS_LABELS[status]}
						</Badge>
						<span className="text-[#687076] text-sm dark:text-[#9BA1A6]">
							Creado el {formatDate(parsedOrder.createdAt)}{" "}
							{formatRelative(parsedOrder.createdAt)
								? `(${formatRelative(parsedOrder.createdAt)})`
								: ""}
						</span>
					</div>
				</div>
				<div className="flex flex-wrap gap-3">
					<Button onClick={() => router.push("/pedidos")} variant="outline">
						Volver a pedidos
					</Button>
					{warehouseTransferLink && (
						<Button asChild className="gap-2" variant="outline">
							<Link href={warehouseTransferLink}>
								Ver traspaso
								<ExternalLink className="h-4 w-4" />
							</Link>
						</Button>
					)}
				</div>
			</header>

			<section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="flex items-center gap-4 p-6">
						<div className="rounded-lg bg-[#0a7ea4]/10 p-2">
							<Package className="h-6 w-6 text-[#0a7ea4]" />
						</div>
						<div>
							<p className="font-medium text-[#687076] text-sm dark:text-[#9BA1A6]">
								Pedido
							</p>
							<p className="font-semibold text-[#11181C] dark:text-[#ECEDEE]">
								{parsedOrder.orderNumber}
							</p>
						</div>
					</CardContent>
				</Card>
				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="space-y-1 p-6">
						<p className="font-medium text-[#687076] text-sm dark:text-[#9BA1A6]">
							Bodega destino
						</p>
						<p className="font-semibold text-[#11181C] dark:text-[#ECEDEE]">
							{sourceWarehouseName}
						</p>
						<p className="text-[#687076] text-sm dark:text-[#9BA1A6]">
							ID: {parsedOrder.sourceWarehouseId}
						</p>
					</CardContent>
				</Card>
				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="space-y-1 p-6">
						<p className="font-medium text-[#687076] text-sm dark:text-[#9BA1A6]">
							Productor (CEDIS)
						</p>
						<p className="font-semibold text-[#11181C] dark:text-[#ECEDEE]">
							{cedisWarehouseName}
						</p>
						<p className="text-[#687076] text-sm dark:text-[#9BA1A6]">
							ID: {parsedOrder.cedisWarehouseId || "No asignado"}
						</p>
					</CardContent>
				</Card>
				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="space-y-1 p-6">
						<p className="font-medium text-[#687076] text-sm dark:text-[#9BA1A6]">
							Artículos solicitados
						</p>
						<p className="font-semibold text-[#11181C] dark:text-[#ECEDEE]">
							{parsedOrder.itemsCount}
						</p>
					</CardContent>
				</Card>
			</section>

			<section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
				<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardHeader>
						<CardTitle className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
							Artículos solicitados
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="theme-transition rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
							<Table>
								<TableHeader>
									<TableRow className="border-[#E5E7EB] border-b dark:border-[#2D3033]">
										<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
											Producto
										</TableHead>
										<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
											Código
										</TableHead>
										<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
											Cantidad
										</TableHead>
										<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
											Notas
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
							{parsedOrder.items.map((item) => {
								const productInfo = resolveProductInfo(item.barcode);
								const productName = productInfo.name;
										return (
											<TableRow
												className="theme-transition border-[#E5E7EB] border-b last:border-b-0 dark:border-[#2D3033]"
												key={item.id}
											>
												<TableCell className="font-mono text-[#11181C] dark:text-[#ECEDEE]">
													{productName}
												</TableCell>
												<TableCell className="font-mono text-[#11181C] dark:text-[#ECEDEE]">
													{item.barcode}
												</TableCell>
												<TableCell className="text-[#11181C] dark:text-[#ECEDEE]">
													{item.quantity}
												</TableCell>
												<TableCell className="text-[#687076] text-sm dark:text-[#9BA1A6]">
													{item.notes || "Sin notas"}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
						{parsedOrder.notes && (
							<div className="mt-4 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-[#687076] dark:border-[#2D3033] dark:bg-[#1E1F20] dark:text-[#9BA1A6]">
								<strong className="block text-[#11181C] dark:text-[#ECEDEE]">
									Notas generales:
								</strong>
								{parsedOrder.notes}
							</div>
						)}
					</CardContent>
				</Card>

				<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardHeader>
						<CardTitle className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
							Cumplir pedido
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-5">
						{isEncargado ? (
							<>
								{parsedOrder.warehouseTransferId && (
									<div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
										<p className="text-amber-800 text-sm dark:text-amber-300">
											<strong>Nota:</strong> Este pedido ya tiene un traspaso
											asociado (ID:{" "}
											{parsedOrder.warehouseTransferId.slice(0, 8)}
											...). No se puede crear otro traspaso.
										</p>
									</div>
								)}
								<div className="space-y-2">
									<Label className="text-[#687076] dark:text-[#9BA1A6]">
										Prioridad
									</Label>
									<Select
										onValueChange={(value) =>
											setPriority(value as "normal" | "urgent" | "high")
										}
										value={priority}
									>
										<SelectTrigger className="input-transition border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]">
											<SelectValue placeholder="Selecciona prioridad" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="normal">Normal</SelectItem>
											<SelectItem value="high">Alta</SelectItem>
											<SelectItem value="urgent">Urgente</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-4">
									<p className="text-[#687076] text-sm dark:text-[#9BA1A6]">
										Selecciona las piezas disponibles en el CEDIS para enviar.
										El traspaso se puede generar aun cuando falten unidades por
										surtir.
									</p>
									<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
										<div className="w-full lg:max-w-sm">
											<Label
												className="text-[#687076] text-sm dark:text-[#9BA1A6]"
												htmlFor="item-search"
											>
												Buscar artículos en el CEDIS
											</Label>
											<div className="relative mt-1">
												<Search className="text-[#687076] absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 dark:text-[#9BA1A6]" />
												<Input
													className="pl-9"
													id="item-search"
													onChange={(event) =>
														setItemSearch(event.target.value)
													}
													placeholder="Nombre, código o categoría"
													value={itemSearch}
												/>
											</div>
											{hasSearchTerm && !noItemsMatchSearch && (
												<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
													{filteredItems.length} coincidencia(s) encontradas.
												</p>
											)}
											{noItemsMatchSearch && (
												<p className="text-[#B54708] text-xs dark:text-[#F7B84B]">
													No se encontraron artículos que coincidan con la
													búsqueda.
												</p>
											)}
										</div>
									</div>
									<div className="rounded-md border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-3 dark:border-[#2D3033] dark:bg-[#1E1F20]">
										<p className="text-[#11181C] text-sm dark:text-[#ECEDEE]">
											Seleccionados: {fulfillmentProgress.selected} /{" "}
											{fulfillmentProgress.requested || parsedOrder.itemsCount}
										</p>
										{hasCompleteFulfillment ? (
											<p className="text-[#10B981] text-xs">
												Pedido cubierto por completo.
											</p>
										) : fulfillmentProgress.selected > 0 ? (
											<p className="text-[#B54708] text-xs dark:text-[#F7B84B]">
												{pendingPieces} pieza(s) quedarían pendientes de envío.
											</p>
										) : (
											<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
												Puedes crear el traspaso incluso sin seleccionar artículos.
												Se marcarán como enviados con cantidad 0.
											</p>
										)}
									</div>
									{noItemsMatchSearch ? (
										<p className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-[#687076] text-sm dark:border-[#2D3033] dark:bg-[#1E1F20] dark:text-[#9BA1A6]">
											Ajusta el término de búsqueda para ubicar los artículos
											del pedido.
										</p>
									) : (
										<div className="space-y-4">
									{itemsToRender.map((item) => {
												const selectedCount = item.selectedIds.length;
												const availableCount = item.availableStocks.length;
												const remainingToSelect = Math.max(
													item.requestedQuantity - selectedCount,
													0,
												);
												const disableSelectAll =
													remainingToSelect === 0 ||
													availableCount === selectedCount;
									return (
										<div
											key={item.detailId}
											className="rounded-lg border border-[#E5E7EB] p-4 dark:border-[#2D3033]"
										>
															<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
																<div className="space-y-1">
																	<p className="font-semibold text-[#11181C] dark:text-[#ECEDEE]">
																		{item.displayName}
																	</p>
																	<div className="flex flex-wrap items-center gap-2 text-[#687076] text-xs dark:text-[#9BA1A6]">
																		<span>#{item.barcode}</span>
																		<span className="hidden sm:inline">•</span>
																		<span>{item.category}</span>
																		<span className="hidden sm:inline">•</span>
																		<span>
																			Solicitado: {item.requestedQuantity}
																		</span>
																		<span className="hidden sm:inline">•</span>
																		<span>Disponibles: {availableCount}</span>
																	</div>
																	{item.itemNotes && (
																		<p className="text-[#687076] text-xs italic dark:text-[#9BA1A6]">
																			Nota: {item.itemNotes}
																		</p>
																	)}
																</div>
																<div className="flex flex-col items-start gap-2 sm:items-end">
																	<Badge className="text-xs" variant="outline">
																		Seleccionados {selectedCount}/
																		{item.requestedQuantity}
																	</Badge>
																	<div className="flex flex-wrap items-center gap-2">
																		<Button
																			onClick={() =>
																				handleSelectAllForItem(
																					item.detailId,
																					item.requestedQuantity,
																					item.availableStocks,
																				)
																			}
																			size="sm"
																			variant="outline"
																			disabled={disableSelectAll}
																		>
																			Completar selección
																		</Button>
																		<Button
																			onClick={() =>
																				handleClearSelectionForItem(
																					item.detailId,
																				)
																			}
																			size="sm"
																			variant="ghost"
																			disabled={selectedCount === 0}
																		>
																			Limpiar
																		</Button>
											<Button
												className="gap-1"
												onClick={() => {
													setStockDialogDetailId(item.detailId);
													setStockDialogSearch("");
												}}
												size="sm"
												variant="ghost"
											>
												Ver existencias
											</Button>
																	</div>
																</div>
															</div>
														</div>
													
												);
											})}
										</div>
									)}
								</div>
								<div className="space-y-2">
									<Label
										className="text-[#687076] dark:text-[#9BA1A6]"
										htmlFor="transferNotes"
									>
										Notas del traspaso (opcional)
									</Label>
									<Textarea
										className="input-transition border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
										id="transferNotes"
										onChange={(event) => setTransferNotes(event.target.value)}
										placeholder="Añade observaciones para el traslado..."
										value={transferNotes}
									/>
								</div>
								<Button
									className="w-full bg-[#0a7ea4] text-white hover:bg-[#086885] dark:bg-[#0a7ea4] dark:hover:bg-[#0a7ea4]/80"
									disabled={
										createTransferMutation.isPending ||
										linkTransferMutation.isPending ||
										updateOrderMutation.isPending ||
										Boolean(parsedOrder?.warehouseTransferId)
									}
									onClick={handleCreateTransfer}
								>
									{createTransferMutation.isPending ||
									linkTransferMutation.isPending ||
									updateOrderMutation.isPending
										? "Procesando..."
										: parsedOrder?.warehouseTransferId
											? "Traspaso ya creado"
											: "Crear traspaso"}
								</Button>
							</>
						) : (
							<p className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-[#687076] dark:border-[#2D3033] dark:bg-[#1E1F20] dark:text-[#9BA1A6]">
								Solo los usuarios con rol de encargado pueden cumplir pedidos y
								generar traspasos.
							</p>
						)}
				</CardContent>
			</Card>
		</section>

		<Dialog onOpenChange={handleStockDialogOpenChange} open={Boolean(stockDialogDetailId)}>
			<DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
				<DialogHeader className="shrink-0">
					<DialogTitle className="text-[#11181C] dark:text-[#ECEDEE]">
						Existencias disponibles
					</DialogTitle>
				</DialogHeader>
				{stockDialogItem ? (
					<div className="flex min-h-0 flex-col space-y-4">
						<div className="shrink-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<p className="font-semibold text-[#11181C] dark:text-[#ECEDEE]">
									{stockDialogItem.displayName}
								</p>
								<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
									Código: {stockDialogItem.barcode}
								</p>
							</div>
							<Input
								className="w-full sm:w-72"
								onChange={(event) => setStockDialogSearch(event.target.value)}
								placeholder="Buscar por UUID..."
								value={stockDialogSearch}
							/>
						</div>
						<div className="min-h-0 flex-1 overflow-hidden rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
							{filteredDialogStocks.length === 0 ? (
								<p className="p-4 text-[#687076] text-sm dark:text-[#9BA1A6]">
									No hay existencias disponibles para este código en el CEDIS.
								</p>
							) : (
								<ScrollArea className="h-full max-h-[calc(90vh-12rem)]">
									<div className="space-y-2 p-2">
										{filteredDialogStocks.map((stock) => {
											const isChecked = stockDialogItem.selectedIds.includes(stock.id);
											const disableCheckbox =
												!isChecked &&
												stockDialogItem.selectedIds.length >=
													stockDialogItem.requestedQuantity;
											return (
												<div
													className="flex items-start justify-between gap-3 rounded-md border border-transparent px-3 py-2 text-[#11181C] hover:bg-[#F3F4F6] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
													key={stock.id}
												>
													<div className="flex items-start gap-3">
														<Checkbox
															checked={isChecked}
															disabled={disableCheckbox}
															onCheckedChange={() =>
																toggleSelection(
																	stockDialogItem.detailId,
																	stock.id,
																	stockDialogItem.requestedQuantity,
																)
															}
														/>
														<div>
															<p className="font-mono text-sm text-[#11181C] dark:text-[#ECEDEE]">
																{stock.id}
															</p>
															<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
																{stock.description || "Sin descripción"}
															</p>
														</div>
													</div>
													{stock.currentWarehouse && (
														<span className="text-[#687076] text-xs dark:text-[#9BA1A6]">
															Ubicación: {stock.currentWarehouse}
														</span>
													)}
												</div>
											);
										})}
									</div>
								</ScrollArea>
							)}
						</div>
					</div>
				) : (
					<p className="text-[#687076] text-sm dark:text-[#9BA1A6]">
						Selecciona un artículo para ver existencias.
					</p>
				)}
			</DialogContent>
		</Dialog>

		<Dialog onOpenChange={setShowZeroQuantityDialog} open={showZeroQuantityDialog}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="text-[#11181C] dark:text-[#ECEDEE]">
							Confirmar envío con cantidad cero
						</DialogTitle>
						<DialogDescription className="text-[#687076] dark:text-[#9BA1A6]">
							Algunos productos no tienen artículos seleccionados y se marcarán
							como enviados con cantidad 0. ¿Deseas continuar?
						</DialogDescription>
					</DialogHeader>
					<div className="max-h-60 space-y-2 overflow-y-auto">
						{getZeroQuantityItems().map((item) => (
							<div
								className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-3 dark:border-[#2D3033] dark:bg-[#1E1F20]"
								key={item.barcode}
							>
								<p className="font-medium text-[#11181C] text-sm dark:text-[#ECEDEE]">
									{item.displayName}
								</p>
								<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
									Código: {item.barcode} • Solicitado: {item.requestedQuantity}{" "}
									• Enviado: 0
								</p>
							</div>
						))}
					</div>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							onClick={handleCancelZeroQuantity}
							variant="outline"
						>
							Cancelar
						</Button>
						<Button
							className="bg-[#0a7ea4] text-white hover:bg-[#086885] dark:bg-[#0a7ea4] dark:hover:bg-[#0a7ea4]/80"
							onClick={handleConfirmZeroQuantity}
						>
							Confirmar y continuar
						</Button>
					</DialogFooter>
				</DialogContent>
		</Dialog>

		<Dialog onOpenChange={handleStockDialogOpenChange} open={Boolean(stockDialogDetailId)}>
			<DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
				<DialogHeader className="shrink-0">
					<DialogTitle className="text-[#11181C] dark:text-[#ECEDEE]">
						Existencias disponibles
					</DialogTitle>
				</DialogHeader>
				{stockDialogItem ? (
					<div className="flex min-h-0 flex-col space-y-4">
						<div className="shrink-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<p className="font-semibold text-[#11181C] dark:text-[#ECEDEE]">
									{stockDialogItem.displayName}
								</p>
								<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
									Código: {stockDialogItem.barcode}
								</p>
							</div>
							<Input
								className="w-full sm:w-72"
								onChange={(event) => setStockDialogSearch(event.target.value)}
								placeholder="Buscar por UUID..."
								value={stockDialogSearch}
							/>
						</div>
						<div className="min-h-0 flex-1 overflow-hidden rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
							{filteredDialogStocks.length === 0 ? (
								<p className="p-4 text-[#687076] text-sm dark:text-[#9BA1A6]">
									No hay existencias disponibles para este código en el CEDIS.
								</p>
							) : (
								<ScrollArea className="h-full max-h-[calc(90vh-12rem)]">
									<div className="space-y-2 p-2">
										{filteredDialogStocks.map((stock) => {
											const isChecked = stockDialogItem.selectedIds.includes(stock.id);
											const disableCheckbox =
												!isChecked &&
												stockDialogItem.selectedIds.length >=
													stockDialogItem.requestedQuantity;
											return (
												<div
													className="flex items-start justify-between gap-3 rounded-md border border-transparent px-3 py-2 text-[#11181C] hover:bg-[#F3F4F6] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
													key={stock.id}
												>
													<div className="flex items-start gap-3">
														<Checkbox
															checked={isChecked}
															disabled={disableCheckbox}
															onCheckedChange={() =>
																toggleSelection(
																	stockDialogItem.detailId,
																	stock.id,
																	stockDialogItem.requestedQuantity,
																)
															}
														/>
														<div>
															<p className="font-mono text-sm text-[#11181C] dark:text-[#ECEDEE]">
																{stock.id}
															</p>
															<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
																{stock.description || "Sin descripción"}
															</p>
														</div>
													</div>
													{stock.currentWarehouse && (
														<span className="text-[#687076] text-xs dark:text-[#9BA1A6]">
															Ubicación: {stock.currentWarehouse}
														</span>
													)}
												</div>
											);
										})}
									</div>
								</ScrollArea>
							)}
						</div>
					</div>
				) : (
					<p className="text-[#687076] text-sm dark:text-[#9BA1A6]">
						Selecciona un artículo para ver existencias.
					</p>
				)}
			</DialogContent>
		</Dialog>

		<Dialog onOpenChange={setShowZeroQuantityDialog} open={showZeroQuantityDialog}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="text-[#11181C] dark:text-[#ECEDEE]">
						Confirmar envío con cantidad cero
					</DialogTitle>
					<DialogDescription className="text-[#687076] dark:text-[#9BA1A6]">
						Algunos productos no tienen artículos seleccionados y se marcarán
						como enviados con cantidad 0. ¿Deseas continuar?
					</DialogDescription>
				</DialogHeader>
				<div className="max-h-60 space-y-2 overflow-y-auto">
					{getZeroQuantityItems().map((item) => (
						<div
							className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-3 dark:border-[#2D3033] dark:bg-[#1E1F20]"
							key={item.barcode}
						>
							<p className="font-medium text-[#11181C] text-sm dark:text-[#ECEDEE]">
								{item.displayName}
							</p>
							<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
								Código: {item.barcode} • Solicitado: {item.requestedQuantity} • Enviado: 0
							</p>
						</div>
					))}
				</div>
				<DialogFooter className="gap-2 sm:gap-0">
					<Button onClick={handleCancelZeroQuantity} variant="outline">
						Cancelar
					</Button>
					<Button
						className="bg-[#0a7ea4] text-white hover:bg-[#086885] dark:bg-[#0a7ea4] dark:hover:bg-[#0a7ea4]/80"
						onClick={handleConfirmZeroQuantity}
					>
						Confirmar y continuar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	</div>
	);
}
