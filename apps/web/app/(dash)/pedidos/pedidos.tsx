"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type {
	ColumnDef,
	ColumnFiltersState,
	PaginationState,
	SortingState,
} from "@tanstack/react-table";
import Link from "next/link";
import dynamic from "next/dynamic";
	import {
		type FormEvent,
		useCallback,
		useMemo,
		useState,
	} from "react";
import { toast } from "sonner";
import {
	DateFilter,
	type DateFilterValue,
} from "@/components/filters/DateFilter";
import { SelectFilter } from "@/components/filters/SelectFilter";
import { DataTable } from "@/components/table/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	getAllProducts,
	getAllWarehouses,
} from "@/lib/fetch-functions/inventory";
import {
	getReplenishmentOrders,
	getReplenishmentOrdersByWarehouse,
} from "@/lib/fetch-functions/replenishment-orders";
import { createQueryKey } from "@/lib/helpers";
import { useCreateReplenishmentOrder } from "@/lib/mutations/replenishment-orders";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import type {
	ProductCatalogResponse,
	ReplenishmentOrdersResponse,
} from "@/types";

type WarehousesResponse = Awaited<ReturnType<typeof getAllWarehouses>>;

type OrderListResponse = ReplenishmentOrdersResponse | null;

type OrderSummary = {
	id: string;
	orderNumber: string;
	itemsCount: number;
	createdAt: string;
	sourceWarehouseId: string;
	cedisWarehouseId: string;
	isSent: boolean;
	isReceived: boolean;
	hasRelatedTransfer: boolean;
	notes: string | null;
};

type OrderRow = OrderSummary & {
	sourceName: string;
	statusCode: "open" | "sent" | "received";
	statusLabel: string;
};

type SelectedItem = {
	barcode: number;
	name: string;
	category: string;
	quantity: number;
};

type ProductOption = {
	barcode: number;
	name: string;
	category: string;
	description: string;
};

type WarehouseOption = {
	id: string;
	name: string;
	code?: string;
	isCedis: boolean;
};

const PedidoCreateDialog = dynamic(
	() =>
		import("./pedido-create-dialog").then((mod) => mod.PedidoCreateDialog),
	{ ssr: false },
);

const STATUS_BADGE_VARIANTS: Record<
	"open" | "sent" | "received",
	"secondary" | "outline" | "default" | "destructive"
> = {
	open: "outline",
	sent: "secondary",
	received: "default",
};

/**
 * Narrow an unknown orders response into a successful response shape.
 * Uses a conservative runtime check and narrows to a subtype of the original union.
 */
function isSuccessResponse(
	response: OrderListResponse,
): response is NonNullable<OrderListResponse> & {
	success: true;
	data: unknown;
} {
	if (!response || typeof response !== "object") return false;
	// Use in-guards and runtime array check to be safe across API variants
	return (
		"success" in response &&
		(response as { success?: unknown }).success === true &&
		"data" in response &&
		Array.isArray((response as { data?: unknown }).data)
	);
}

function statusFromOrder(order: OrderSummary): "open" | "sent" | "received" {
	if (order.isReceived) {
		return "received";
	}
	if (order.isSent) {
		return "sent";
	}
	return "open";
}

type PedidosPageProps = {
	warehouseId: string;
	canManageAllWarehouses: boolean;
};

export function PedidosPage({
	warehouseId,
	canManageAllWarehouses,
}: PedidosPageProps) {
	const userRole = useAuthStore((state) => state.user?.role ?? "");
	const normalizedRole =
		typeof userRole === "string" ? userRole.toLowerCase() : "";
	const isEmployee = normalizedRole === "employee";
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [cedisWarehouseId, setCedisWarehouseId] = useState("");
	const [notes, setNotes] = useState("");
	const [sourceWarehouseId, setSourceWarehouseId] = useState(warehouseId);
	const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
	const [productSearch, setProductSearch] = useState("");
	const [itemsSearch, setItemsSearch] = useState("");
	const [ordersGlobalFilter, setOrdersGlobalFilter] = useState("");
	const [ordersSorting, setOrdersSorting] = useState<SortingState>([]);
	const [ordersColumnFilters, setOrdersColumnFilters] =
		useState<ColumnFiltersState>([]);
	const [ordersPagination, setOrdersPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	const handleSourceFilterChange = useCallback((value: string | null) => {
		setOrdersColumnFilters((prev) => {
			const next = prev.filter((f) => f.id !== "sourceName");
			if (!value) return next;
			return [...next, { id: "sourceName", value }];
		});
	}, []);

	const handleStatusFilterChange = useCallback(
		(value: "open" | "sent" | "received" | null) => {
			setOrdersColumnFilters((prev) => {
				const next = prev.filter((f) => f.id !== "statusLabel");
				if (!value) return next;
				return [...next, { id: "statusLabel", value }];
			});
		},
		[],
	);

	const handleDateFilterChange = useCallback(
		(value: DateFilterValue | null) => {
			setOrdersColumnFilters((prev) => {
				const next = prev.filter((f) => f.id !== "createdAt");
				if (!value) return next;
				return [...next, { id: "createdAt", value }];
			});
		},
		[],
	);

	const scopeKey = canManageAllWarehouses ? "all" : warehouseId || "unknown";
	const ordersQueryKey = createQueryKey(queryKeys.replenishmentOrders, [
		scopeKey,
	]);

	const statusParam = undefined;

	const { data: ordersResponse } = useSuspenseQuery<
		OrderListResponse,
		Error,
		OrderListResponse
	>({
		queryKey: ordersQueryKey,
		queryFn: () =>
			canManageAllWarehouses
				? getReplenishmentOrders(
						statusParam ? { status: statusParam } : undefined,
					)
				: warehouseId
					? getReplenishmentOrdersByWarehouse(warehouseId)
					: Promise.resolve(null),
	});

	const { data: productCatalog } = useSuspenseQuery<
		ProductCatalogResponse | null,
		Error,
		ProductCatalogResponse | null
	>({
		queryKey: queryKeys.productCatalog,
		queryFn: getAllProducts,
	});

	const { data: warehousesResponse } = useSuspenseQuery<
		WarehousesResponse,
		Error,
		WarehousesResponse
	>({
		queryKey: queryKeys.warehouses,
		queryFn: getAllWarehouses,
	});

	const mutation = useCreateReplenishmentOrder();

	const warehouses = useMemo<WarehouseOption[]>(() => {
		if (!warehousesResponse || typeof warehousesResponse !== "object") {
			return [];
		}
		if (!("data" in warehousesResponse)) {
			return [];
		}
		const data = warehousesResponse.data ?? [];
		return data
			.map((item: unknown) => {
				if (!item || typeof item !== "object") return null;
				const record = item as Record<string, unknown>;
				const id = String(record.id ?? "");
				const name = String(record.name ?? `Almacén ${id}`);
				const rawCode = record.code;
				const code =
					typeof rawCode === "string" && rawCode.length > 0
						? rawCode
						: undefined;
				const rawIsCedis = record.isCedis;
				const rawLegacyIsCedis = record.is_cedis;
				const isCedis =
					typeof rawIsCedis === "boolean"
						? rawIsCedis
						: typeof rawLegacyIsCedis === "boolean"
							? rawLegacyIsCedis
							: false;
				return {
					id,
					name,
					...(code ? { code } : {}),
					isCedis,
				} as WarehouseOption;
			})
			.filter(
				(item: WarehouseOption | null): item is WarehouseOption =>
					item !== null,
			);
	}, [warehousesResponse]);

	const cedisWarehouses = useMemo(
		() => warehouses.filter((warehouse) => warehouse.isCedis),
		[warehouses],
	);

	const requesterWarehouses = useMemo(
		() => warehouses.filter((warehouse) => !warehouse.isCedis),
		[warehouses],
	);

	const requesterFilterOptions = useMemo(
		() =>
			requesterWarehouses
				.filter((warehouse) => warehouse.id !== warehouseId)
				.map((warehouse) => ({ label: warehouse.name, value: warehouse.id })),
		[requesterWarehouses, warehouseId],
	);

	const resolvedCedisWarehouseId = useMemo(() => {
		if (
			cedisWarehouseId &&
			cedisWarehouses.some((warehouse) => warehouse.id === cedisWarehouseId)
		) {
			return cedisWarehouseId;
		}
		return cedisWarehouses[0]?.id ?? "";
	}, [cedisWarehouseId, cedisWarehouses]);

	const resolvedSourceWarehouseId = useMemo(() => {
		if (!canManageAllWarehouses) {
			return warehouseId;
		}
		if (
			sourceWarehouseId &&
			requesterWarehouses.some((warehouse) => warehouse.id === sourceWarehouseId)
		) {
			return sourceWarehouseId;
		}
		const fallback = requesterWarehouses.find((wh) => wh.id === warehouseId);
		return fallback?.id ?? requesterWarehouses[0]?.id ?? "";
	}, [canManageAllWarehouses, requesterWarehouses, sourceWarehouseId, warehouseId]);

	const productOptions = useMemo<ProductOption[]>(() => {
		if (
			!productCatalog ||
			typeof productCatalog !== "object" ||
			!("success" in productCatalog) ||
			!productCatalog.success
		) {
			return [];
		}

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

		const rawData = Array.isArray(productCatalog.data)
			? (productCatalog.data as Array<Record<string, unknown>>)
			: [];
		const options: ProductOption[] = [];
		for (const rawItem of rawData) {
			if (!rawItem || typeof rawItem !== "object") {
				continue;
			}
			const item = rawItem as Record<string, unknown>;
			const barcodeNumber =
				parseBarcode(item.barcode) ??
				parseBarcode(item.good_id) ??
				parseBarcode(item.id);
			if (barcodeNumber == null || Number.isNaN(barcodeNumber)) {
				continue;
			}
			const nameCandidate = item.title ?? item.name;
			const categoryCandidate = item.category;
			const descriptionCandidate = item.comment ?? item.description;
			options.push({
				barcode: barcodeNumber,
				name:
					typeof nameCandidate === "string" && nameCandidate.trim().length > 0
						? nameCandidate
						: `Producto ${barcodeNumber}`,
				category:
					typeof categoryCandidate === "string" &&
					categoryCandidate.trim().length > 0
						? categoryCandidate
						: "Sin categoría",
				description:
					typeof descriptionCandidate === "string" &&
					descriptionCandidate.trim().length > 0
						? descriptionCandidate
						: "Sin descripción",
			});
		}
		return options;
	}, [productCatalog]);

	const orders = useMemo<OrderSummary[]>(() => {
		if (!isSuccessResponse(ordersResponse)) {
			return [];
		}
		const rows = Array.isArray(ordersResponse.data) ? ordersResponse.data : [];
		return rows
			.map((item: unknown) => {
				if (!item || typeof item !== "object") {
					return null;
				}
				const record = item as Record<string, unknown>;
				const id = typeof record.id === "string" ? record.id : "";
				const orderNumber =
					typeof record.orderNumber === "string" ? record.orderNumber : id;
				if (!id) {
					return null;
				}
				const rawItems = record.items;
				let itemsCount = 0;
				if (typeof record.itemsCount === "number") {
					itemsCount = record.itemsCount;
				} else if (
					typeof record.itemsCount === "string" &&
					record.itemsCount.trim().length > 0
				) {
					const parsed = Number.parseInt(record.itemsCount, 10);
					if (!Number.isNaN(parsed)) {
						itemsCount = parsed;
					} else if (Array.isArray(rawItems)) {
						itemsCount = rawItems.length;
					}
				} else if (Array.isArray(rawItems)) {
					itemsCount = rawItems.length;
				}
				return {
					id,
					orderNumber,
					itemsCount,
					createdAt:
						typeof record.createdAt === "string" ? record.createdAt : "",
					sourceWarehouseId:
						typeof record.sourceWarehouseId === "string"
							? record.sourceWarehouseId
							: "",
					cedisWarehouseId:
						typeof record.cedisWarehouseId === "string"
							? record.cedisWarehouseId
							: "",
					isSent: Boolean(record.isSent),
					isReceived: Boolean(record.isReceived),
					hasRelatedTransfer: Boolean(record.hasRelatedTransfer),
					notes: typeof record.notes === "string" ? record.notes : null,
				} satisfies OrderSummary;
			})
			.filter((item: OrderSummary | null): item is OrderSummary =>
				Boolean(item?.id),
			);
	}, [ordersResponse]);

	const filteredOrders = useMemo(() => {
		return orders;
	}, [orders]);

	const warehouseNameMap = useMemo(() => {
		const entries = new Map<string, string>();
		for (const warehouse of warehouses) {
			if (!entries.has(warehouse.id)) {
				entries.set(
					warehouse.id,
					warehouse.name ||
						(warehouse.code
							? `${warehouse.code} (${warehouse.id.slice(0, 6)})`
							: `Almacén ${warehouse.id.slice(0, 6)}`),
				);
			}
		}
		return entries;
	}, [warehouses]);

	const selectedCedisName = useMemo(() => {
		if (!resolvedCedisWarehouseId) {
			return "";
		}
		return (
			warehouseNameMap.get(resolvedCedisWarehouseId) ??
			`Bodega ${resolvedCedisWarehouseId.slice(0, 6)}`
		);
	}, [resolvedCedisWarehouseId, warehouseNameMap]);

	const selectedRequesterName = useMemo(() => {
		if (!resolvedSourceWarehouseId) {
			return "";
		}
		return (
			warehouseNameMap.get(resolvedSourceWarehouseId) ??
			`Bodega ${resolvedSourceWarehouseId.slice(0, 6)}`
		);
	}, [resolvedSourceWarehouseId, warehouseNameMap]);

	const requesterWarehouseLabel =
		selectedRequesterName ||
		(warehouseId ? `Bodega ${warehouseId.slice(0, 6)}` : "Sin bodega asignada");

	const ordersTableData = useMemo<OrderRow[]>(() => {
		return filteredOrders.map((order) => {
			const statusCode = statusFromOrder(order);
			const sourceName =
				warehouseNameMap.get(order.sourceWarehouseId) ??
				`Bodega ${order.sourceWarehouseId.slice(0, 6)}`;
			return {
				...order,
				sourceName,
				statusCode,
				statusLabel:
					statusCode === "open"
						? "Abierto"
						: statusCode === "sent"
							? "Enviado"
							: "Recibido",
			};
		});
	}, [filteredOrders, warehouseNameMap]);

	const ordersColumns = useMemo<ColumnDef<OrderRow>[]>(() => {
		return [
			{
				accessorKey: "orderNumber",
				header: "Pedido",
				cell: ({ row }) => (
					<Link
						className="text-[#0a7ea4] underline-offset-4 hover:underline"
						href={`/pedidos/${row.original.id}`}
					>
						{row.original.orderNumber}
					</Link>
				),
			},
			{
				accessorKey: "sourceName",
				header: "Bodega origen",
				filterFn: (row, _columnId, value) => {
					if (!value) return true;
					return row.original.sourceWarehouseId === value;
				},
			},
			{
				accessorKey: "itemsCount",
				header: "Artículos",
				cell: ({ row }) => row.original.itemsCount,
			},
			{
				accessorKey: "createdAt",
				header: "Creado",
				cell: ({ row }) => {
					const value = row.getValue<string>("createdAt");
					if (!value || typeof value !== "string") {
						return "N/A";
					}
					// Extract yyyy-mm-dd from ISO string
					return value.slice(0, 10);
				},
				filterFn: (row, columnId, filterValue) => {
					if (!filterValue || typeof filterValue !== "object") return true;
					const value = row.getValue<string>(columnId);
					if (!value || typeof value !== "string") return true;
					const rowDate = new Date(`${value.slice(0, 10)}T00:00:00Z`);
					if (Number.isNaN(rowDate.getTime())) return true;
					const { mode, from, to } = filterValue as DateFilterValue;
					const fromDate = from ? new Date(`${from}T00:00:00Z`) : null;
					const toDate = to ? new Date(`${to}T00:00:00Z`) : null;
					switch (mode) {
						case "before":
							return fromDate ? rowDate.getTime() < fromDate.getTime() : true;
						case "after":
							return fromDate ? rowDate.getTime() > fromDate.getTime() : true;
						case "between":
							return fromDate && toDate
								? rowDate.getTime() >= fromDate.getTime() &&
										rowDate.getTime() <= toDate.getTime()
								: true;
						case "on":
							return fromDate ? rowDate.getTime() === fromDate.getTime() : true;
						default:
							return true;
					}
				},
			},
			{
				accessorKey: "statusLabel",
				header: "Estado",
				cell: ({ row }) => {
					const badgeVariant = STATUS_BADGE_VARIANTS[row.original.statusCode];
					return (
						<Badge variant={badgeVariant}>{row.original.statusLabel}</Badge>
					);
				},
				enableSorting: false,
				filterFn: (row, _columnId, value) => {
					if (!value) return true;
					return row.original.statusCode === value;
				},
			},
			{
				id: "actions",
				header: "Acciones",
				enableSorting: false,
				cell: ({ row }) => (
					<Button
						asChild
						className="border-[#0a7ea4] text-[#0a7ea4] hover:bg-[#0a7ea4]/10 dark:border-[#0a7ea4] dark:text-[#0a7ea4]"
						size="sm"
						variant="outline"
					>
						<Link href={`/pedidos/${row.original.id}`}>Ver detalles</Link>
					</Button>
				),
			},
		];
	}, []);

	const cedisOptions =
		cedisWarehouses.length > 0 ? cedisWarehouses : warehouses;

	const requesterSelectDisabled = requesterWarehouses.length <= 1;
	const isCedisSelectDisabled = cedisWarehouses.length >= 1;

	const handleSelectProduct = useCallback(
		(product: { barcode: number; name: string; category: string }) => {
			setSelectedItems((prev) => {
				const existingIndex = prev.findIndex(
					(item) => item.barcode === product.barcode,
				);
				if (existingIndex !== -1) {
					return prev.map((item, index) =>
						index === existingIndex
							? { ...item, quantity: item.quantity + 1 }
							: item,
					);
				}
				return [
					...prev,
					{
						barcode: product.barcode,
						name: product.name,
						category: product.category,
						quantity: 1,
					},
				];
			});
		},
		[],
	);

	const handleQuantityChange = useCallback((barcode: number, value: string) => {
		const parsed = Number.parseInt(value, 10);
		setSelectedItems((prev) =>
			prev.map((item) =>
				item.barcode === barcode
					? {
							...item,
							quantity: Number.isNaN(parsed) ? 1 : Math.max(1, parsed),
						}
					: item,
			),
		);
	}, []);

	const handleRemoveItem = useCallback((barcode: number) => {
		setSelectedItems((prev) => prev.filter((item) => item.barcode !== barcode));
	}, []);

	const filteredSelectedItems = useMemo(() => {
		const query = itemsSearch.trim().toLowerCase();
		if (!query) {
			return selectedItems;
		}
		return selectedItems.filter((item) => {
			const nameMatches = item.name.toLowerCase().includes(query);
			const categoryMatches = item.category.toLowerCase().includes(query);
			const barcodeMatches = item.barcode.toString().includes(query);
			return nameMatches || categoryMatches || barcodeMatches;
		});
	}, [itemsSearch, selectedItems]);

	const resetForm = useCallback(() => {
		setSelectedItems([]);
		setNotes("");
		setItemsSearch("");
		setProductSearch("");
		if (cedisWarehouses.length < 1) {
			setCedisWarehouseId("");
		} else {
			setCedisWarehouseId(cedisWarehouses[0]?.id ?? "");
		}
		if (canManageAllWarehouses) {
			const fallbackRequester = requesterWarehouses.find(
				(wh) => wh.id === warehouseId,
			);
			setSourceWarehouseId(
				fallbackRequester?.id ??
					requesterWarehouses[0]?.id ??
					warehouseId ??
					"",
			);
		} else {
			setSourceWarehouseId(warehouseId);
		}
	}, [
		cedisWarehouses,
		canManageAllWarehouses,
		requesterWarehouses,
		warehouseId,
	]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const effectiveSourceWarehouseId = canManageAllWarehouses
			? resolvedSourceWarehouseId
			: warehouseId;

		if (!effectiveSourceWarehouseId) {
			toast.error("Selecciona la bodega solicitante antes de crear el pedido.");
			return;
		}
		if (!resolvedCedisWarehouseId) {
			toast.error("Selecciona el CEDIS que surtirá este pedido.");
			return;
		}

		const preparedItems = selectedItems
			.map((item) => ({
				barcode: item.barcode,
				quantity: item.quantity,
			}))
			.filter(
				(item) =>
					Number.isFinite(item.quantity) &&
					typeof item.quantity === "number" &&
					item.quantity > 0,
			);

		if (preparedItems.length === 0) {
			toast.error(
				"Agrega al menos un artículo con un código válido y cantidad mayor a cero.",
			);
			return;
		}

		try {
			await mutation.mutateAsync({
				sourceWarehouseId: effectiveSourceWarehouseId,
				cedisWarehouseId: resolvedCedisWarehouseId,
				items: preparedItems,
				notes: notes.trim().length > 0 ? notes.trim() : undefined,
			});
			setIsDialogOpen(false);
			resetForm();
		} catch (error) {
			if (error instanceof Error && error.message) {
				toast.error(error.message);
			}
		}
	};

	const isNonInteractive = !canManageAllWarehouses && !warehouseId;

	return (
		<div className="theme-transition flex-1 space-y-6 bg-white p-4 md:p-6 dark:bg-[#151718]">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="font-bold text-2xl text-[#11181C] text-transition md:text-3xl dark:text-[#ECEDEE]">
						Pedidos
					</h1>
					<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
						Visualiza y administra las solicitudes de reabastecimiento.
					</p>
				</div>
				<Button
					className="bg-[#0a7ea4] text-white hover:bg-[#086885] dark:bg-[#0a7ea4] dark:hover:bg-[#0a7ea4]/80"
					onClick={() => setIsDialogOpen(true)}
					type="button"
				>
					Nuevo pedido
				</Button>
			</div>
			{isDialogOpen && (
				<PedidoCreateDialog
					canManageAllWarehouses={canManageAllWarehouses}
					cedisOptions={cedisOptions}
					cedisWarehouseId={resolvedCedisWarehouseId}
					filteredSelectedItems={filteredSelectedItems}
					isCedisSelectDisabled={isCedisSelectDisabled}
					isEmployee={isEmployee}
					isPending={mutation.isPending}
					itemsSearch={itemsSearch}
					notes={notes}
					onCedisChange={setCedisWarehouseId}
					onItemsSearchChange={setItemsSearch}
					onNotesChange={setNotes}
					onOpenChange={setIsDialogOpen}
					onProductSearchChange={setProductSearch}
					onQuantityChange={handleQuantityChange}
					onRemoveItem={handleRemoveItem}
					onSelectProduct={handleSelectProduct}
					onSourceChange={setSourceWarehouseId}
					onSubmit={handleSubmit}
					open={isDialogOpen}
					productOptions={productOptions}
					productSearch={productSearch}
					requesterSelectDisabled={requesterSelectDisabled}
					requesterWarehouses={requesterWarehouses}
					requesterWarehouseLabel={requesterWarehouseLabel}
					selectedCedisName={selectedCedisName}
					selectedItems={selectedItems}
					selectedRequesterName={selectedRequesterName}
					sourceWarehouseId={resolvedSourceWarehouseId}
				/>
			)}

			<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<CardHeader>
					<CardTitle className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
						Listado de pedidos
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<SelectFilter
							label="Bodega origen"
							onChange={handleSourceFilterChange}
							options={requesterFilterOptions}
							value={
								(ordersColumnFilters.find((f) => f.id === "sourceName")
									?.value as string | undefined) ?? null
							}
						/>
						<SelectFilter
							label="Estado"
							onChange={handleStatusFilterChange}
							options={[
								{ label: "Abierto", value: "open" },
								{ label: "Enviado", value: "sent" },
								{ label: "Recibido", value: "received" },
							]}
							value={
								(ordersColumnFilters.find((f) => f.id === "statusLabel")
									?.value as "open" | "sent" | "received" | undefined) ?? null
							}
						/>
						<DateFilter
							label="Fecha de creación"
							onChange={handleDateFilterChange}
							value={
								(ordersColumnFilters.find((f) => f.id === "createdAt")?.value as
									| DateFilterValue
									| undefined) ?? null
							}
						/>
					</div>

					{ordersTableData.length === 0 ? (
						<div className="py-10 text-center text-[#687076] dark:text-[#9BA1A6]">
							{isNonInteractive
								? "Tu usuario no tiene una bodega asignada. Contacta al administrador."
								: "No hay pedidos que coincidan con el filtro seleccionado."}
						</div>
					) : (
						<DataTable<OrderRow, unknown>
							columns={ordersColumns}
							data={ordersTableData}
							enableFiltering
							globalFilter={ordersGlobalFilter}
							globalFilterPlaceholder="Buscar por pedido, bodega o estado..."
							onGlobalFilterChange={setOrdersGlobalFilter}
							onPaginationChange={setOrdersPagination}
							onSortingChange={setOrdersSorting}
							onColumnFiltersChange={setOrdersColumnFilters}
							columnFilters={ordersColumnFilters}
							pagination={ordersPagination}
							sorting={ordersSorting}
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
