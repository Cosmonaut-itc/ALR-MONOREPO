"use client";
"use memo";

import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { toast } from "sonner";
import { ProductCombobox } from "@/components/inventory/ProductCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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
import type {
	ProductCatalogResponse,
	ReplenishmentOrdersResponse,
} from "@/types";

type WarehousesResponse = Awaited<ReturnType<typeof getAllWarehouses>>;

type StatusFilter = "all" | "open" | "sent" | "received";

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

const STATUS_BADGE_VARIANTS: Record<
	"open" | "sent" | "received",
	"secondary" | "outline" | "default" | "destructive"
> = {
	open: "outline",
	sent: "secondary",
	received: "default",
};

const statusOptions: Array<{ label: string; value: StatusFilter }> = [
	{ label: "Todos", value: "all" },
	{ label: "Abiertos", value: "open" },
	{ label: "Enviados", value: "sent" },
	{ label: "Recibidos", value: "received" },
];

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

function formatDate(value: string | null | undefined) {
	if (!value) {
		return "Sin fecha";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "Sin fecha";
	}
	return format(date, "dd MMM yyyy", { locale: es });
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

function getOrderIdentifier(order: OrderSummary) {
	return order.orderNumber || order.id;
}

type PedidosPageProps = {
	warehouseId: string;
	isEncargado: boolean;
};

export function PedidosPage({ warehouseId, isEncargado }: PedidosPageProps) {
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [cedisWarehouseId, setCedisWarehouseId] = useState("");
	const [notes, setNotes] = useState("");
	const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
	const [productSearch, setProductSearch] = useState("");
	const [itemsSearch, setItemsSearch] = useState("");

	const scopeKey = isEncargado ? "all" : warehouseId || "unknown";
	const ordersQueryKey = isEncargado
		? createQueryKey(queryKeys.replenishmentOrders, [scopeKey, statusFilter])
		: createQueryKey(queryKeys.replenishmentOrders, [scopeKey]);

	const statusParam =
		isEncargado && statusFilter !== "all"
			? (statusFilter as Exclude<StatusFilter, "all">)
			: undefined;

	const { data: ordersResponse } = useSuspenseQuery<
		OrderListResponse,
		Error,
		OrderListResponse
	>({
		queryKey: ordersQueryKey,
		queryFn: () =>
			isEncargado
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
				const rawIsCedis = record["isCedis"];
				const rawLegacyIsCedis = record["is_cedis"];
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

	useEffect(() => {
		if (cedisWarehouses.length >= 1) {
			setCedisWarehouseId((prev) => {
				if (
					prev &&
					cedisWarehouses.some((warehouse) => warehouse.id === prev)
				) {
					return prev;
				}
				return cedisWarehouses[0]?.id ?? prev ?? "";
			});
		}
	}, [cedisWarehouses]);

	const productOptions = useMemo<ProductOption[]>(() => {
		if (
			!productCatalog ||
			typeof productCatalog !== "object" ||
			!("success" in productCatalog) ||
			!productCatalog.success
		) {
			return [];
		}
		const rawData = Array.isArray(productCatalog.data)
			? (productCatalog.data as Array<Record<string, unknown>>)
			: [];
		const options: ProductOption[] = [];
		for (const rawItem of rawData) {
			if (!rawItem || typeof rawItem !== "object") {
				continue;
			}
			const item = rawItem as Record<string, unknown>;
			const barcodeRaw = item.barcode;
			const fallbackBarcode = item.good_id;
			let barcodeNumber: number | null = null;
			if (typeof barcodeRaw === "string" && barcodeRaw.trim().length > 0) {
				const parsed = Number.parseInt(barcodeRaw, 10);
				if (!Number.isNaN(parsed)) {
					barcodeNumber = parsed;
				}
			} else if (typeof fallbackBarcode === "number") {
				barcodeNumber = fallbackBarcode;
			}
			if (barcodeNumber == null || Number.isNaN(barcodeNumber)) {
				continue;
			}
			const nameCandidate = item.title ?? item.name;
			const categoryCandidate = item.category;
			const descriptionCandidate = item.comment;
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
				return {
					id,
					orderNumber,
					itemsCount:
						typeof record.itemsCount === "number" ? record.itemsCount : 0,
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
		if (statusFilter === "all" || isEncargado) {
			return orders;
		}
		return orders.filter((order) => statusFromOrder(order) === statusFilter);
	}, [orders, statusFilter, isEncargado]);

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
		if (!cedisWarehouseId) {
			return "";
		}
		return (
			warehouseNameMap.get(cedisWarehouseId) ??
			`Bodega ${cedisWarehouseId.slice(0, 6)}`
		);
	}, [cedisWarehouseId, warehouseNameMap]);

	const cedisOptions =
		cedisWarehouses.length > 0 ? cedisWarehouses : warehouses;
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
	}, [cedisWarehouses]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!warehouseId) {
			toast.error(
				"No se encontró la bodega del usuario. Contacta al administrador.",
			);
			return;
		}
		if (!cedisWarehouseId) {
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
				sourceWarehouseId: warehouseId,
				cedisWarehouseId,
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

	const isEncargadoNonInteractive = !isEncargado && !warehouseId;

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
				{isEncargado && (
					<Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
						<DialogTrigger asChild>
							<Button className="bg-[#0a7ea4] text-white hover:bg-[#086885] dark:bg-[#0a7ea4] dark:hover:bg-[#0a7ea4]/80">
								Nuevo pedido
							</Button>
						</DialogTrigger>
						<DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
							<form className="space-y-6" onSubmit={handleSubmit}>
								<DialogHeader>
									<DialogTitle>Crear pedido de reabastecimiento</DialogTitle>
									<DialogDescription>
										Solicita artículos al centro de distribución para tu bodega.
									</DialogDescription>
								</DialogHeader>
								<div className="space-y-4">
									<div className="space-y-2">
										<Label className="text-[#11181C] dark:text-[#ECEDEE]">
											CEDIS origen
										</Label>
										<Select
											disabled={isCedisSelectDisabled}
											onValueChange={setCedisWarehouseId}
											value={cedisWarehouseId}
										>
											<SelectTrigger className="input-transition border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]">
												<SelectValue placeholder="Selecciona una bodega origen" />
											</SelectTrigger>
											<SelectContent>
												{cedisOptions.map((warehouse) => (
													<SelectItem key={warehouse.id} value={warehouse.id}>
														{warehouse.name}
														{warehouse.code ? ` • ${warehouse.code}` : ""}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{selectedCedisName && (
											<p className="text-[#687076] text-sm dark:text-[#9BA1A6]">
												Se solicitará al CEDIS:{" "}
												<span className="font-medium">{selectedCedisName}</span>
											</p>
										)}
									</div>
									<div className="space-y-3">
										<Label className="text-[#11181C] dark:text-[#ECEDEE]">
											Artículos
										</Label>
										<ProductCombobox
											onSelectProduct={handleSelectProduct}
											onValueChange={setProductSearch}
											placeholder="Buscar por nombre o código..."
											products={productOptions}
											value={productSearch}
										/>
										<div className="space-y-2">
											<Label
												className="text-[#11181C] dark:text-[#ECEDEE]"
												htmlFor="selected-items-search"
											>
												Buscar en la lista
											</Label>
											<Input
												className="input-transition border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
												id="selected-items-search"
												onChange={(event) => setItemsSearch(event.target.value)}
												placeholder="Filtra por nombre, código o categoría..."
												value={itemsSearch}
											/>
										</div>
										<div className="max-h-[50vh] overflow-y-auto rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
											<ScrollArea className="max-h-[50vh]">
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
																Categoría
															</TableHead>
															<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
																Cantidad
															</TableHead>
															<TableHead className="text-right text-[#11181C] text-transition dark:text-[#ECEDEE]">
																Acción
															</TableHead>
														</TableRow>
													</TableHeader>

													<TableBody>
														{filteredSelectedItems.length === 0 ? (
															<TableRow>
																<TableCell
																	className="py-8 text-center text-[#687076] dark:text-[#9BA1A6]"
																	colSpan={5}
																>
																	{selectedItems.length === 0
																		? "Añade artículos usando el buscador superior."
																		: "No se encontraron artículos que coincidan con la búsqueda."}
																</TableCell>
															</TableRow>
														) : (
															filteredSelectedItems.map((item) => (
																<TableRow
																	className="theme-transition border-[#E5E7EB] border-b last:border-b-0 dark:border-[#2D3033]"
																	key={item.barcode}
																>
																	<TableCell className="font-medium text-[#11181C] dark:text-[#ECEDEE]">
																		{item.name}
																	</TableCell>
																	<TableCell className="font-mono text-[#11181C] dark:text-[#ECEDEE]">
																		{item.barcode}
																	</TableCell>
																	<TableCell className="text-[#687076] dark:text-[#9BA1A6]">
																		{item.category}
																	</TableCell>
																	<TableCell className="text-[#11181C] dark:text-[#ECEDEE]">
																		<Input
																			className="input-transition w-24 border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
																			min={1}
																			onChange={(event) =>
																				handleQuantityChange(
																					item.barcode,
																					event.target.value,
																				)
																			}
																			type="number"
																			value={item.quantity}
																		/>
																	</TableCell>
																	<TableCell className="text-right">
																		<Button
																			className="text-[#687076] hover:text-[#11181C] dark:text-[#9BA1A6] dark:hover:text-[#ECEDEE]"
																			onClick={() =>
																				handleRemoveItem(item.barcode)
																			}
																			type="button"
																			variant="ghost"
																		>
																			Eliminar
																		</Button>
																	</TableCell>
																</TableRow>
															))
														)}
													</TableBody>
												</Table>
											</ScrollArea>
										</div>
									</div>
									<div className="space-y-2">
										<Label
											className="text-[#11181C] dark:text-[#ECEDEE]"
											htmlFor="order-notes"
										>
											Notas (opcional)
										</Label>
										<Textarea
											className="input-transition min-h-[96px] border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
											id="order-notes"
											onChange={(event) => setNotes(event.target.value)}
											placeholder="Añade comentarios para el centro de distribución..."
											value={notes}
										/>
									</div>
								</div>
								<DialogFooter>
									<Button
										className="bg-[#0a7ea4] text-white hover:bg-[#086885] dark:bg-[#0a7ea4] dark:hover:bg-[#0a7ea4]/80"
										disabled={mutation.isPending}
										type="submit"
									>
										{mutation.isPending ? "Creando..." : "Crear pedido"}
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				)}
			</div>

			<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<CardTitle className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
						Listado de pedidos
					</CardTitle>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<Select
							onValueChange={(value: StatusFilter) => setStatusFilter(value)}
							value={statusFilter}
						>
							<SelectTrigger className="input-transition w-full border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] sm:w-48">
								<SelectValue placeholder="Filtrar por estado" />
							</SelectTrigger>
							<SelectContent>
								{statusOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardHeader>
				<CardContent>
					<div className="theme-transition rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
						<Table>
							<TableHeader>
								<TableRow className="border-[#E5E7EB] border-b dark:border-[#2D3033]">
									<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Pedido
									</TableHead>
									<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Bodega origen
									</TableHead>
									<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Artículos
									</TableHead>
									<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Creado
									</TableHead>
									<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Estado
									</TableHead>
									<TableHead className="text-right text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Acciones
									</TableHead>
								</TableRow>
							</TableHeader>

							<TableBody>
								{filteredOrders.length === 0 ? (
									<TableRow>
										<TableCell
											className="py-10 text-center text-[#687076] dark:text-[#9BA1A6]"
											colSpan={6}
										>
											{isEncargadoNonInteractive
												? "Tu usuario no tiene una bodega asignada. Contacta al administrador."
												: "No hay pedidos que coincidan con el filtro seleccionado."}
										</TableCell>
									</TableRow>
								) : (
									filteredOrders.map((order) => {
										const status = statusFromOrder(order);
										const badgeVariant = STATUS_BADGE_VARIANTS[status];
										const sourceName =
											warehouseNameMap.get(order.sourceWarehouseId) ??
											`Bodega ${order.sourceWarehouseId.slice(0, 6)}`;
										return (
											<TableRow
												className="theme-transition border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]"
												key={order.id}
											>
												<TableCell className="font-medium text-[#11181C] dark:text-[#ECEDEE]">
													{getOrderIdentifier(order)}
												</TableCell>
												<TableCell className="text-[#687076] dark:text-[#9BA1A6]">
													{sourceName}
												</TableCell>
												<TableCell className="text-[#11181C] dark:text-[#ECEDEE]">
													{order.itemsCount}
												</TableCell>
												<TableCell className="text-[#687076] dark:text-[#9BA1A6]">
													{formatDate(order.createdAt)}
												</TableCell>
												<TableCell>
													<Badge variant={badgeVariant}>
														{status === "open"
															? "Abierto"
															: status === "sent"
																? "Enviado"
																: "Recibido"}
													</Badge>
												</TableCell>
												<TableCell className="text-right">
													<Button
														asChild
														className="border-[#0a7ea4] text-[#0a7ea4] hover:bg-[#0a7ea4]/10 dark:border-[#0a7ea4] dark:text-[#0a7ea4]"
														size="sm"
														variant="outline"
													>
														<Link href={`/pedidos/${order.id}`}>
															Ver detalles
														</Link>
													</Button>
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
