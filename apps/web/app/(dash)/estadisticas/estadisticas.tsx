"use client";
"use memo";

import { useSuspenseQuery } from "@tanstack/react-query";
import { format, parseISO, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import { RoleGuard } from "@/components/auth-guard";
import { DashboardMetricCard } from "@/components/DashboardMetricCard";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getReplenishmentOrders } from "@/lib/fetch-functions/replenishment-orders";
import { getAllStockLimits } from "@/lib/fetch-functions/stock-limits";
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
type KitsResponse = Awaited<ReturnType<typeof getAllKits>> | null;
type StockLimitsResponse = Awaited<ReturnType<typeof getAllStockLimits>> | null;

type ScopeOption = "global" | "warehouse";

type EstadisticasPageProps = {
	userRole: string;
	warehouseId: string | null;
	isEncargado: boolean;
};

type WarehouseOption = {
	id: string;
	name: string;
};

type ProductNameMap = Map<number, string>;

type DashboardMetricShape = Parameters<typeof DashboardMetricCard>[0]["metric"];

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
	return ((response as { data: unknown[] }).data as unknown[])
		.map((raw) => {
			if (!raw || typeof raw !== "object") {
				return null;
			}
			const record = raw as Record<string, unknown>;
			const id = typeof record.id === "string" ? record.id : "";
			if (!id) {
				return null;
			}
			const code = typeof record.code === "string" ? record.code : "";
			const name =
				typeof record.name === "string" && record.name.trim().length > 0
					? record.name.trim()
					: code
						? `${code} (${id.slice(0, 6)})`
						: `Almacén ${id.slice(0, 6)}`;
			return { id, name } satisfies WarehouseOption;
		})
		.filter((item): item is WarehouseOption => Boolean(item));
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
						className="flex h-48 items-end gap-3"
						style={{ minWidth: `${minWidth}px` }}
					>
						{points.map((point) => {
							const value =
								max > 0 ? Math.max((point.count / max) * 100, 8) : 8;
							const isoString =
								point.date.length > 10 ? point.date : `${point.date}T00:00:00Z`;
							const labelDate = format(parseISO(isoString), "dd/MM", {
								locale: es,
							});
							return (
								<div
									className="flex flex-1 flex-col items-center gap-2"
									key={`${point.date}-${point.count}`}
								>
									<span className="text-xs font-medium text-[#687076] dark:text-[#9BA1A6]">
										{point.count}
									</span>
									<div
										aria-hidden
										className={cn(
											"w-7 rounded-full bg-[#0a7ea4] transition-all",
											accent,
										)}
										style={{ height: `${value}%` }}
									/>
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

const MetricsGrid = ({ metrics }: { metrics: DashboardMetricShape[] }) => (
	<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		{metrics.map((metric) => (
			<DashboardMetricCard key={metric.label} metric={metric} />
		))}
	</div>
);

const LowStockTable = ({
	items,
	resolveProductName,
	resolveWarehouseName,
	resolveProductId,
}: {
	items: LowStockItem[];
	resolveProductName: (
		barcode: number,
		fallbackDescription?: string | null,
	) => string;
	resolveWarehouseName: (id: string) => string;
	resolveProductId: (
		barcode: number,
		fallbackId?: string | null,
	) => string | null;
}) => (
	<Card className="card-transition">
		<CardHeader>
			<CardTitle className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">
				Productos por debajo del mínimo
			</CardTitle>
		</CardHeader>
		<CardContent>
			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-6 text-center text-sm text-[#687076] dark:border-[#2D3033] dark:bg-[#1E1F20] dark:text-[#9BA1A6]">
					No se detectaron productos con stock bajo en el rango y alcance
					seleccionados.
				</div>
			) : (
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
								<TableRow key={`${item.warehouseId}-${item.barcode}`}>
									<TableCell>
										<div className="flex flex-col">
											<span className="font-medium text-[#11181C] dark:text-[#ECEDEE]">
												{productName}
											</span>
											<span className="text-xs text-[#9BA1A6]">
												{productIdSuffix ? `ID ${productIdSuffix}` : "ID —"} • #
												{item.barcode}
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
			)}
		</CardContent>
	</Card>
);

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
		queryKey: createQueryKey(queryKeys.stockLimits, ["all"]),
		queryFn: getAllStockLimits,
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

	const warehouseOptions = useMemo(
		() => normalizeWarehouses(warehousesResponse),
		[warehousesResponse],
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

	const resolveProductName = (
		barcode: number,
		fallbackDescription?: string | null,
	) => {
		if (fallbackDescription && fallbackDescription.trim().length > 0) {
			return fallbackDescription.trim();
		}
		const fromDetails = productDetailsByBarcode.get(barcode)?.name;
		if (fromDetails && fromDetails.trim().length > 0) {
			return fromDetails;
		}
		return productCatalogNameMap.get(barcode) ?? `Producto ${barcode}`;
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

				<MetricsGrid metrics={metrics} />

				<section className="grid gap-4 xl:grid-cols-2">
					<LowStockTable
						items={lowStockItems}
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
				</section>

				<section className="grid gap-4 xl:grid-cols-2">
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
									<p className="text-xs uppercase text-[#9BA1A6]">Recibidos</p>
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
