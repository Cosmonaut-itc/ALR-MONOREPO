 "use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { type FormEvent, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
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
import { getAllProducts, getAllWarehouses } from "@/lib/fetch-functions/inventory";
import {
	getReplenishmentOrders,
	getReplenishmentOrdersByWarehouse,
} from "@/lib/fetch-functions/replenishment-orders";
import { createQueryKey } from "@/lib/helpers";
import {
	useCreateReplenishmentOrder,
} from "@/lib/mutations/replenishment-orders";
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

type OrderFormItem = {
	id: string;
	productValue: string;
	quantity: string;
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

export function PedidosPage({
	warehouseId,
	isEncargado,
}: PedidosPageProps) {
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [cedisWarehouseId, setCedisWarehouseId] = useState("");
	const [notes, setNotes] = useState("");
	const [formItems, setFormItems] = useState<OrderFormItem[]>([
		{ id: uuidv4(), productValue: "", quantity: "1" },
	]);

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
			.map((item) => {
				if (!item || typeof item !== "object") return null;
				const id = String((item as Record<string, unknown>).id ?? "");
				const name = String(
					(item as Record<string, unknown>).name ?? `Almacén ${id}`,
				);
				const rawCode = (item as Record<string, unknown>).code;
				const code =
					typeof rawCode === "string" && rawCode.length > 0 ? rawCode : undefined;
				return {
					id,
					name,
					...(code ? { code } : {}),
				} as WarehouseOption;
			})
			.filter((item): item is WarehouseOption => item !== null);
	}, [warehousesResponse]);

	const productOptions = useMemo<ProductOption[]>(() => {
		if (!productCatalog || typeof productCatalog !== "object") {
			return [];
		}
		if (!("data" in productCatalog) || !productCatalog.data) {
			return [];
		}
		return (productCatalog.data as Array<Record<string, unknown>>).flatMap(
			(item) => {
				if (!item || typeof item !== "object") {
					return [];
				}
				const barcodeCandidate = item.barcode ?? item.good_id;
				const barcode =
					typeof barcodeCandidate === "number"
						? barcodeCandidate
						: typeof barcodeCandidate === "string"
							? Number.parseInt(barcodeCandidate, 10)
							: undefined;
				if (!barcode || Number.isNaN(barcode)) {
					return [];
				}
				const name =
					typeof item.title === "string" && item.title.trim().length > 0
						? item.title
						: typeof item.name === "string" && item.name.trim().length > 0
							? item.name
							: `Producto ${barcode}`;
				const category =
					typeof item.category === "string" && item.category.trim().length > 0
						? item.category
						: "Sin categoría";
				const description =
					typeof item.comment === "string" && item.comment.trim().length > 0
						? item.comment
						: "";
				return [
					{
						barcode,
						name,
						category,
						description,
					} satisfies ProductOption,
				];
			},
		);
	}, [productCatalog]);

	const productValueToBarcode = useMemo(() => {
		const map = new Map<string, number>();
		for (const product of productOptions) {
			map.set(product.barcode.toString(), product.barcode);
			map.set(product.name.toLowerCase(), product.barcode);
		}
		return map;
	}, [productOptions]);

	const orders = useMemo<OrderSummary[]>(() => {
		if (!isSuccessResponse(ordersResponse)) {
			return [];
		}
		const rows = Array.isArray(ordersResponse.data)
			? ordersResponse.data
			: [];
		return rows
			.map((item) => {
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
					notes:
						typeof record.notes === "string" ? record.notes : null,
				} satisfies OrderSummary;
			})
			.filter((item): item is OrderSummary => Boolean(item?.id));
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

	const handleAddItemRow = () => {
		setFormItems((prev) => [
			...prev,
			{ id: uuidv4(), productValue: "", quantity: "1" },
		]);
	};

	const handleRemoveItemRow = (id: string) => {
		setFormItems((prev) =>
			prev.length > 1 ? prev.filter((item) => item.id !== id) : prev,
		);
	};

	const handleUpdateItem = (
		id: string,
		field: "productValue" | "quantity",
		value: string,
	) => {
		setFormItems((prev) =>
			prev.map((item) =>
				item.id === id
					? {
							...item,
							[field]: value,
					  }
					: item,
			),
		);
	};

	const resetForm = useCallback(() => {
		setFormItems([{ id: uuidv4(), productValue: "", quantity: "1" }]);
		setNotes("");
		setCedisWarehouseId("");
	}, []);

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

		const preparedItems = formItems
			.map((item) => {
				const rawQuantity = Number.parseInt(item.quantity, 10);
				const quantity = Number.isNaN(rawQuantity) ? 0 : rawQuantity;
				const barcode =
					productValueToBarcode.get(item.productValue) ??
					(Number.isFinite(Number.parseInt(item.productValue, 10))
						? Number.parseInt(item.productValue, 10)
						: undefined);
				if (!barcode || quantity <= 0) {
					return null;
				}
				return {
					barcode,
					quantity,
				};
			})
			.filter((item): item is { barcode: number; quantity: number } =>
				Boolean(item),
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
				{!isEncargado && (
					<Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
						<DialogTrigger asChild>
							<Button className="bg-[#0a7ea4] text-white hover:bg-[#086885] dark:bg-[#0a7ea4] dark:hover:bg-[#0a7ea4]/80">
								Nuevo pedido
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-2xl">
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
											onValueChange={setCedisWarehouseId}
											value={cedisWarehouseId}
										>
											<SelectTrigger className="input-transition border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]">
												<SelectValue
													placeholder="Selecciona una bodega origen"
												/>
											</SelectTrigger>
											<SelectContent>
												{warehouses.map((warehouse) => (
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
										<div className="space-y-3">
											{formItems.map((item, index) => (
												<Card
													className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]"
													key={item.id}
												>
													<CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_120px_auto]">
														<ProductCombobox
															onValueChange={(value) =>
																handleUpdateItem(item.id, "productValue", value)
															}
															placeholder="Buscar por nombre o código..."
															products={productOptions}
															value={item.productValue}
														/>
														<div className="space-y-2">
															<Label
																className="text-[#687076] text-sm dark:text-[#9BA1A6]"
																htmlFor={`quantity-${item.id}`}
															>
																Cantidad
															</Label>
															<Input
																className="input-transition border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
																id={`quantity-${item.id}`}
																min={1}
																onChange={(event) =>
																	handleUpdateItem(
																		item.id,
																		"quantity",
																		event.target.value,
																	)
																}
																type="number"
																value={item.quantity}
															/>
														</div>
														<div className="flex items-end justify-end">
															<Button
																className="text-[#687076] hover:text-[#11181C]"
																onClick={() => handleRemoveItemRow(item.id)}
																type="button"
																variant="ghost"
															>
																{index === 0 ? "Limpiar" : "Eliminar"}
															</Button>
														</div>
													</CardContent>
												</Card>
											))}
										</div>
										<Button
											className="w-full border-dashed border-[#0a7ea4] text-[#0a7ea4] hover:bg-[#0a7ea4]/5 dark:border-[#0a7ea4] dark:text-[#0a7ea4] dark:hover:bg-[#0a7ea4]/10"
											onClick={handleAddItemRow}
											type="button"
											variant="outline"
										>
											Agregar artículo
										</Button>
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
														<Link href={`/pedidos/${order.id}`}>Ver detalles</Link>
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
