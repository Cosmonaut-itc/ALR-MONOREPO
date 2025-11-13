"use memo";
"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { endOfDay, format, parseISO, startOfDay, subDays } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RoleGuard } from "@/components/auth-guard";
import { DashboardMetricCard } from "@/components/DashboardMetricCard";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
import {
	getAllProductStock,
	getAllProducts,
	getAllWarehouses,
	getCabinetWarehouse,
} from "@/lib/fetch-functions/inventory";
import { getAllKits } from "@/lib/fetch-functions/kits";
import { getWarehouseTransferAll } from "@/lib/fetch-functions/recepciones";
import {
	getReplenishmentOrders,
	getUnfulfilledProducts,
} from "@/lib/fetch-functions/replenishment-orders";
import {
	getAllStockLimits,
	getStockLimitsByWarehouse,
} from "@/lib/fetch-functions/stock-limits";
import { createQueryKey } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";
import {
	buildCabinetLookup,
	clampDateRange,
	computeEmployeeActivity,
	computeKitMetrics,
	computeLowStock,
	computeOrderMetrics,
	computeProductUseTrend,
	computeReceptionMetrics,
	computeTransferTrend,
	computeUsageBreakdown,
	type DateRange,
	type EmployeeActivity,
	type LowStockItem,
	normalizeInventoryItems,
	normalizeKits,
	normalizeOrders,
	normalizeTransfers,
	type TrendPoint,
} from "@/lib/stats/estadisticas";
import { cn } from "@/lib/utils";
import type { StockLimit, UserRole } from "@/types";

type InventoryResponse = Awaited<ReturnType<typeof getAllProductStock>> | null;
type ProductsResponse = Awaited<ReturnType<typeof getAllProducts>> | null;
type WarehousesResponse = Awaited<ReturnType<typeof getAllWarehouses>> | null;
type CabinetResponse = Awaited<ReturnType<typeof getCabinetWarehouse>> | null;
type TransfersResponse = Awaited<
	ReturnType<typeof getWarehouseTransferAll>
> | null;
type OrdersResponse = Awaited<ReturnType<typeof getReplenishmentOrders>> | null;
type UnfulfilledProductsResponse = Awaited<
	ReturnType<typeof getUnfulfilledProducts>
> | null;
type KitsResponse = Awaited<ReturnType<typeof getAllKits>> | null;
type StockLimitsResponse =
	| Awaited<ReturnType<typeof getAllStockLimits>>
	| Awaited<ReturnType<typeof getStockLimitsByWarehouse>>
	| null;

type ScopeOption = "global" | "warehouse";

type EstadisticasPageProps = {
	userRole: string;
	warehouseId: string | null;
	isEncargado: boolean;
};

type WarehouseOption = {
	id: string;
	name: string;
	isCedis?: boolean;
};

type ProductNameMap = Map<number, string>;

type DashboardMetricShape = Parameters<typeof DashboardMetricCard>[0]["metric"];

/**
 * Represents an unfulfilled product from a replenishment order.
 */
type UnfulfilledProduct = {
	barcode: number;
	productName?: string;
	productId?: string | null;
	warehouseId?: string;
	warehouseName?: string;
	sourceWarehouseId?: string;
	quantityNeeded?: number;
	orderNumber?: string;
	orderId?: string;
};

/**
 * Normalizes unfulfilled products from the API response.
 * Handles various response shapes and extracts product information.
 *
 * @param response - The API response containing unfulfilled products
 * @returns Array of normalized unfulfilled products
 */
const normalizeUnfulfilledProducts = (
	response: UnfulfilledProductsResponse,
): UnfulfilledProduct[] => {
	if (!response || typeof response !== "object") {
		return [];
	}

	const root = response as Record<string, unknown>;
	let items: unknown[] = [];

	// Handle different response structures
	if (Array.isArray(root)) {
		items = root;
	} else if (Array.isArray(root.data)) {
		items = root.data;
	} else if (
		root.data &&
		typeof root.data === "object" &&
		Array.isArray((root.data as { products?: unknown }).products)
	) {
		items = ((root.data as { products?: unknown }).products ?? []) as unknown[];
	} else if (Array.isArray(root.products)) {
		items = root.products;
	}

	return items.flatMap((raw): UnfulfilledProduct[] => {
		if (!raw || typeof raw !== "object") {
			return [];
		}
		const record = raw as Record<string, unknown>;

		// Extract barcode (can be number or string)
		const barcodeRaw = record.barcode ?? record.goodId ?? record.productBarcode;
		const barcode =
			typeof barcodeRaw === "number"
				? barcodeRaw
				: typeof barcodeRaw === "string"
					? Number.parseInt(barcodeRaw, 10)
					: Number.NaN;

		if (!Number.isFinite(barcode)) {
			return [];
		}

		const productName =
			typeof record.productName === "string"
				? record.productName
				: typeof record.name === "string"
					? record.name
					: typeof record.title === "string"
						? record.title
						: undefined;

		const productId =
			typeof record.productId === "string"
				? record.productId
				: typeof record.goodId === "string"
					? record.goodId
					: typeof record.id === "string"
						? record.id
						: null;

		const warehouseId =
			typeof record.warehouseId === "string"
				? record.warehouseId
				: typeof record.warehouse_id === "string"
					? record.warehouse_id
					: undefined;

		const warehouseName =
			typeof record.warehouseName === "string"
				? record.warehouseName
				: undefined;

		const sourceWarehouseId =
			typeof record.sourceWarehouseId === "string"
				? record.sourceWarehouseId
				: typeof record.source_warehouse_id === "string"
					? record.source_warehouse_id
					: undefined;

		const quantityNeeded =
			typeof record.quantityNeeded === "number"
				? record.quantityNeeded
				: typeof record.quantity === "number"
					? record.quantity
					: typeof record.qty === "number"
						? record.qty
						: undefined;

		const orderNumber =
			typeof record.orderNumber === "string"
				? record.orderNumber
				: typeof record.order_number === "string"
					? record.order_number
					: undefined;

		const orderId =
			typeof record.orderId === "string"
				? record.orderId
				: typeof record.order_id === "string"
					? record.order_id
					: typeof record.replenishmentOrderId === "string"
						? record.replenishmentOrderId
						: undefined;

		return [
			{
				barcode,
				productName,
				productId,
				warehouseId,
				warehouseName,
				sourceWarehouseId,
				quantityNeeded,
				orderNumber,
				orderId,
			},
		];
	});
};

const formatDateVerbose = (date: Date) =>
	format(date, "dd 'de' MMMM yyyy", { locale: es });

const toStockLimits = (response: StockLimitsResponse): StockLimit[] => {
	if (
		!response ||
		typeof response !== "object" ||
		!("success" in response) ||
		!(response as { success?: unknown }).success ||
		!Array.isArray(response.data)
	) {
		return [];
	}
	return (response.data as unknown[]).filter((item): item is StockLimit => {
		if (!item || typeof item !== "object") {
			return false;
		}
		return typeof (item as { barcode?: unknown }).barcode === "number";
	});
};

const buildProductNameMap = (response: ProductsResponse): ProductNameMap => {
	const map: ProductNameMap = new Map();
	if (
		!response ||
		typeof response !== "object" ||
		!("success" in response) ||
		!(response as { success?: unknown }).success ||
		!Array.isArray(response.data)
	) {
		return map;
	}
	for (const raw of response.data as unknown[]) {
		if (!raw || typeof raw !== "object") {
			continue;
		}
		const record = raw as Record<string, unknown>;
		const barcodeStr =
			typeof record.barcode === "string" ? record.barcode : undefined;
		const barcodeNum =
			typeof record.barcode === "number" ? record.barcode : undefined;
		const goodId =
			typeof record.good_id === "number" ? record.good_id : undefined;
		const parsedBarcode =
			barcodeNum ??
			(barcodeStr ? Number.parseInt(barcodeStr, 10) : Number.NaN) ??
			goodId ??
			Number.NaN;
		if (!Number.isFinite(parsedBarcode)) {
			continue;
		}
		const candidateNames = [
			typeof record.title === "string" ? record.title : undefined,
			typeof record.name === "string" ? record.name : undefined,
			typeof record.comment === "string" ? record.comment : undefined,
		];
		const name = candidateNames.find(
			(value) => value && value.trim().length > 0,
		);
		if (!map.has(parsedBarcode)) {
			map.set(parsedBarcode, name?.trim() ?? `Producto ${parsedBarcode}`);
		}
	}
	return map;
};

const normalizeWarehouses = (
	response: WarehousesResponse,
): WarehouseOption[] => {
	if (
		!response ||
		typeof response !== "object" ||
		!("success" in response) ||
		!(response as { success?: unknown }).success ||
		!("data" in response) ||
		!Array.isArray((response as { data?: unknown }).data)
	) {
		return [];
	}
	return ((response as { data: unknown[] }).data as unknown[]).flatMap(
		(raw): WarehouseOption[] => {
			if (!raw || typeof raw !== "object") {
				return [];
			}
			const record = raw as Record<string, unknown>;
			const id = typeof record.id === "string" ? record.id : "";
			if (!id) {
				return [];
			}
			const code = typeof record.code === "string" ? record.code : "";
			const name =
				typeof record.name === "string" && record.name.trim().length > 0
					? record.name.trim()
					: code
						? `${code} (${id.slice(0, 6)})`
						: `Almacén ${id.slice(0, 6)}`;
			const rawIsCedis = record["isCedis"];
			const rawLegacyIsCedis = record["is_cedis"];
			const isCedis =
				typeof rawIsCedis === "boolean"
					? rawIsCedis
					: typeof rawLegacyIsCedis === "boolean"
						? rawLegacyIsCedis
						: undefined;
			return [{ id, name, isCedis }];
		},
	);
};

const TrendChart = ({
	title,
	points,
	accent,
}: {
	title: string;
	points: TrendPoint[];
	accent?: string;
}) => {
	const hasData = useMemo(
		() => points.some((point) => point.count > 0),
		[points],
	);
	const max = useMemo(() => {
		if (!hasData) {
			return 0;
		}
		return points.reduce(
			(peak, point) => (point.count > peak ? point.count : peak),
			0,
		);
	}, [points, hasData]);

	if (!hasData) {
		return (
			<Card className="card-transition">
				<CardHeader>
					<CardTitle className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">
						{title}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-6 text-center text-sm text-[#687076] dark:border-[#2D3033] dark:bg-[#1E1F20] dark:text-[#9BA1A6]">
						No hay datos relevantes en el rango seleccionado.
					</div>
				</CardContent>
			</Card>
		);
	}

	const minWidth = Math.max(points.length * 40, 320);

	return (
		<Card className="card-transition">
			<CardHeader>
				<CardTitle className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto">
					<div
						className="flex items-end gap-3"
						style={{ minWidth: `${minWidth}px`, height: "192px" }}
					>
						{points.map((point) => {
							const containerHeight = 192; // h-48 = 192px
							const labelHeight = 16; // Approximate height for labels
							const availableHeight = containerHeight - labelHeight * 2 - 8; // Subtract label heights and gap
							const barHeightPercent =
								max > 0
									? Math.max((point.count / max) * 100, 8)
									: point.count > 0
										? 8
										: 0;
							const barHeightPx = Math.max(
								(barHeightPercent / 100) * availableHeight,
								point.count > 0 ? 4 : 0,
							);
							const isoString =
								point.date.length > 10 ? point.date : `${point.date}T00:00:00Z`;
							const labelDate = format(parseISO(isoString), "dd/MM", {
								locale: es,
							});
							return (
								<div
									className="flex flex-1 flex-col items-center gap-2"
									key={`${point.date}-${point.count}`}
									style={{ height: `${containerHeight}px` }}
								>
									<span className="text-xs font-medium text-[#687076] dark:text-[#9BA1A6]">
										{point.count}
									</span>
									<div className="flex flex-1 items-end w-full justify-center">
										<div
											aria-hidden
											className={cn(
												"w-7 rounded-full bg-[#0a7ea4] transition-all",
												accent,
											)}
											style={{
												height: `${barHeightPx}px`,
												minHeight: point.count > 0 ? "4px" : "0px",
											}}
										/>
									</div>
									<span className="text-xs text-[#9BA1A6]">{labelDate}</span>
								</div>
							);
						})}
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

const EmployeeList = ({ items }: { items: EmployeeActivity[] }) => {
	if (items.length === 0) {
		return (
			<div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-6 text-center text-sm text-[#687076] dark:border-[#2D3033] dark:bg-[#1E1F20] dark:text-[#9BA1A6]">
				No hay colaboradores activos en el rango seleccionado.
			</div>
		);
	}
	return (
		<ul className="space-y-3">
			{items.slice(0, 6).map((employee) => (
				<li
					className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm dark:border-[#2D3033] dark:bg-[#151718]"
					key={employee.employeeId}
				>
					<div className="flex flex-col">
						<span className="font-medium text-[#11181C] dark:text-[#ECEDEE]">
							{employee.employeeName}
						</span>
						<span className="text-xs text-[#9BA1A6]">
							ID: {employee.employeeId.slice(0, 8)}
						</span>
					</div>
					<span className="rounded-full bg-[#0a7ea4]/10 px-3 py-1 text-xs font-semibold text-[#0a7ea4]">
						{employee.activeItems} en uso
					</span>
				</li>
			))}
		</ul>
	);
};

const DateSelector = ({
	label,
	date,
	onChange,
}: {
	label: string;
	date: Date;
	onChange: (date: Date) => void;
}) => {
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	return (
		<div className="flex flex-col gap-2">
			<Label className="text-xs uppercase tracking-wide text-[#687076] dark:text-[#9BA1A6]">
				{label}
			</Label>
			<div suppressHydrationWarning>
				<Popover>
					<PopoverTrigger asChild>
						<Button
							className="justify-start px-3 py-2 text-left text-sm font-medium text-[#11181C] dark:text-[#ECEDEE]"
							variant="outline"
						>
							{formatDateVerbose(date)}
						</Button>
					</PopoverTrigger>
					{isMounted && (
						<PopoverContent align="start" className="p-0" side="bottom">
							<Calendar
								mode="single"
								selected={date}
								onSelect={(next) => {
									if (!next) {
										return;
									}
									onChange(next);
								}}
								initialFocus
							/>
						</PopoverContent>
					)}
				</Popover>
			</div>
		</div>
	);
};

type TransferListItem = {
	id: string;
	transferNumber?: string;
	shipmentId?: string;
	isPending?: boolean;
	isCompleted?: boolean;
	isCancelled?: boolean;
	totalItems?: number;
	createdAt?: string;
	scheduledDate?: string;
	receivedAt?: string;
	sourceWarehouseId?: string;
	destinationWarehouseId?: string;
};

/**
 * Extracts transfer items from the raw API response.
 * Handles various response shapes similar to recepciones.tsx
 */
const extractTransferItems = (
	response: TransfersResponse,
): TransferListItem[] => {
	if (!response || typeof response !== "object") {
		return [];
	}
	const root = response as Record<string, unknown>;
	const items: unknown[] = [];

	if (Array.isArray(root)) {
		items.push(...(root as unknown[]));
	} else if (Array.isArray(root.data)) {
		items.push(...(root.data as unknown[]));
	} else if (
		root.data &&
		typeof root.data === "object" &&
		Array.isArray((root.data as { transfers?: unknown }).transfers)
	) {
		items.push(
			...(((root.data as { transfers?: unknown }).transfers ??
				[]) as unknown[]),
		);
	} else if (Array.isArray(root.transfers)) {
		items.push(...(root.transfers as unknown[]));
	}

	return items.flatMap((raw): TransferListItem[] => {
		if (!raw || typeof raw !== "object") {
			return [];
		}
		const record = raw as Record<string, unknown>;
		const id =
			typeof record.id === "string"
				? record.id
				: typeof record.id === "number"
					? String(record.id)
					: "";
		if (!id) {
			return [];
		}
		const transferNumber =
			typeof record.transferNumber === "string"
				? record.transferNumber
				: undefined;
		const shipmentId =
			typeof record.shipmentId === "string" ? record.shipmentId : undefined;
		const statusRaw =
			typeof record.status === "string"
				? record.status
				: typeof record.transferStatus === "string"
					? record.transferStatus
					: "";
		const status = statusRaw.toLowerCase();
		const isCompleted =
			Boolean(record.isCompleted) ||
			["completed", "complete", "done", "received"].includes(status);
		const isCancelled =
			Boolean(record.isCancelled) ||
			["cancelled", "canceled", "cancelado"].includes(status);
		const isPending =
			Boolean(record.isPending) ||
			(!isCompleted &&
				!isCancelled &&
				["pending", "in_transit", "sent", "en_camino"].includes(status));
		const totalItems =
			typeof record.totalItems === "number" ? record.totalItems : undefined;
		const createdAt =
			typeof record.createdAt === "string" ? record.createdAt : undefined;
		const scheduledDate =
			typeof record.scheduledDate === "string"
				? record.scheduledDate
				: undefined;
		const receivedAt =
			typeof record.receivedAt === "string" ? record.receivedAt : undefined;
		const sourceWarehouseId =
			typeof record.sourceWarehouseId === "string"
				? record.sourceWarehouseId
				: undefined;
		const destinationWarehouseId =
			typeof record.destinationWarehouseId === "string"
				? record.destinationWarehouseId
				: undefined;

		const item: TransferListItem = {
			id,
			transferNumber,
			shipmentId,
			isPending,
			isCompleted,
			isCancelled,
			totalItems,
			createdAt,
			scheduledDate,
			receivedAt,
			sourceWarehouseId,
			destinationWarehouseId,
		};

		if (item.isCancelled) {
			return [];
		}

		return [item];
	});
};

const PendingReceptionsDialog = ({
	open,
	onOpenChange,
	transfers,
	warehouseNameMap,
	effectiveRange,
	effectiveWarehouseId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	transfers: TransferListItem[];
	warehouseNameMap: Map<string, string>;
	effectiveRange: DateRange;
	effectiveWarehouseId: string | null;
}) => {
	const router = useRouter();

	const matchesWarehouse = (
		sourceId: string | undefined,
		destId: string | undefined,
		selected: string | null,
	): boolean => {
		if (!selected) {
			return true;
		}
		return sourceId === selected || destId === selected;
	};

	const isWithinRange = (
		value: string | undefined,
		range: DateRange,
	): boolean => {
		if (!value) {
			return false;
		}
		const parsed = parseISO(value);
		if (Number.isNaN(parsed.getTime())) {
			return false;
		}
		const start = startOfDay(range.start);
		const end = endOfDay(range.end);
		return parsed >= start && parsed <= end;
	};

	const pendingTransfers = useMemo(() => {
		return transfers
			.filter((transfer) => {
				if (!transfer.isPending) {
					return false;
				}
				if (
					!matchesWarehouse(
						transfer.sourceWarehouseId,
						transfer.destinationWarehouseId,
						effectiveWarehouseId,
					)
				) {
					return false;
				}
				const referenceDate =
					transfer.createdAt ?? transfer.scheduledDate ?? transfer.receivedAt;
				return isWithinRange(referenceDate, effectiveRange);
			})
			.slice(0, 7);
	}, [transfers, effectiveRange, effectiveWarehouseId]);

	const formatTransferDate = (dateStr: string | undefined): string => {
		if (!dateStr) {
			return "N/A";
		}
		try {
			const parsed = parseISO(dateStr);
			if (Number.isNaN(parsed.getTime())) {
				return "N/A";
			}
			return format(parsed, "dd/MM/yyyy", { locale: es });
		} catch {
			return "N/A";
		}
	};

	const getShipmentId = (transfer: TransferListItem): string => {
		return transfer.transferNumber ?? transfer.shipmentId ?? transfer.id;
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Recepciones pendientes</DialogTitle>
					<DialogDescription>
						Primeras 7 recepciones pendientes en el rango seleccionado
					</DialogDescription>
				</DialogHeader>
				<div className="max-h-[60vh] overflow-y-auto">
					{pendingTransfers.length === 0 ? (
						<div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-6 text-center text-sm text-[#687076] dark:border-[#2D3033] dark:bg-[#1E1F20] dark:text-[#9BA1A6]">
							No hay recepciones pendientes en el rango seleccionado.
						</div>
					) : (
						<ul className="space-y-3">
							{pendingTransfers.map((transfer) => {
								const shipmentId = getShipmentId(transfer);
								const sourceName = transfer.sourceWarehouseId
									? (warehouseNameMap.get(transfer.sourceWarehouseId) ??
										`Almacén ${transfer.sourceWarehouseId.slice(0, 6)}`)
									: "N/A";
								const destName = transfer.destinationWarehouseId
									? (warehouseNameMap.get(transfer.destinationWarehouseId) ??
										`Almacén ${transfer.destinationWarehouseId.slice(0, 6)}`)
									: "N/A";
								return (
									<li
										key={transfer.id}
										className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm dark:border-[#2D3033] dark:bg-[#151718]"
									>
										<div className="flex flex-col gap-1">
											<Link
												href={`/recepciones/${transfer.id}`}
												className="font-medium text-[#0a7ea4] hover:underline"
											>
												{shipmentId}
											</Link>
											<div className="text-xs text-[#9BA1A6]">
												{sourceName} → {destName}
											</div>
											<div className="text-xs text-[#9BA1A6]">
												{transfer.totalItems ?? 0} items •{" "}
												{formatTransferDate(
													transfer.createdAt ?? transfer.scheduledDate,
												)}
											</div>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</div>
				<div className="flex justify-end gap-2 pt-4">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						type="button"
					>
						Cerrar
					</Button>
					<Button
						onClick={() => {
							router.push("/recepciones");
							onOpenChange(false);
						}}
						type="button"
					>
						Ver todas las recepciones
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

const CompletedReceptionsDialog = ({
	open,
	onOpenChange,
	transfers,
	warehouseNameMap,
	effectiveRange,
	effectiveWarehouseId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	transfers: TransferListItem[];
	warehouseNameMap: Map<string, string>;
	effectiveRange: DateRange;
	effectiveWarehouseId: string | null;
}) => {
	const router = useRouter();

	const matchesWarehouse = (
		sourceId: string | undefined,
		destId: string | undefined,
		selected: string | null,
	): boolean => {
		if (!selected) {
			return true;
		}
		return sourceId === selected || destId === selected;
	};

	const isWithinRange = (
		value: string | undefined,
		range: DateRange,
	): boolean => {
		if (!value) {
			return false;
		}
		const parsed = parseISO(value);
		if (Number.isNaN(parsed.getTime())) {
			return false;
		}
		const start = startOfDay(range.start);
		const end = endOfDay(range.end);
		return parsed >= start && parsed <= end;
	};

	const completedTransfers = useMemo(() => {
		return transfers
			.filter((transfer) => {
				if (!transfer.isCompleted) {
					return false;
				}
				if (
					!matchesWarehouse(
						transfer.sourceWarehouseId,
						transfer.destinationWarehouseId,
						effectiveWarehouseId,
					)
				) {
					return false;
				}
				const referenceDate =
					transfer.createdAt ?? transfer.scheduledDate ?? transfer.receivedAt;
				return isWithinRange(referenceDate, effectiveRange);
			})
			.slice(0, 7);
	}, [transfers, effectiveRange, effectiveWarehouseId]);

	const formatTransferDate = (dateStr: string | undefined): string => {
		if (!dateStr) {
			return "N/A";
		}
		try {
			const parsed = parseISO(dateStr);
			if (Number.isNaN(parsed.getTime())) {
				return "N/A";
			}
			return format(parsed, "dd/MM/yyyy", { locale: es });
		} catch {
			return "N/A";
		}
	};

	const getShipmentId = (transfer: TransferListItem): string => {
		return transfer.transferNumber ?? transfer.shipmentId ?? transfer.id;
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Recepciones completadas</DialogTitle>
					<DialogDescription>
						Primeras 7 recepciones completadas en el rango seleccionado
					</DialogDescription>
				</DialogHeader>
				<div className="max-h-[60vh] overflow-y-auto">
					{completedTransfers.length === 0 ? (
						<div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-6 text-center text-sm text-[#687076] dark:border-[#2D3033] dark:bg-[#1E1F20] dark:text-[#9BA1A6]">
							No hay recepciones completadas en el rango seleccionado.
						</div>
					) : (
						<ul className="space-y-3">
							{completedTransfers.map((transfer) => {
								const shipmentId = getShipmentId(transfer);
								const sourceName = transfer.sourceWarehouseId
									? (warehouseNameMap.get(transfer.sourceWarehouseId) ??
										`Almacén ${transfer.sourceWarehouseId.slice(0, 6)}`)
									: "N/A";
								const destName = transfer.destinationWarehouseId
									? (warehouseNameMap.get(transfer.destinationWarehouseId) ??
										`Almacén ${transfer.destinationWarehouseId.slice(0, 6)}`)
									: "N/A";
								return (
									<li
										key={transfer.id}
										className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm dark:border-[#2D3033] dark:bg-[#151718]"
									>
										<div className="flex flex-col gap-1">
											<Link
												href={`/recepciones/${transfer.id}`}
												className="font-medium text-[#0a7ea4] hover:underline"
											>
												{shipmentId}
											</Link>
											<div className="text-xs text-[#9BA1A6]">
												{sourceName} → {destName}
											</div>
											<div className="text-xs text-[#9BA1A6]">
												{transfer.totalItems ?? 0} items •{" "}
												{formatTransferDate(
													transfer.createdAt ?? transfer.scheduledDate,
												)}
											</div>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</div>
				<div className="flex justify-end gap-2 pt-4">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						type="button"
					>
						Cerrar
					</Button>
					<Button
						onClick={() => {
							router.push("/recepciones");
							onOpenChange(false);
						}}
						type="button"
					>
						Ver todas las recepciones
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

const TodayReceptionsDialog = ({
	open,
	onOpenChange,
	transfers,
	warehouseNameMap,
	effectiveRange,
	effectiveWarehouseId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	transfers: TransferListItem[];
	warehouseNameMap: Map<string, string>;
	effectiveRange: DateRange;
	effectiveWarehouseId: string | null;
}) => {
	const router = useRouter();

	const matchesWarehouse = (
		sourceId: string | undefined,
		destId: string | undefined,
		selected: string | null,
	): boolean => {
		if (!selected) {
			return true;
		}
		return sourceId === selected || destId === selected;
	};

	const isToday = (value: string | undefined): boolean => {
		if (!value) {
			return false;
		}
		const parsed = parseISO(value);
		if (Number.isNaN(parsed.getTime())) {
			return false;
		}
		const today = startOfDay(new Date());
		const valueDay = startOfDay(parsed);
		return valueDay.getTime() === today.getTime();
	};

	const todayTransfers = useMemo(() => {
		return transfers
			.filter((transfer) => {
				if (
					!matchesWarehouse(
						transfer.sourceWarehouseId,
						transfer.destinationWarehouseId,
						effectiveWarehouseId,
					)
				) {
					return false;
				}
				const referenceDate =
					transfer.createdAt ?? transfer.scheduledDate ?? transfer.receivedAt;
				return isToday(referenceDate);
			})
			.slice(0, 7);
	}, [transfers, effectiveWarehouseId]);

	const formatTransferDate = (dateStr: string | undefined): string => {
		if (!dateStr) {
			return "N/A";
		}
		try {
			const parsed = parseISO(dateStr);
			if (Number.isNaN(parsed.getTime())) {
				return "N/A";
			}
			return format(parsed, "dd/MM/yyyy", { locale: es });
		} catch {
			return "N/A";
		}
	};

	const getShipmentId = (transfer: TransferListItem): string => {
		return transfer.transferNumber ?? transfer.shipmentId ?? transfer.id;
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Recepciones de hoy</DialogTitle>
					<DialogDescription>
						Primeras 7 recepciones de hoy en el alcance seleccionado
					</DialogDescription>
				</DialogHeader>
				<div className="max-h-[60vh] overflow-y-auto">
					{todayTransfers.length === 0 ? (
						<div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-6 text-center text-sm text-[#687076] dark:border-[#2D3033] dark:bg-[#1E1F20] dark:text-[#9BA1A6]">
							No hay recepciones de hoy en el alcance seleccionado.
						</div>
					) : (
						<ul className="space-y-3">
							{todayTransfers.map((transfer) => {
								const shipmentId = getShipmentId(transfer);
								const sourceName = transfer.sourceWarehouseId
									? (warehouseNameMap.get(transfer.sourceWarehouseId) ??
										`Almacén ${transfer.sourceWarehouseId.slice(0, 6)}`)
									: "N/A";
								const destName = transfer.destinationWarehouseId
									? (warehouseNameMap.get(transfer.destinationWarehouseId) ??
										`Almacén ${transfer.destinationWarehouseId.slice(0, 6)}`)
									: "N/A";
								return (
									<li
										key={transfer.id}
										className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm dark:border-[#2D3033] dark:bg-[#151718]"
									>
										<div className="flex flex-col gap-1">
											<Link
												href={`/recepciones/${transfer.id}`}
												className="font-medium text-[#0a7ea4] hover:underline"
											>
												{shipmentId}
											</Link>
											<div className="text-xs text-[#9BA1A6]">
												{sourceName} → {destName}
											</div>
											<div className="text-xs text-[#9BA1A6]">
												{transfer.totalItems ?? 0} items •{" "}
												{formatTransferDate(
													transfer.createdAt ?? transfer.scheduledDate,
												)}
											</div>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</div>
				<div className="flex justify-end gap-2 pt-4">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						type="button"
					>
						Cerrar
					</Button>
					<Button
						onClick={() => {
							router.push("/recepciones");
							onOpenChange(false);
						}}
						type="button"
					>
						Ver todas las recepciones
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

const MetricsGrid = ({
	metrics,
	onMetricClick,
}: {
	metrics: DashboardMetricShape[];
	onMetricClick: (label: string) => void;
}) => (
	<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		{metrics.map((metric) => {
			const isClickable =
				metric.label === "Recepciones pendientes" ||
				metric.label === "Recepciones completadas" ||
				metric.label === "Recepciones de hoy";
			return (
				<DashboardMetricCard
					key={metric.label}
					metric={metric}
					onClick={isClickable ? () => onMetricClick(metric.label) : undefined}
				/>
			);
		})}
	</div>
);

/**
 * Component that displays both low stock items and unfulfilled products from replenishment orders.
 * Shows products that need to be ordered for creating buy orders.
 *
 * @param items - Low stock items to display
 * @param unfulfilledProducts - Unfulfilled products from replenishment orders
 * @param resolveProductName - Function to resolve product name from barcode
 * @param resolveWarehouseName - Function to resolve warehouse name from ID
 * @param resolveProductId - Function to resolve product ID from barcode
 */
const LowStockTable = ({
	items,
	unfulfilledProducts,
	resolveProductName,
	resolveWarehouseName,
	resolveProductId,
}: {
	items: LowStockItem[];
	unfulfilledProducts: UnfulfilledProduct[];
	resolveProductName: (
		barcode: number,
		fallbackDescription?: string | null,
	) => string;
	resolveWarehouseName: (id: string) => string;
	resolveProductId: (
		barcode: number,
		fallbackId?: string | null,
	) => string | null;
}) => {
	const hasLowStock = items.length > 0;
	const hasUnfulfilled = unfulfilledProducts.length > 0;
	const hasAnyData = hasLowStock || hasUnfulfilled;

	return (
		<Card className="card-transition xl:col-span-2">
			<CardHeader>
				<CardTitle className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">
					Productos para crear pedidos de compra
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-6">
				{!hasAnyData ? (
					<div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-6 text-center text-sm text-[#687076] dark:border-[#2D3033] dark:bg-[#1E1F20] dark:text-[#9BA1A6]">
						No se detectaron productos con stock bajo ni productos sin cumplir
						en pedidos de reabastecimiento en el rango y alcance seleccionados.
					</div>
				) : (
					<>
						{hasLowStock && (
							<div className="flex flex-col gap-3">
								<h3 className="text-sm font-semibold text-[#11181C] dark:text-[#ECEDEE]">
									Productos por debajo del mínimo
								</h3>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Producto</TableHead>
											<TableHead className="text-center">Almacén</TableHead>
											<TableHead className="text-center">Actual</TableHead>
											<TableHead className="text-center">Mínimo</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{items.slice(0, 6).map((item) => {
											const productName = resolveProductName(
												item.barcode,
												item.description,
											);
											const productIdSuffix = resolveProductId(
												item.barcode,
												item.productId,
											);
											return (
												<TableRow
													key={`low-stock-${item.warehouseId}-${item.barcode}`}
												>
													<TableCell>
														<div className="flex flex-col">
															<span className="font-medium text-[#11181C] dark:text-[#ECEDEE]">
																{productName}
															</span>
															<span className="text-xs text-[#9BA1A6]">
																{productIdSuffix
																	? `ID ${productIdSuffix}`
																	: "ID —"}{" "}
																• #{item.barcode}
															</span>
														</div>
													</TableCell>
													<TableCell className="text-center text-sm text-[#687076] dark:text-[#9BA1A6]">
														{resolveWarehouseName(item.warehouseId)}
													</TableCell>
													<TableCell className="text-center font-semibold text-[#E85D04]">
														{item.current}
													</TableCell>
													<TableCell className="text-center text-sm text-[#687076] dark:text-[#9BA1A6]">
														{item.min}
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>
						)}

						{hasUnfulfilled && (
							<div className="flex flex-col gap-3">
								{hasLowStock && (
									<div className="border-t border-[#E5E7EB] dark:border-[#2D3033]" />
								)}
								<h3 className="text-sm font-semibold text-[#11181C] dark:text-[#ECEDEE]">
									Productos sin cumplir en pedidos de reabastecimiento
								</h3>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Producto</TableHead>
											<TableHead className="text-center">Almacén</TableHead>
											<TableHead className="text-center">Cantidad</TableHead>
											<TableHead className="text-center">Pedido</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{unfulfilledProducts.slice(0, 6).map((product, index) => {
											const productName = product.productName
												? product.productName
												: resolveProductName(product.barcode);
											const productIdSuffix = resolveProductId(
												product.barcode,
												product.productId,
											);
											// Resolve warehouse name: check warehouseName, then warehouseId, then sourceWarehouseId
											const warehouseName = product.warehouseName
												? product.warehouseName
												: product.warehouseId
													? resolveWarehouseName(product.warehouseId)
													: product.sourceWarehouseId
														? resolveWarehouseName(product.sourceWarehouseId)
														: "N/A";
											return (
												<TableRow
													key={`unfulfilled-${product.orderId ?? index}-${product.barcode}`}
												>
													<TableCell>
														<div className="flex flex-col">
															<span className="font-medium text-[#11181C] dark:text-[#ECEDEE]">
																{productName}
															</span>
															<span className="text-xs text-[#9BA1A6]">
																{productIdSuffix
																	? `ID ${productIdSuffix}`
																	: "ID —"}{" "}
																• #{product.barcode}
															</span>
														</div>
													</TableCell>
													<TableCell className="text-center text-sm text-[#687076] dark:text-[#9BA1A6]">
														{warehouseName}
													</TableCell>
													<TableCell className="text-center font-semibold text-[#0a7ea4]">
														{product.quantityNeeded ?? "—"}
													</TableCell>
													<TableCell className="text-center text-sm text-[#687076] dark:text-[#9BA1A6]">
														{product.orderNumber ?? product.orderId ?? "—"}
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
};

const TopList = ({
	title,
	topItems,
	resolveProductName,
	resolveProductId,
}: {
	title: string;
	topItems: Array<{ barcode: number; uses: number }>;
	resolveProductName: (
		barcode: number,
		fallbackDescription?: string | null,
	) => string;
	resolveProductId: (
		barcode: number,
		fallbackId?: string | null,
	) => string | null;
}) => (
	<Card className="card-transition">
		<CardHeader>
			<CardTitle className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">
				{title}
			</CardTitle>
		</CardHeader>
		<CardContent>
			{topItems.length === 0 ? (
				<div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-6 text-center text-sm text-[#687076] dark:border-[#2D3033] dark:bg-[#1E1F20] dark:text-[#9BA1A6]">
					No hay usos registrados en el rango seleccionado.
				</div>
			) : (
				<ol className="space-y-3">
					{topItems.map((item) => {
						const productIdSuffix = resolveProductId(item.barcode);
						return (
							<li
								className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm dark:border-[#2D3033] dark:bg-[#151718]"
								key={item.barcode}
							>
								<div className="flex flex-col">
									<span className="font-medium text-[#11181C] dark:text-[#ECEDEE]">
										{resolveProductName(item.barcode)}
									</span>
									<span className="text-xs text-[#9BA1A6]">
										{productIdSuffix ? `ID ${productIdSuffix}` : "ID —"} • #
										{item.barcode}
									</span>
								</div>
								<span className="rounded-full bg-[#0a7ea4]/10 px-3 py-1 text-xs font-semibold text-[#0a7ea4]">
									{item.uses} usos
								</span>
							</li>
						);
					})}
				</ol>
			)}
		</CardContent>
	</Card>
);

export function EstadisticasPage({
	userRole,
	warehouseId,
	isEncargado,
}: EstadisticasPageProps) {
	const [isMounted, setIsMounted] = useState(false);
	const [scope, setScope] = useState<ScopeOption>(
		isEncargado ? "global" : "warehouse",
	);
	const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(
		scope === "warehouse" ? (warehouseId ?? null) : null,
	);
	const [dateRange, setDateRange] = useState<DateRange>(() => {
		// Initialize with epoch date to ensure consistent SSR/client rendering
		// Will be updated after mount with actual date
		const epochDate = new Date(0);
		return clampDateRange({ start: epochDate, end: epochDate });
	});
	const [dialogType, setDialogType] = useState<
		"pending" | "completed" | "today" | null
	>(null);

	useEffect(() => {
		setIsMounted(true);
		// Update date range after mount to use actual current date
		const actualToday = new Date();
		setDateRange(
			clampDateRange({ start: subDays(actualToday, 30), end: actualToday }),
		);
	}, []);

	const normalizedRole = useMemo<UserRole["role"]>(() => {
		if (
			userRole === "admin" ||
			userRole === "encargado" ||
			userRole === "employee"
		) {
			return userRole;
		}
		return "employee";
	}, [userRole]);

	const { data: inventoryResponse } = useSuspenseQuery<
		InventoryResponse,
		Error,
		InventoryResponse
	>({
		queryKey: createQueryKey(queryKeys.inventory, ["all"]),
		queryFn: getAllProductStock,
	});

	const { data: productCatalogResponse } = useSuspenseQuery<
		ProductsResponse,
		Error,
		ProductsResponse
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

	const warehouseOptions = useMemo(
		() => normalizeWarehouses(warehousesResponse),
		[warehousesResponse],
	);

	const cedisWarehouseId = useMemo(() => {
		const cedisWarehouse = warehouseOptions.find((w) => w.isCedis);
		return cedisWarehouse?.id ?? null;
	}, [warehouseOptions]);

	const { data: cabinetResponse } = useSuspenseQuery<
		CabinetResponse,
		Error,
		CabinetResponse
	>({
		queryKey: queryKeys.cabinetWarehouse,
		queryFn: getCabinetWarehouse,
	});

	const { data: transfersResponse } = useSuspenseQuery<
		TransfersResponse,
		Error,
		TransfersResponse
	>({
		queryKey: createQueryKey(queryKeys.receptions, ["all"]),
		queryFn: getWarehouseTransferAll,
	});

	const { data: ordersResponse } = useSuspenseQuery<
		OrdersResponse,
		Error,
		OrdersResponse
	>({
		queryKey: createQueryKey(queryKeys.replenishmentOrders, ["all"]),
		queryFn: () => getReplenishmentOrders(),
	});

	const { data: unfulfilledProductsResponse } = useSuspenseQuery<
		UnfulfilledProductsResponse,
		Error,
		UnfulfilledProductsResponse
	>({
		queryKey: createQueryKey(queryKeys.unfulfilledProducts, ["all"]),
		queryFn: getUnfulfilledProducts,
	});

	const { data: kitsResponse } = useSuspenseQuery<
		KitsResponse,
		Error,
		KitsResponse
	>({
		queryKey: createQueryKey(queryKeys.kits, ["all"]),
		queryFn: getAllKits,
	});

	const { data: stockLimitsResponse } = useSuspenseQuery<
		StockLimitsResponse,
		Error,
		StockLimitsResponse
	>({
		queryKey: createQueryKey(queryKeys.stockLimits, [
			cedisWarehouseId ? `cedis-${cedisWarehouseId}` : "all",
		]),
		queryFn: () => {
			if (cedisWarehouseId) {
				return getStockLimitsByWarehouse(cedisWarehouseId);
			}
			return getAllStockLimits();
		},
	});

	const cabinetLookup = useMemo(
		() => buildCabinetLookup(cabinetResponse ?? null),
		[cabinetResponse],
	);

	const inventoryItems = useMemo(
		() => normalizeInventoryItems(inventoryResponse, cabinetLookup),
		[inventoryResponse, cabinetLookup],
	);

	const transfers = useMemo(
		() => normalizeTransfers(transfersResponse),
		[transfersResponse],
	);

	const orders = useMemo(
		() => normalizeOrders(ordersResponse),
		[ordersResponse],
	);

	const kits = useMemo(() => normalizeKits(kitsResponse), [kitsResponse]);

	const stockLimits = useMemo(
		() => toStockLimits(stockLimitsResponse),
		[stockLimitsResponse],
	);

	const unfulfilledProducts = useMemo(
		() => normalizeUnfulfilledProducts(unfulfilledProductsResponse),
		[unfulfilledProductsResponse],
	);

	const warehouseNameMap = useMemo(() => {
		const map = new Map<string, string>();
		for (const option of warehouseOptions) {
			map.set(option.id, option.name);
		}
		return map;
	}, [warehouseOptions]);

	useEffect(() => {
		if (scope === "warehouse" && !selectedWarehouse) {
			if (warehouseId) {
				setSelectedWarehouse(warehouseId);
				return;
			}
			if (warehouseOptions.length > 0) {
				setSelectedWarehouse(warehouseOptions[0].id);
			}
		}
	}, [scope, selectedWarehouse, warehouseId, warehouseOptions]);

	const productCatalogNameMap = useMemo(
		() => buildProductNameMap(productCatalogResponse),
		[productCatalogResponse],
	);

	/**
	 * Creates a lookup map that matches barcode to product title by searching for products
	 * where good_id matches the barcode. This is used specifically for the "productos para crear pedidos" card.
	 */
	const productCatalogTitleByBarcode = useMemo(() => {
		const map = new Map<number, string>();
		if (
			!productCatalogResponse ||
			typeof productCatalogResponse !== "object" ||
			!("success" in productCatalogResponse) ||
			!(productCatalogResponse as { success?: unknown }).success ||
			!Array.isArray(productCatalogResponse.data)
		) {
			return map;
		}
		for (const raw of productCatalogResponse.data as unknown[]) {
			if (!raw || typeof raw !== "object") {
				continue;
			}
			const record = raw as Record<string, unknown>;
			// Get good_id as the key to match against barcode
			const goodId =
				typeof record.good_id === "number"
					? record.good_id
					: typeof record.good_id === "string"
						? Number.parseInt(record.good_id, 10)
						: Number.NaN;
			if (!Number.isFinite(goodId)) {
				continue;
			}
			// Get title from the product catalog
			const title =
				typeof record.title === "string" && record.title.trim().length > 0
					? record.title.trim()
					: undefined;
			if (title && !map.has(goodId)) {
				map.set(goodId, title);
			}
		}
		return map;
	}, [productCatalogResponse]);

	const productDetailsByBarcode = useMemo(() => {
		const map = new Map<number, { name: string; productId: string | null }>();
		for (const item of inventoryItems) {
			if (item.barcode == null) {
				continue;
			}
			const existing = map.get(item.barcode);
			const description = item.description?.trim();
			if (!existing) {
				map.set(item.barcode, {
					name:
						description && description.length > 0
							? description
							: (productCatalogNameMap.get(item.barcode) ??
								`Producto ${item.barcode}`),
					productId: item.id ?? null,
				});
				continue;
			}
			const shouldReplaceName =
				description &&
				description.length > 0 &&
				(existing.name.trim().length === 0 ||
					existing.name.startsWith("Producto "));
			if (shouldReplaceName) {
				map.set(item.barcode, {
					name: description,
					productId: item.id ?? existing.productId,
				});
				continue;
			}
			if (!existing.productId && item.id) {
				map.set(item.barcode, {
					name: existing.name,
					productId: item.id,
				});
			}
		}
		return map;
	}, [inventoryItems, productCatalogNameMap]);

	const normalizeIdSuffix = (value?: string | null) => {
		if (!value) {
			return null;
		}
		const cleaned = value.replace(/[^a-zA-Z0-9]/g, "");
		if (!cleaned) {
			return null;
		}
		return cleaned.slice(-6).toUpperCase();
	};

	const effectiveWarehouseId =
		scope === "warehouse" ? (selectedWarehouse ?? null) : null;
	const effectiveRange = useMemo(() => clampDateRange(dateRange), [dateRange]);

	const receptionMetrics = useMemo(
		() =>
			computeReceptionMetrics(transfers, effectiveRange, effectiveWarehouseId),
		[transfers, effectiveRange, effectiveWarehouseId],
	);

	const lowStockResult = useMemo(
		() => computeLowStock(inventoryItems, stockLimits, effectiveWarehouseId),
		[inventoryItems, stockLimits, effectiveWarehouseId],
	);

	const usageBreakdown = useMemo(
		() =>
			computeUsageBreakdown(
				inventoryItems,
				effectiveRange,
				effectiveWarehouseId,
			),
		[inventoryItems, effectiveRange, effectiveWarehouseId],
	);

	const orderMetrics = useMemo(
		() => computeOrderMetrics(orders, effectiveRange, effectiveWarehouseId),
		[orders, effectiveRange, effectiveWarehouseId],
	);

	const kitMetrics = useMemo(
		() => computeKitMetrics(kits, effectiveWarehouseId),
		[kits, effectiveWarehouseId],
	);

	const transferTrend = useMemo(
		() => computeTransferTrend(transfers, effectiveRange, effectiveWarehouseId),
		[transfers, effectiveRange, effectiveWarehouseId],
	);

	const usageTrend = useMemo(
		() =>
			computeProductUseTrend(
				inventoryItems,
				effectiveRange,
				effectiveWarehouseId,
			),
		[inventoryItems, effectiveRange, effectiveWarehouseId],
	);

	const employeeActivity = useMemo(
		() => computeEmployeeActivity(inventoryItems, effectiveWarehouseId),
		[inventoryItems, effectiveWarehouseId],
	);

	/**
	 * Resolves product name prioritizing product catalog title.
	 * Falls back to inventory item description, then product details, then barcode.
	 *
	 * @param barcode - Product barcode to look up
	 * @param fallbackDescription - Optional description from inventory items
	 * @returns Product name from catalog if available, otherwise fallback options
	 */
	const resolveProductName = (
		barcode: number,
		fallbackDescription?: string | null,
	) => {
		// Prioritize product catalog title first (matching barcode to good_id)
		const catalogTitle = productCatalogTitleByBarcode.get(barcode);
		if (catalogTitle && catalogTitle.trim().length > 0) {
			return catalogTitle.trim();
		}
		// Fall back to product catalog name map (barcode-based lookup)
		const catalogName = productCatalogNameMap.get(barcode);
		if (catalogName && catalogName.trim().length > 0) {
			return catalogName.trim();
		}
		// Fall back to inventory item description
		if (fallbackDescription && fallbackDescription.trim().length > 0) {
			return fallbackDescription.trim();
		}
		// Fall back to product details from inventory
		const fromDetails = productDetailsByBarcode.get(barcode)?.name;
		if (fromDetails && fromDetails.trim().length > 0) {
			return fromDetails;
		}
		// Last resort: use barcode
		return `Producto ${barcode}`;
	};

	const resolveProductId = (barcode: number, fallbackId?: string | null) => {
		const candidate =
			fallbackId ?? productDetailsByBarcode.get(barcode)?.productId ?? null;
		return normalizeIdSuffix(candidate);
	};
	const resolveWarehouseName = (id: string) =>
		warehouseNameMap.get(id) ?? `Almacén ${id.slice(0, 6)}`;

	const metrics: DashboardMetricShape[] = [
		{
			label: "Recepciones pendientes",
			value: receptionMetrics.pending,
			icon: "clock",
		},
		{
			label: "Recepciones completadas",
			value: receptionMetrics.completed,
			icon: "archive",
		},
		{
			label: "Items transferidos",
			value: receptionMetrics.totalItems,
			icon: "package",
		},
		{
			label: "Recepciones de hoy",
			value: receptionMetrics.today,
			icon: "alert",
		},
	];

	const lowStockItems = useMemo(
		() => lowStockResult.items,
		[lowStockResult.items],
	);
	const formattedRange = `${formatDateVerbose(effectiveRange.start)} — ${formatDateVerbose(effectiveRange.end)}`;

	const transferItems = useMemo(
		() => extractTransferItems(transfersResponse),
		[transfersResponse],
	);

	const handleMetricClick = (label: string) => {
		if (label === "Recepciones pendientes") {
			setDialogType("pending");
		} else if (label === "Recepciones completadas") {
			setDialogType("completed");
		} else if (label === "Recepciones de hoy") {
			setDialogType("today");
		}
	};

	return (
		<RoleGuard allowedRoles={["admin", "encargado"]} userRole={normalizedRole}>
			<div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
				<header className="space-y-1">
					<h1 className="text-2xl font-semibold text-[#11181C] dark:text-[#ECEDEE]">
						Estadísticas operativas
					</h1>
					<p
						className="text-sm text-[#687076] dark:text-[#9BA1A6]"
						suppressHydrationWarning
					>
						Resumen global de movimientos, inventario y actividad para el
						periodo {formattedRange}.
					</p>
				</header>

				<section className="grid gap-4 rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm dark:border-[#2D3033] dark:bg-[#151718]">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
						<div className="flex items-center gap-2">
							<Button
								onClick={() => setScope("global")}
								variant={scope === "global" ? "default" : "outline"}
							>
								Global
							</Button>
							<Button
								onClick={() => setScope("warehouse")}
								variant={scope === "warehouse" ? "default" : "outline"}
							>
								Por almacén
							</Button>
						</div>
						<div className="grid gap-4 sm:grid-cols-2 lg:flex lg:items-end lg:gap-6">
							<DateSelector
								label="Inicio"
								date={effectiveRange.start}
								onChange={(next) =>
									setDateRange((prev) =>
										clampDateRange({ start: next, end: prev.end }),
									)
								}
							/>
							<DateSelector
								label="Fin"
								date={effectiveRange.end}
								onChange={(next) =>
									setDateRange((prev) =>
										clampDateRange({ start: prev.start, end: next }),
									)
								}
							/>
							{scope === "warehouse" ? (
								<div className="flex flex-col gap-2">
									<Label className="text-xs uppercase tracking-wide text-[#687076] dark:text-[#9BA1A6]">
										Almacén
									</Label>
									<Select
										onValueChange={(value) => setSelectedWarehouse(value)}
										value={selectedWarehouse ?? undefined}
									>
										<SelectTrigger className="w-[220px]">
											<SelectValue placeholder="Selecciona un almacén" />
										</SelectTrigger>
										<SelectContent>
											{warehouseOptions.map((option) => (
												<SelectItem key={option.id} value={option.id}>
													{option.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							) : null}
						</div>
					</div>
				</section>

				<MetricsGrid metrics={metrics} onMetricClick={handleMetricClick} />

				<PendingReceptionsDialog
					open={dialogType === "pending"}
					onOpenChange={(open) => setDialogType(open ? "pending" : null)}
					transfers={transferItems}
					warehouseNameMap={warehouseNameMap}
					effectiveRange={effectiveRange}
					effectiveWarehouseId={effectiveWarehouseId}
				/>

				<CompletedReceptionsDialog
					open={dialogType === "completed"}
					onOpenChange={(open) => setDialogType(open ? "completed" : null)}
					transfers={transferItems}
					warehouseNameMap={warehouseNameMap}
					effectiveRange={effectiveRange}
					effectiveWarehouseId={effectiveWarehouseId}
				/>

				<TodayReceptionsDialog
					open={dialogType === "today"}
					onOpenChange={(open) => setDialogType(open ? "today" : null)}
					transfers={transferItems}
					warehouseNameMap={warehouseNameMap}
					effectiveRange={effectiveRange}
					effectiveWarehouseId={effectiveWarehouseId}
				/>

				<section className="grid gap-4 xl:grid-cols-2">
					<LowStockTable
						items={lowStockItems}
						unfulfilledProducts={unfulfilledProducts}
						resolveProductName={resolveProductName}
						resolveWarehouseName={resolveWarehouseName}
						resolveProductId={resolveProductId}
					/>
					<Card className="card-transition">
						<CardHeader>
							<CardTitle className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">
								Estado de inventario
							</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-4">
							<div className="grid grid-cols-2 gap-4">
								<div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-center dark:border-[#2D3033] dark:bg-[#1E1F20]">
									<h3 className="text-sm text-[#687076] dark:text-[#9BA1A6]">
										Items en uso
									</h3>
									<p className="text-2xl font-semibold text-[#0a7ea4]">
										{usageBreakdown.inUse}
									</p>
								</div>
								<div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-center dark:border-[#2D3033] dark:bg-[#1E1F20]">
									<h3 className="text-sm text-[#687076] dark:text-[#9BA1A6]">
										Items disponibles
									</h3>
									<p className="text-2xl font-semibold text-[#11181C] dark:text-[#ECEDEE]">
										{usageBreakdown.idle}
									</p>
								</div>
							</div>
							<TopList
								title="Productos con más usos"
								topItems={usageBreakdown.topProducts}
								resolveProductName={resolveProductName}
								resolveProductId={resolveProductId}
							/>
						</CardContent>
					</Card>
					<section className="flex flex-col gap-4">
						<Card className="card-transition">
							<CardHeader>
								<CardTitle className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">
									Pedidos de reabastecimiento
								</CardTitle>
							</CardHeader>
							<CardContent className="grid gap-4">
								<div className="grid grid-cols-3 gap-4">
									<div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-center dark:border-[#2D3033] dark:bg-[#1E1F20]">
										<p className="text-xs uppercase text-[#9BA1A6]">Abiertos</p>
										<p className="text-xl font-semibold text-[#E85D04]">
											{orderMetrics.open}
										</p>
									</div>
									<div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-center dark:border-[#2D3033] dark:bg-[#1E1F20]">
										<p className="text-xs uppercase text-[#9BA1A6]">Enviados</p>
										<p className="text-xl font-semibold text-[#0a7ea4]">
											{orderMetrics.sent}
										</p>
									</div>
									<div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-center dark:border-[#2D3033] dark:bg-[#1E1F20]">
										<p className="text-xs uppercase text-[#9BA1A6]">
											Recibidos
										</p>
										<p className="text-xl font-semibold text-[#2E7D32]">
											{orderMetrics.received}
										</p>
									</div>
								</div>
								<div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm text-[#687076] dark:border-[#2D3033] dark:bg-[#1E1F20] dark:text-[#9BA1A6]">
									Promedio de días abiertos:{" "}
									<strong>{orderMetrics.averageAge}</strong>
								</div>
							</CardContent>
						</Card>
						<Card className="card-transition">
							<CardHeader>
								<CardTitle className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">
									Kits activos
								</CardTitle>
							</CardHeader>
							<CardContent className="grid gap-4">
								<div className="grid grid-cols-3 gap-4">
									<div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-center dark:border-[#2D3033] dark:bg-[#1E1F20]">
										<p className="text-xs uppercase text-[#9BA1A6]">Kits</p>
										<p className="text-xl font-semibold text-[#11181C] dark:text-[#ECEDEE]">
											{kitMetrics.totalKits}
										</p>
									</div>
									<div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-center dark:border-[#2D3033] dark:bg-[#1E1F20]">
										<p className="text-xs uppercase text-[#9BA1A6]">
											Items activos
										</p>
										<p className="text-xl font-semibold text-[#0a7ea4]">
											{kitMetrics.activeItems}
										</p>
									</div>
									<div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-center dark:border-[#2D3033] dark:bg-[#1E1F20]">
										<p className="text-xs uppercase text-[#9BA1A6]">
											Items devueltos
										</p>
										<p className="text-xl font-semibold text-[#2E7D32]">
											{kitMetrics.returnedItems}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</section>
				</section>

				<section className="grid gap-4 xl:grid-cols-2">
					<TrendChart
						title="Transferencias por día"
						points={transferTrend}
						accent="bg-[#0a7ea4]"
					/>
					<TrendChart
						title="Usos de productos por día"
						points={usageTrend}
						accent="bg-[#E85D04]"
					/>
				</section>

				<section className="grid gap-4 xl:grid-cols-2">
					<Card className="card-transition">
						<CardHeader className="flex flex-col gap-1">
							<CardTitle className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">
								Colaboradores con equipos activos
							</CardTitle>
							<span className="text-xs text-[#9BA1A6]">
								{employeeActivity.length} colaboradores con inventario en uso
							</span>
						</CardHeader>
						<CardContent>
							<EmployeeList items={employeeActivity} />
						</CardContent>
					</Card>
					<Card className="card-transition">
						<CardHeader>
							<CardTitle className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">
								Resumen de actividad
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm text-[#687076] dark:border-[#2D3033] dark:bg-[#1E1F20] dark:text-[#9BA1A6]">
								Se identificaron{" "}
								<strong>{usageBreakdown.inUse + usageBreakdown.idle}</strong>{" "}
								items bajo el alcance seleccionado, con{" "}
								<strong>{usageBreakdown.inUse}</strong> actualmente en uso.
							</div>
						</CardContent>
					</Card>
				</section>
			</div>
		</RoleGuard>
	);
}
