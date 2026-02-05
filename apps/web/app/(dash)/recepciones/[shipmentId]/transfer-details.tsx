"use memo";
"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, CheckCircle2, Package } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/shallow";
import { Badge } from "@/components/ui/badge";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getCabinetWarehouse } from "@/lib/fetch-functions/inventory";
import { getAllProducts } from "@/lib/fetch-functions/products";
import { getTransferDetailsById } from "@/lib/fetch-functions/recepciones";
import {
	getReplenishmentOrderById,
	getReplenishmentOrders,
	getReplenishmentOrdersByWarehouse,
} from "@/lib/fetch-functions/replenishment-orders";
import { createQueryKey } from "@/lib/helpers";
import {
	type UpdateTransferItemStatusPayload,
	type UpdateTransferStatusPayload,
	useUpdateTransferItemStatus,
	useUpdateTransferStatus,
} from "@/lib/mutations/transfers";
import { queryKeys } from "@/lib/query-keys";
import { cn, createWarehouseOptions } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useReceptionStore } from "@/stores/reception-store";
import type {
	ProductCatalogItem,
	ProductCatalogResponse,
	ReplenishmentOrderDetail,
	ReplenishmentOrdersResponse,
	WarehouseMap,
	WarehouseTransferDetails,
} from "@/types";

// =============================
// Component
// =============================

interface PageProps {
	shipmentId: string;
	warehouseId: string;
	isEncargado: boolean;
}

type APIResponse = WarehouseTransferDetails | null;

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

/**
 * Renders the reception detail view for a specific transfer, allowing viewing and updating receipt status of items.
 *
 * @param shipmentId - The identifier of the transfer shipment to display
 * @param warehouseId - The identifier of the warehouse where the transfer is being received
 * @returns The component's JSX for the reception detail page, including progress, item list, and controls to mark items received
 */
export function ReceptionDetailPage({
	shipmentId,
	warehouseId,
	isEncargado,
}: PageProps) {
	const router = useRouter();
	const { data: transferDetails } = useSuspenseQuery<
		APIResponse,
		Error,
		APIResponse
	>({
		queryKey: createQueryKey(queryKeys.recepcionDetail, [shipmentId as string]),
		queryFn: () => getTransferDetailsById(shipmentId as string),
	});
	const { data: productCatalog } = useSuspenseQuery<
		ProductCatalogResponse | null,
		Error,
		ProductCatalogResponse | null
	>({
		queryKey: queryKeys.productCatalog,
		queryFn: getAllProducts,
	});

	const { data: cabinetWarehouse } = useSuspenseQuery<
		WarehouseMap,
		Error,
		WarehouseMap
	>({
		queryKey: queryKeys.cabinetWarehouse,
		queryFn: getCabinetWarehouse,
	});

	// Fetch replenishment orders to find the one linked to this transfer
	const replenishmentOrdersQueryFn = isEncargado
		? () => getReplenishmentOrders()
		: () => getReplenishmentOrdersByWarehouse(warehouseId);
	const { data: replenishmentOrdersResponse } = useSuspenseQuery<
		ReplenishmentOrdersResponse | null,
		Error,
		ReplenishmentOrdersResponse | null
	>({
		queryKey: createQueryKey(queryKeys.replenishmentOrders, [
			isEncargado ? "all" : warehouseId,
		]),
		queryFn: replenishmentOrdersQueryFn,
	});

	const {
		items,
		setItems,
		toggleReceived,
		markAllReceived,
		getReceivedCount,
		getTotalCount,
		isAllReceived,
	} = useReceptionStore(
		useShallow((state) => ({
			items: state.items,
			setItems: state.setItems,
			toggleReceived: state.toggleReceived,
			markAllReceived: state.markAllReceived,
			getReceivedCount: state.getReceivedCount,
			getTotalCount: state.getTotalCount,
			isAllReceived: state.isAllReceived,
		})),
	);

	const { user } = useAuthStore(
		useShallow((state) => ({
			user: state.user,
		})),
	);

	// Mutations for updating transfer and item statuses
	const { mutateAsync: updateTransferStatus } = useUpdateTransferStatus();
	const { mutateAsync: updateItemStatus } = useUpdateTransferItemStatus();

	// Seed store with derived items when data changes
	useEffect(() => {
		setItems(
			transferDetails && "data" in transferDetails
				? transferDetails.data.details
				: [],
		);
	}, [setItems, transferDetails]);

	const generalTransferDetails = useMemo(() => {
		return transferDetails && "data" in transferDetails
			? transferDetails.data.transfer
			: null;
	}, [transferDetails]);
	const canReceiveTransfer =
		user?.role === "admin" ||
		(warehouseId &&
			generalTransferDetails?.destinationWarehouseId === warehouseId);

	// Find the replenishment order ID linked to this transfer
	const linkedOrderId = useMemo(() => {
		if (!generalTransferDetails?.id) {
			return null;
		}
		const transferId = generalTransferDetails.id;

		if (
			!replenishmentOrdersResponse ||
			typeof replenishmentOrdersResponse !== "object" ||
			!("success" in replenishmentOrdersResponse) ||
			!replenishmentOrdersResponse.success ||
			!Array.isArray(replenishmentOrdersResponse.data)
		) {
			return null;
		}

		for (const order of replenishmentOrdersResponse.data) {
			if (!order || typeof order !== "object") {
				continue;
			}
			const record = order as Record<string, unknown>;
			const warehouseTransferId =
				typeof record.warehouseTransferId === "string"
					? record.warehouseTransferId
					: null;
			const id = typeof record.id === "string" ? record.id : "";

			if (warehouseTransferId === transferId && id) {
				return id;
			}
		}

		return null;
	}, [generalTransferDetails, replenishmentOrdersResponse]);

	// Fetch full order details if linked
const { data: fullOrderResponse } = useSuspenseQuery<
	ReplenishmentOrderDetail | null,
	Error,
	ReplenishmentOrderDetail | null
>({
		queryKey: createQueryKey(queryKeys.replenishmentOrderDetail, [
			linkedOrderId ?? "none",
		]),
	queryFn: () =>
		linkedOrderId
			? getReplenishmentOrderById(linkedOrderId)
			: Promise.resolve(null),
});

	const productInfoByBarcode = useMemo(() => {
		const map = new Map<number, { name: string }>();
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
				const nameCandidate =
					typeof rawProduct.title === "string" &&
					rawProduct.title.trim().length > 0
						? rawProduct.title.trim()
						: `Producto ${parsedBarcode}`;
				if (!map.has(parsedBarcode)) {
					map.set(parsedBarcode, { name: nameCandidate });
				}
			}
		}
		return map;
	}, [productCatalog]);

	const resolveProductName = useCallback(
		(barcode: number) =>
			productInfoByBarcode.get(barcode)?.name ?? `Producto ${barcode}`,
		[productInfoByBarcode],
	);

	// Parse the full replenishment order details
	const parsedOrder = useMemo(() => {
		if (!fullOrderResponse || typeof fullOrderResponse !== "object") {
			return null;
		}

		const record = fullOrderResponse as Record<string, unknown>;
		if (!("success" in record) || !record.success || !("data" in record)) {
			return null;
		}

		const data = record.data as Record<string, unknown>;
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
			sourceWarehouseId:
				typeof data.sourceWarehouseId === "string"
					? data.sourceWarehouseId
					: "",
			cedisWarehouseId:
				typeof data.cedisWarehouseId === "string" ? data.cedisWarehouseId : "",
			isSent: Boolean(data.isSent),
			isReceived: Boolean(data.isReceived),
			items: details
				.map((detail) => {
					if (!detail || typeof detail !== "object") {
						return null;
					}
					const detailRecord = detail as Record<string, unknown>;
					const barcode =
						typeof detailRecord.barcode === "number"
							? detailRecord.barcode
							: typeof detailRecord.barcode === "string"
								? Number.parseInt(detailRecord.barcode, 10)
								: undefined;
					const quantityRaw =
						typeof detailRecord.quantity === "number"
							? detailRecord.quantity
							: typeof detailRecord.quantity === "string"
								? Number.parseInt(detailRecord.quantity, 10)
								: undefined;

					if (!barcode || quantityRaw == null || Number.isNaN(quantityRaw)) {
						return null;
					}
					return {
						barcode,
						quantity: quantityRaw,
						notes:
							typeof detailRecord.notes === "string"
								? detailRecord.notes
								: null,
					};
				})
				.filter(
					(
						item,
					): item is {
						barcode: number;
						quantity: number;
						notes: string | null;
					} => Boolean(item),
				),
		};
	}, [fullOrderResponse]);

	// Create a map of barcodes in the transfer to their counts
	const transferBarcodeCounts = useMemo(() => {
		const map = new Map<number, number>();
		for (const item of items) {
			if (item.productBarcode != null) {
				const current = map.get(item.productBarcode) ?? 0;
				map.set(item.productBarcode, current + 1);
			}
		}
		return map;
	}, [items]);

	/**
	 * Group items by productBarcode to display products with the same barcode together.
	 * Multiple items can have the same barcode but different UUIDs (productStockId).
	 */
	const groupedItems = useMemo(() => {
		const groups = new Map<
			number,
			{
				barcode: number;
				productName: string;
				items: typeof items;
			}
		>();

		for (const item of items) {
			const barcode = item.productBarcode;
			// Skip items without a valid barcode
			if (barcode === null || barcode === undefined) {
				continue;
			}
			// Create a new group if this barcode hasn't been seen yet
			if (!groups.has(barcode)) {
				const productName =
					productInfoByBarcode.get(barcode)?.name || `Producto ${barcode}`;
				groups.set(barcode, {
					barcode,
					productName,
					items: [],
				});
			}
			// Add the item to its corresponding barcode group
			groups.get(barcode)?.items.push(item);
		}

		return Array.from(groups.values());
	}, [items, productInfoByBarcode]);

	const altegioTotals = useMemo(() => {
		const totals = new Map<number, { qty: number; unitCost: number }>();
		for (const group of groupedItems) {
			const qty = group.items.length;
			const unitCost =
				(productCatalog?.data?.find(
					(product: ProductCatalogItem) => product.good_id === group.barcode,
				)?.cost as number | undefined) ?? 0;
			totals.set(group.barcode, { qty, unitCost });
		}
		return Array.from(totals.entries()).map(([goodId, { qty, unitCost }]) => ({
			goodId,
			totalQuantity: qty,
			totalCost: qty * unitCost,
		}));
	}, [groupedItems, productCatalog]);

	const { warehouseOptions } = useMemo(
		() => createWarehouseOptions(cabinetWarehouse),
		[cabinetWarehouse],
	);

	const handleMarkAllReceived = async () => {
		if (!canReceiveTransfer) {
			return;
		}
		markAllReceived();
		try {
			const payload: UpdateTransferStatusPayload = {
				transferId: String(generalTransferDetails?.id ?? ""),
				altegioTotals,
				isCompleted: true,
				completedBy: user?.id,
				isPending: false,
			};
			await updateTransferStatus(payload);
			toast(
				"Recepción completada: Todos los artículos han sido marcados como recibidos",
			);
		} catch {
			toast.error("No se pudo actualizar el estado del traspaso");
		}
	};

	const handleToggleItem = async (itemId: string, nextReceived: boolean) => {
		if (!canReceiveTransfer) {
			return;
		}
		toggleReceived(itemId);
		try {
			const payload: UpdateTransferItemStatusPayload = {
				transferDetailId: itemId,
				isReceived: nextReceived,
				receivedBy: user?.id,
			};
			await updateItemStatus(payload);

			const allReceived = getReceivedCount() === getTotalCount();
			const generalPayload: UpdateTransferStatusPayload = {
				transferId: String(generalTransferDetails?.id ?? ""),
				altegioTotals,
				isCompleted: allReceived,
				completedBy: allReceived ? user?.id : undefined,
				isPending: !allReceived,
			};
			await updateTransferStatus(generalPayload);
		} catch {
			toast.error("No se pudo actualizar el estado del ítem");
		}
	};

	const receivedCount = getReceivedCount();
	const totalCount = getTotalCount();

	return (
		<div className="theme-transition flex-1 space-y-6 bg-white p-4 md:p-6 dark:bg-[#151718]">
			{/* Breadcrumb */}
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink
							className="theme-transition flex items-center text-[#0a7ea4] hover:text-[#0a7ea4]/80"
							href="/recepciones"
						>
							<ArrowLeft className="mr-1 h-4 w-4" />
							Volver a recepciones
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
							{generalTransferDetails?.transferNumber}
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-2">
					<h1 className="font-bold text-2xl text-[#11181C] text-transition md:text-3xl dark:text-[#ECEDEE]">
						Recepción de envío{" "}
						{generalTransferDetails?.transferNumber || shipmentId}
					</h1>
					<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
						Marca los artículos como recibidos
					</p>
					<p className="text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
						Almacén de Origen:{" "}
						{warehouseOptions.find((option) => option.id === warehouseId)?.name}
					</p>
					<p className="text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
						Almacén de Destino:{" "}
						{
							warehouseOptions.find(
								(option) =>
									option.id === generalTransferDetails?.destinationWarehouseId,
							)?.name
						}
					</p>
				</div>

				<Button
					className="theme-transition bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90 disabled:opacity-50"
					disabled={isAllReceived() || !canReceiveTransfer}
					onClick={handleMarkAllReceived}
				>
					<CheckCircle2 className="mr-2 h-4 w-4" />
					Terminar recepción
				</Button>
			</div>

			{/* Progress Card */}
			<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<CardContent className="p-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<div className="rounded-lg bg-[#0a7ea4]/10 p-2">
								<Package className="h-6 w-6 text-[#0a7ea4]" />
							</div>
							<div className="space-y-1">
								<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
									Progreso de recepción
								</p>
								<p className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
									{`${receivedCount} / ${totalCount}`}
								</p>
							</div>
						</div>
						<div className="text-right">
							<p className="text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
								Completado
							</p>
							<p className="font-semibold text-[#0a7ea4] text-lg">
								{`${totalCount > 0 ? Math.round((receivedCount / totalCount) * 100) : 0}%`}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Pedido Details Card - only show if linked to a replenishment order */}
			{parsedOrder && (
				<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
								Información del pedido
							</CardTitle>
							<Button asChild size="sm" variant="outline">
								<Link href={`/pedidos/${parsedOrder.id}`}>
									Ver pedido completo
								</Link>
							</Button>
						</div>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* General Details */}
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<div className="space-y-1">
								<p className="font-medium text-[#687076] text-sm dark:text-[#9BA1A6]">
									Número de pedido
								</p>
								<p className="font-semibold text-[#11181C] dark:text-[#ECEDEE]">
									{parsedOrder.orderNumber}
								</p>
							</div>
							<div className="space-y-1">
								<p className="font-medium text-[#687076] text-sm dark:text-[#9BA1A6]">
									Fecha de creación
								</p>
								<p className="font-semibold text-[#11181C] dark:text-[#ECEDEE]">
									{parsedOrder.createdAt
										? format(new Date(parsedOrder.createdAt), "PPpp", {
												locale: es,
											})
										: "Sin fecha"}
								</p>
							</div>
							<div className="space-y-1">
								<p className="font-medium text-[#687076] text-sm dark:text-[#9BA1A6]">
									Estado
								</p>
								<Badge
									variant={
										parsedOrder.isReceived
											? "default"
											: parsedOrder.isSent
												? "secondary"
												: "outline"
									}
								>
									{parsedOrder.isReceived
										? "Recibido"
										: parsedOrder.isSent
											? "Enviado"
											: "Abierto"}
								</Badge>
							</div>
							<div className="space-y-1">
								<p className="font-medium text-[#687076] text-sm dark:text-[#9BA1A6]">
									Total de artículos
								</p>
								<p className="font-semibold text-[#11181C] dark:text-[#ECEDEE]">
									{parsedOrder.items.reduce(
										(sum, item) => sum + item.quantity,
										0,
									)}
								</p>
							</div>
						</div>

						{/* Notes */}
						{parsedOrder.notes && (
							<div className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-4 dark:border-[#2D3033] dark:bg-[#1E1F20]">
								<p className="font-medium text-[#11181C] text-sm dark:text-[#ECEDEE]">
									Notas del pedido:
								</p>
								<p className="text-[#687076] text-sm dark:text-[#9BA1A6]">
									{parsedOrder.notes}
								</p>
							</div>
						)}

						{/* Products List */}
						<div>
							<CardTitle className="mb-4 text-[#11181C] text-lg text-transition dark:text-[#ECEDEE]">
								Productos solicitados
							</CardTitle>
							<div className="theme-transition rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
								<Table>
									<TableHeader>
										<TableRow className="border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]">
											<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
												Código
											</TableHead>
											<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
												Producto
											</TableHead>
											<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
												Cantidad solicitada
											</TableHead>
											<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
												Cantidad en traspaso
											</TableHead>
											<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
												Estado
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{parsedOrder.items.length === 0 ? (
											<TableRow>
												<TableCell
													className="py-8 text-center text-[#687076] dark:text-[#9BA1A6]"
													colSpan={5}
												>
													No hay productos en el pedido
												</TableCell>
											</TableRow>
										) : (
											parsedOrder.items.map((orderItem) => {
												const transferCount =
													transferBarcodeCounts.get(orderItem.barcode) ?? 0;
												const isMissing = transferCount < orderItem.quantity;
												const productName = resolveProductName(orderItem.barcode);

												return (
													<TableRow
														className="theme-transition border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]"
														key={orderItem.barcode}
													>
														<TableCell className="font-mono text-[#11181C] text-sm dark:text-[#ECEDEE]">
															{orderItem.barcode}
														</TableCell>
														<TableCell className="text-[#11181C] dark:text-[#ECEDEE]">
															{productName}
														</TableCell>
														<TableCell className="text-[#11181C] dark:text-[#ECEDEE]">
															{orderItem.quantity}
														</TableCell>
														<TableCell className="text-[#11181C] dark:text-[#ECEDEE]">
															{transferCount}
														</TableCell>
														<TableCell>
															{isMissing ? (
																<Badge
																	className="theme-transition bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/20 dark:text-amber-400"
																	variant="secondary"
																>
																	Faltan {orderItem.quantity - transferCount}
																</Badge>
															) : (
																<Badge
																	className="theme-transition bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400"
																	variant="secondary"
																>
																	Completo
																</Badge>
															)}
														</TableCell>
													</TableRow>
												);
											})
										)}
									</TableBody>
								</Table>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Items Table */}
			<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<CardHeader>
					<CardTitle className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
						Artículos del envío
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="theme-transition rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
						<Table>
							<TableHeader>
								<TableRow className="border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]">
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Identificador
									</TableHead>
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Código de barras
									</TableHead>
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Nombre de producto
									</TableHead>
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Recibido
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.length === 0 && (
									<TableRow>
										<TableCell className="py-12 text-center" colSpan={4}>
											<Package className="mx-auto mb-4 h-12 w-12 text-[#687076] dark:text-[#9BA1A6]" />
											<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
												No hay artículos en este envío
											</p>
										</TableCell>
									</TableRow>
								)}

								{groupedItems.length > 0 &&
									groupedItems.map((group) => (
										<Fragment key={group.barcode}>
											{/* Group header */}
											<TableRow className="theme-transition bg-[#F9FAFB]/60 dark:bg-[#1E1F20]/60">
												<TableCell
													className="py-3 font-medium text-[#687076] text-transition dark:text-[#9BA1A6]"
													colSpan={4}
												>
													<div className="flex items-center space-x-3">
														<span className="font-mono text-sm">
															Código: {group.barcode}
														</span>
														<span className="text-sm">
															• {group.productName}
														</span>
														<span className="rounded-full bg-[#0a7ea4]/10 px-2 py-1 text-[#0a7ea4] text-xs">
															{group.items.length}{" "}
															{group.items.length === 1 ? "item" : "items"}
														</span>
													</div>
												</TableCell>
											</TableRow>

											{/* Group items */}
											{group.items.map((item) => (
												<TableRow
													className={cn(
														"theme-transition border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]",
														item.isReceived && "opacity-75",
													)}
													key={item.id}
												>
													<TableCell className="pl-8 font-mono text-[#11181C] text-sm text-transition dark:text-[#ECEDEE]">
														{item.id}
													</TableCell>
													<TableCell className="font-mono text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
														{item.productBarcode}
													</TableCell>
													<TableCell
														className={cn(
															"text-[#11181C] text-transition dark:text-[#ECEDEE]",
															item.isReceived && "line-through",
														)}
													>
														{group.productName}
													</TableCell>
													<TableCell>
														<div className="flex items-center gap-2">
															<Checkbox
																checked={
																	item.isReceived ||
																	generalTransferDetails?.isCompleted
																}
																disabled={
																	generalTransferDetails?.isCompleted ||
																	(item.isReceived as boolean) ||
																	!canReceiveTransfer
																}
																className="h-5 w-5 data-[state=checked]:border-[#0a7ea4] data-[state=checked]:bg-[#0a7ea4]"
																onCheckedChange={(checked) =>
																	handleToggleItem(item.id, Boolean(checked))
																}
															/>
															{generalTransferDetails?.isCompleted &&
																generalTransferDetails?.transferType ===
																	"external" &&
																!item.isReceived && (
																	<Badge
																		className="theme-transition bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400"
																		variant="secondary"
																	>
																		Sin recibir
																	</Badge>
																)}
														</div>
													</TableCell>
												</TableRow>
											))}
										</Fragment>
									))}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
			<div className="flex justify-end">
				<Button onClick={() => router.back()}>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Volver a recepciones
				</Button>
			</div>
		</div>
	);
}
