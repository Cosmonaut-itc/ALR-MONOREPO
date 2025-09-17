"use client";

import type { FilterFn } from "@tanstack/react-table";
import {
	type ColumnDef,
	type ColumnFiltersState,
	type ExpandedState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	Copy,
	Package,
	Search,
	Trash2,
	X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { useDisposalStore } from "@/stores/disposal-store";
import type { StockItemWithEmployee } from "@/stores/inventory-store";
import { type StockItem, useInventoryStore } from "@/stores/inventory-store";
import type {
	ProductCatalogItem,
	ProductCatalogResponse,
	WarehouseMap,
} from "@/types";
import { DisposeItemDialog } from "./DisposeItemDialog";

// Type for product with inventory data
type ProductWithInventory = {
	barcode: number;
	name: string;
	category: string;
	description: string;
	stockCount: number;
	inventoryItems: StockItemWithEmployee[];
};

// Type for individual inventory item display
type InventoryItemDisplay = {
	id?: string;
	uuid?: string;
	barcode: number;
	lastUsed?: string;
	lastUsedBy?: string;
	numberOfUses?: number;
	isBeingUsed?: boolean;
	firstUsed?: string;
	currentWarehouse?: string;
};

interface ProductCatalogTableProps {
	/** Raw inventory data from the API */
	inventory: StockItemWithEmployee[] | null;
	/** Raw product catalog data from the API */
	productCatalog: ProductCatalogResponse | null;
	/** Warehouse to filter for (1 = general, 2 = gabinete) */
	warehouse?: string;
	/** Enable selection controls within expanded rows (for transfers) */
	enableSelection?: boolean;
	/** Enable dispose controls within expanded rows (for disposals) */
	enableDispose?: boolean;
	/** Callback to add selected expanded-row items for a product (used by transfer page) */
	onAddToTransfer?: (args: {
		product: ProductWithInventory;
		items: InventoryItemDisplay[];
	}) => void;
	/** List of UUIDs that are already in transfer (to disable checkboxes) */
	disabledUUIDs?: Set<string>;
	/** Optional warehouse map response for resolving warehouse names */
	warehouseMap?: WarehouseMap | null;
}

type WarehouseMappingEntry = {
	cabinetId: string;
	cabinetName: string;
	warehouseId: string;
	warehouseName: string;
};

/**
 * Type guard that checks whether a warehouse map response indicates success and contains mapping entries.
 *
 * Returns true when `map` is a non-null object with a truthy `success` property; in that case the type narrows to
 * `{ success: true; message: string; data: WarehouseMappingEntry[] }`.
 *
 * @param map - The warehouse map response to test (may be null or undefined).
 * @returns True if `map` represents a successful warehouse map response with mapping data.
 */
function isWarehouseMapSuccess(
	map: WarehouseMap | null | undefined,
): map is { success: true; message: string; data: WarehouseMappingEntry[] } {
	return Boolean(
		map && typeof map === "object" && "success" in map && map.success,
	);
}

// Removed WeakMap cache to avoid stale data; compute item data each render

// Helper to extract inventory item data safely
/**
 * Converts a raw stock item (optionally including employee info) into the normalized InventoryItemDisplay used by the UI.
 *
 * When fields are missing or malformed this function supplies safe defaults:
 * - Generates stable-ish fallback `id`/`uuid` values when none are present.
 * - Normalizes `barcode`, `numberOfUses`, and boolean `isBeingUsed` to sensible defaults.
 * - Combines employee `name` and `surname` to populate `lastUsedBy` when available, otherwise falls back to stock's `lastUsedBy`.
 * - Ensures `firstUsed` is present (current timestamp when absent) and coerces `currentWarehouse` to a string when available.
 *
 * @param item - A StockItemWithEmployee object (may be undefined/null-like); the function will not throw for missing properties.
 * @returns An InventoryItemDisplay with all required display fields populated (using fallbacks where necessary).
 */
function extractInventoryItemData(
	item: StockItemWithEmployee,
): InventoryItemDisplay {
	if (item && typeof item === "object" && "productStock" in item) {
		const itemStock = (item as { productStock: StockItem }).productStock;
		const employee = (
			item as { employee?: { name?: string; surname?: string } }
		).employee;

		const fallbackId = Math.random().toString();
		const idValue = itemStock.id || fallbackId;
		const employeeFullName = employee?.name
			? `${employee.name}${employee?.surname ? ` ${employee.surname}` : ""}`
			: undefined;
		const lastUsedBy = employeeFullName || itemStock.lastUsedBy || undefined;

		const result: InventoryItemDisplay = {
			id: idValue,
			uuid: itemStock.id || `uuid-${itemStock.id || fallbackId}`,
			barcode: itemStock.barcode || 0,
			lastUsed: itemStock.lastUsed || undefined,
			lastUsedBy,
			numberOfUses: itemStock.numberOfUses || 0,
			isBeingUsed: itemStock.isBeingUsed ?? false,
			firstUsed: itemStock.firstUsed || new Date().toISOString(),
			currentWarehouse: itemStock.currentWarehouse
				? itemStock.currentWarehouse.toString()
				: undefined,
		};

		return result;
	}

	return {
		id: Math.random().toString(),
		uuid: `uuid-${Math.random()}`,
		barcode: 0,
		numberOfUses: 0,
		isBeingUsed: false,
		firstUsed: new Date().toISOString(),
		currentWarehouse: undefined,
	};
}

/**
 * Derives a warehouse identifier string from a stock item, with safe fallbacks.
 *
 * Attempts to return item.currentCabinet first, then item.currentWarehouse. If
 * `item` is missing, not an object, or neither field is a string, returns the
 * default identifier `"1"` (general warehouse).
 *
 * @param item - The stock item object (may be null/undefined or a partial shape); expected keys: `currentCabinet`, `currentWarehouse`.
 * @returns The warehouse identifier to use for grouping inventory items (defaults to `"1"`).
 */
function getItemWarehouse(item: StockItem): string {
	if (!item || typeof item !== "object") {
		return "1";
	}

	const obj = item as { currentWarehouse?: string; currentCabinet?: string };
	const currentWarehouse = obj.currentWarehouse;
	const currentCabinet = obj.currentCabinet;
	if (currentCabinet && typeof currentCabinet === "string") {
		return currentCabinet;
	}
	if (currentWarehouse && typeof currentWarehouse === "string") {
		return currentWarehouse;
	}

	return "1"; // Default to general warehouse
}

/**
 * Returns the numeric barcode from a stock item or 0 if unavailable.
 *
 * @param item - Stock item object that may contain a numeric `barcode` field.
 * @returns The `barcode` value when present and a number; otherwise `0`.
 */
function getItemBarcode(item: StockItem): number {
	if (item && typeof item === "object" && "barcode" in item) {
		const barcode = (item as { barcode: number }).barcode;
		if (barcode && typeof barcode === "number") {
			return barcode;
		}
	}
	return 0;
}

/**
 * Formats an ISO date string to "dd/MM/yyyy" using the Spanish locale.
 *
 * If `dateString` is falsy or cannot be parsed as a valid date, returns `"N/A"`.
 *
 * @param dateString - The date input as a string (e.g., ISO 8601). May be undefined.
 * @returns The formatted date string in `dd/MM/yyyy` or `"N/A"` when input is missing or invalid.
 */
function formatDate(dateString: string | undefined): string {
	if (!dateString) {
		return "N/A";
	}
	try {
		return format(new Date(dateString), "dd/MM/yyyy", { locale: es });
	} catch {
		return "N/A";
	}
}

/**
 * Renders a product catalog table with per-product expandable inventory details.
 *
 * The table shows products derived from `productCatalog` and inventory items from `inventory`,
 * supports global search (product name, barcode, UUID), category filtering, sorting, pagination,
 * and per-product expansion to view grouped inventory items by warehouse. Expanded item lists
 * display UUID (with copy-to-clipboard), usage metadata, status, and optional dispose actions.
 * When `enableSelection` is true the expanded view allows selecting items and adding them to a
 * transfer via `onAddToTransfer`. The component also writes incoming inventory and product
 * catalog data into the inventory store and uses the disposal store to open the dispose dialog.
 *
 * @param inventory - Raw inventory payload (used to populate the inventory store).
 * @param productCatalog - API product catalog response (transformed and stored for table data).
 * @param warehouse - Optional warehouse identifier to filter inventory items per product.
 * @param enableSelection - When true, enables per-item selection and "Agregar a transferencia".
 * @param onAddToTransfer - Callback invoked with { product, items } when items are added to a transfer.
 * @param disabledUUIDs - Set of item UUIDs that should be rendered disabled for selection.
 * @param enableDispose - When true, shows a per-item dispose action that opens the dispose dialog.
 * @param warehouseMap - Optional warehouse mapping response used to resolve human-friendly warehouse names.
 */
export function ProductCatalogTable({
	inventory,
	productCatalog,
	warehouse,
	enableSelection = false,
	onAddToTransfer,
	disabledUUIDs = new Set(),
	enableDispose = false,
	warehouseMap = null,
}: ProductCatalogTableProps) {
	// Disposal store for dispose dialog
	const { show: showDisposeDialog } = useDisposalStore();

	// Inventory store for setting global state
	const {
		setProductCatalog,
		setInventoryData,
		setCategories,
		productCatalog: storedProductCatalog,
		inventoryData: storedInventoryData,
	} = useInventoryStore();

	const warehouseEntries = useMemo<WarehouseMappingEntry[]>(() => {
		if (isWarehouseMapSuccess(warehouseMap)) {
			return Array.isArray(warehouseMap.data)
				? (warehouseMap.data as WarehouseMappingEntry[])
				: [];
		}
		return [];
	}, [warehouseMap]);

	const warehouseNameLookup = useMemo(() => {
		const lookup = new Map<string, string>();
		for (const entry of warehouseEntries) {
			if (entry?.warehouseId) {
				lookup.set(entry.warehouseId, entry.warehouseName ?? entry.warehouseId);
			}
		}
		return lookup;
	}, [warehouseEntries]);

	const resolveWarehouseName = useCallback(
		(warehouseId?: string | null) => {
			const id = warehouseId?.toString().trim() ?? "";
			if (!id) {
				return "Sin almacén asignado";
			}
			const mappedName = warehouseNameLookup.get(id);
			if (mappedName) {
				return mappedName;
			}
			return id.length > 8 ? `Almacén ${id.slice(0, 8)}...` : `Almacén ${id}`;
		},
		[warehouseNameLookup],
	);

	// Set inventory data in store
	useEffect(() => {
		if (inventory) {
			setInventoryData(inventory);
		}
	}, [inventory, setInventoryData]);

	// Set product catalog data in store
	useEffect(() => {
		if (productCatalog?.success && productCatalog.data) {
			// Transform API product data to match our expected structure
			const transformedProducts = productCatalog.data.map(
				(product: ProductCatalogItem) => {
					return {
						barcode: Number.parseInt(product.barcode, 10) || product.good_id,
						name: product.title || "Producto sin nombre",
						category: product.category || "Sin categoría",
						description: product.comment || "Sin descripción",
					};
				},
			);

			setProductCatalog(transformedProducts);

			// Extract unique categories from product catalog
			const uniqueCategories = Array.from(
				new Set(
					transformedProducts
						.map((product) => product.category)
						.filter(Boolean),
				),
			);
			setCategories(uniqueCategories);
		}
	}, [productCatalog, setProductCatalog, setCategories]);

	// Create products with inventory items for the specified warehouse
	const products = useMemo(() => {
		const hasProductCatalog = storedProductCatalog.length > 0;
		if (!hasProductCatalog) {
			return [];
		}

		return storedProductCatalog.map((product) => {
			// Get all inventory items for this product in the specified warehouse
			if (!storedInventoryData) {
				return {
					...product,
					inventoryItems: [],
					stockCount: 0,
				};
			}

			const inventoryItems: StockItemWithEmployee[] =
				storedInventoryData?.filter((item) => {
					const itemStock = (item as { productStock: StockItem }).productStock;
					return (
						getItemBarcode(itemStock) === product.barcode &&
						getItemWarehouse(itemStock) === warehouse?.toString()
					);
				});

			return {
				...product,
				inventoryItems,
				stockCount: inventoryItems.length,
			};
		});
	}, [storedProductCatalog, storedInventoryData, warehouse]);

	// State for table features
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [expanded, setExpanded] = useState<ExpandedState>({});
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	// Per-product selection state for expanded rows (barcode -> Set of UUIDs)
	const [selectedByBarcode, setSelectedByBarcode] = useState<
		Record<number, Set<string>>
	>({});

	// Extract unique categories from products
	const uniqueCategories = useMemo(() => {
		const categories = products.map((product) => product.category);
		return Array.from(new Set(categories)).sort();
	}, [products]);

	// Custom global filter function - split into smaller functions to reduce complexity
	const searchInProduct = useMemo(
		() => (product: ProductWithInventory, searchValue: string) => {
			return (
				product.name.toLowerCase().includes(searchValue) ||
				product.barcode.toString().includes(searchValue) ||
				product.category.toLowerCase().includes(searchValue)
			);
		},
		[],
	);

	const searchInInventoryItems = useMemo(
		() => (items: StockItemWithEmployee[], searchValue: string) => {
			for (const item of items) {
				const itemData = extractInventoryItemData(item);
				if (itemData.id?.toLowerCase().includes(searchValue)) {
					return true;
				}
			}
			return false;
		},
		[],
	);

	const globalFilterFn = useMemo(
		() =>
			(
				row: { original: ProductWithInventory },
				_columnId: string,
				value: string,
			) => {
				const product = row.original;
				const searchValue = value.toLowerCase();

				// If no search term, show all products (that match category filter)
				if (!value.trim()) {
					return true;
				}

				// Apply global search filter
				return (
					searchInProduct(product, searchValue) ||
					searchInInventoryItems(product.inventoryItems, searchValue)
				);
			},
		[searchInProduct, searchInInventoryItems],
	);

	// Handle category filter changes
	const handleCategoryFilterChange = (value: string) => {
		setCategoryFilter(value);
	};

	// Category equality filter for the category column
	const categoryFilterFn: FilterFn<ProductWithInventory> = useMemo(
		() => (row, columnId, filterValue) => {
			if (!filterValue) {
				return true;
			}
			const rowValue = row.getValue(columnId) as string | undefined;
			return (rowValue ?? "") === filterValue;
		},
		[],
	);

	// Utility functions - memoized to prevent recreating on every render
	const copyToClipboard = useMemo(
		() => async (text: string) => {
			try {
				await navigator.clipboard.writeText(text);
				toast.success("UUID copiado al portapapeles", {
					description: `${text.slice(0, 8)}... ha sido copiado exitosamente`,
					duration: 2000,
				});
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Used for debugging
				console.error("Error copying to clipboard:", error);
				toast.error("Error al copiar UUID", {
					description: "No se pudo copiar el UUID al portapapeles",
					duration: 3000,
				});
			}
		},
		[],
	);

	const renderSubComponent = useMemo(
		() =>
			({ row }: { row: { original: ProductWithInventory } }) => {
				const product = row.original as ProductWithInventory;
				const selectionEnabledRef = enableSelection === true;
				const productSelection =
					selectedByBarcode[product.barcode] || new Set<string>();
				const detailColumnCount = enableDispose ? 7 : 6;

				type DisplayItem = {
					key: string;
					warehouseKey: string;
					data: InventoryItemDisplay;
				};

				const displayItems: DisplayItem[] = product.inventoryItems.map(
					(item) => {
						const data = extractInventoryItemData(item);
						const key = data.uuid || data.id || "";
						const warehouseKey = data.currentWarehouse ?? "unassigned";
						return { data, key, warehouseKey };
					},
				);

				const selectedCount = displayItems.reduce((acc, item) => {
					return item.key && productSelection.has(item.key) ? acc + 1 : acc;
				}, 0);

				const toggleUUID = (identifier: string, enabled: boolean) => {
					if (!identifier) {
						return;
					}
					setSelectedByBarcode((prev) => {
						const currentSet = prev[product.barcode] || new Set<string>();
						const nextSet = new Set(currentSet);
						if (enabled) {
							nextSet.add(identifier);
						} else {
							nextSet.delete(identifier);
						}
						return { ...prev, [product.barcode]: nextSet };
					});
				};

				const handleAddToTransfer = () => {
					if (!onAddToTransfer) {
						return;
					}
					const selectedItems = displayItems
						.filter((item) => item.key && productSelection.has(item.key))
						.map((item) => item.data);
					onAddToTransfer({ product, items: selectedItems });
					setSelectedByBarcode((prev) => ({
						...prev,
						[product.barcode]: new Set<string>(),
					}));
					if (selectedItems.length > 0) {
						toast.success("Agregado a transferencia", {
							description: `${selectedItems.length} item(s) agregado(s) desde ${product.name}`,
							duration: 2000,
						});
					}
				};

				if (displayItems.length === 0) {
					return (
						<div className="border-[#E5E7EB] border-b bg-[#F8FAFC] p-4 text-center dark:border-[#374151] dark:bg-[#1A1B1C]">
							<p className="text-[#687076] text-sm dark:text-[#9BA1A6]">
								No hay items en inventario para este producto
							</p>
						</div>
					);
				}

				const groupedByWarehouse = displayItems.reduce((acc, item) => {
					const locationKey = item.warehouseKey || "unassigned";
					const bucket = acc.get(locationKey);
					if (bucket) {
						bucket.items.push(item);
					} else {
						acc.set(locationKey, {
							label: resolveWarehouseName(item.data.currentWarehouse),
							items: [item],
						});
					}
					return acc;
				}, new Map<string, { label: string; items: DisplayItem[] }>());

				const warehouseGroups = Array.from(groupedByWarehouse.entries());

				return (
					<div className="border-[#E5E7EB] border-b bg-[#F8FAFC] p-4 dark:border-[#374151] dark:bg-[#1A1B1C]">
						<div className="mb-3 flex items-center justify-between">
							<h4 className="font-medium text-[#11181C] text-sm dark:text-[#ECEDEE]">
								Inventario detallado ({displayItems.length} items)
							</h4>
							{selectionEnabledRef && (
								<Button
									className="h-8 px-3"
									disabled={selectedCount === 0}
									onClick={handleAddToTransfer}
									size="sm"
								>
									Agregar a transferencia ({selectedCount})
								</Button>
							)}
						</div>
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow className="border-[#E5E7EB] border-b dark:border-[#374151]">
										<TableHead className="font-medium text-[#687076] text-xs dark:text-[#9BA1A6]">
											UUID
										</TableHead>
										<TableHead className="font-medium text-[#687076] text-xs dark:text-[#9BA1A6]">
											Último Uso
										</TableHead>
										<TableHead className="font-medium text-[#687076] text-xs dark:text-[#9BA1A6]">
											Usado Por
										</TableHead>
										<TableHead className="font-medium text-[#687076] text-xs dark:text-[#9BA1A6]">
											# Usos
										</TableHead>
										<TableHead className="font-medium text-[#687076] text-xs dark:text-[#9BA1A6]">
											Estado
										</TableHead>
										<TableHead className="font-medium text-[#687076] text-xs dark:text-[#9BA1A6]">
											Primer Uso
										</TableHead>
										{enableDispose && (
											<TableHead className="font-medium text-[#687076] text-xs dark:text-[#9BA1A6]">
												Acciones
											</TableHead>
										)}
									</TableRow>
								</TableHeader>
								<TableBody>
									{warehouseGroups.map(([groupKey, group]) => (
										<React.Fragment key={groupKey}>
											<TableRow className="bg-[#EAEDF0] text-[#11181C] text-left text-xs uppercase tracking-wide dark:bg-[#252729] dark:text-[#ECEDEE]">
												<TableCell
													colSpan={detailColumnCount}
													className="font-semibold"
												>
													<div className="flex items-center justify-between">
														<span>{group.label}</span>
														<span className="text-[#687076] text-xs dark:text-[#9BA1A6]">
															{group.items.length} item(s)
														</span>
													</div>
												</TableCell>
											</TableRow>
											{group.items.map((item) => {
												const { data, key: selectionKey } = item;
												const isSelected = selectionKey
													? productSelection.has(selectionKey)
													: false;
												const isDisabled =
													data.isBeingUsed ||
													(selectionKey
														? disabledUUIDs.has(selectionKey)
														: false);

												return (
													<TableRow
														className="border-[#E5E7EB] border-b last:border-b-0 dark:border-[#374151]"
														key={selectionKey || data.id}
													>
														<TableCell className="font-mono text-[#687076] text-xs dark:text-[#9BA1A6]">
															<div className="flex items-center gap-2">
																{selectionEnabledRef && (
																	<Checkbox
																		checked={isSelected}
																		disabled={isDisabled}
																		onCheckedChange={(checked) =>
																			toggleUUID(selectionKey, Boolean(checked))
																		}
																	/>
																)}
																<span className="truncate">
																	{(data.id || "").slice(0, 8)}...
																</span>
																<Button
																	className="h-4 w-4 p-0 hover:bg-[#E5E7EB] dark:hover:bg-[#2D3033]"
																	onClick={() => {
																		copyToClipboard(data.uuid || data.id || "");
																	}}
																	size="sm"
																	variant="ghost"
																>
																	<Copy className="h-3 w-3" />
																</Button>
															</div>
														</TableCell>
														<TableCell className="text-[#687076] text-xs dark:text-[#9BA1A6]">
															{formatDate(data.lastUsed)}
														</TableCell>
														<TableCell className="text-[#687076] text-xs dark:text-[#9BA1A6]">
															{data.lastUsedBy || "N/A"}
														</TableCell>
														<TableCell className="text-[#687076] text-xs dark:text-[#9BA1A6]">
															{data.numberOfUses}
														</TableCell>
														<TableCell>
															<Badge
																className={
																	data.isBeingUsed
																		? "bg-[#EF4444] text-white text-xs"
																		: "bg-[#10B981] text-white text-xs"
																}
																variant={
																	data.isBeingUsed ? "destructive" : "default"
																}
															>
																{data.isBeingUsed ? "En Uso" : "Disponible"}
															</Badge>
														</TableCell>
														<TableCell className="text-[#687076] text-xs dark:text-[#9BA1A6]">
															{formatDate(data.firstUsed)}
														</TableCell>
														<TableCell>
															{enableDispose && (
																<Button
																	className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
																	onClick={() => {
																		showDisposeDialog({
																			id: data.id || "",
																			uuid: data.id || "",
																			barcode: product.barcode,
																			productInfo: {
																				name: product.name,
																				category: product.category,
																				description: product.description,
																			},
																		});
																	}}
																	size="sm"
																	title="Dar de baja artículo"
																	variant="ghost"
																>
																	<Trash2 className="h-4 w-4" />
																</Button>
															)}
														</TableCell>
													</TableRow>
												);
											})}
										</React.Fragment>
									))}
								</TableBody>
							</Table>
						</div>
					</div>
				);
			},
		[
			copyToClipboard,
			enableSelection,
			onAddToTransfer,
			selectedByBarcode,
			disabledUUIDs,
			showDisposeDialog,
			enableDispose,
			resolveWarehouseName,
		],
	);

	// Define table columns using useMemo for stable reference
	const columns = useMemo<ColumnDef<ProductWithInventory>[]>(
		() => [
			{
				id: "expander",
				header: () => null,
				cell: ({ row }) => {
					return (
						<Button
							className="h-6 w-6 p-0"
							onClick={() => row.toggleExpanded()}
							size="sm"
							variant="ghost"
						>
							{row.getIsExpanded() ? (
								<ChevronUp className="h-4 w-4" />
							) : (
								<ChevronDown className="h-4 w-4" />
							)}
						</Button>
					);
				},
				enableSorting: false,
			},
			{
				accessorKey: "barcode",
				header: "Código de Barras",
				cell: ({ row }) => (
					<div className="font-mono text-[#687076] text-sm dark:text-[#9BA1A6]">
						{row.getValue("barcode")}
					</div>
				),
			},
			{
				accessorKey: "name",
				header: "Producto",
				cell: ({ row }) => {
					const product = row.original;
					return (
						<div className="font-medium text-[#11181C] dark:text-[#ECEDEE]">
							<div>{product.name}</div>
							<div className="text-[#687076] text-xs dark:text-[#9BA1A6]">
								{product.description}
							</div>
						</div>
					);
				},
				filterFn: "includesString",
			},
			{
				accessorKey: "category",
				header: "Categoría",
				cell: ({ row }) => (
					<Badge
						className="bg-[#F3F4F6] text-[#374151] dark:bg-[#374151] dark:text-[#D1D5DB]"
						variant="secondary"
					>
						{row.getValue("category")}
					</Badge>
				),
				filterFn: categoryFilterFn,
			},
			{
				accessorKey: "stockCount",
				header: "Stock",
				cell: ({ row }) => {
					const stockCount = row.getValue("stockCount") as number;
					return (
						<Badge
							className={
								stockCount > 0
									? "bg-[#10B981] text-white"
									: "bg-[#F3F4F6] text-[#6B7280] dark:bg-[#374151] dark:text-[#9CA3AF]"
							}
							variant={stockCount > 0 ? "default" : "secondary"}
						>
							{stockCount} unidades
						</Badge>
					);
				},
			},
		],
		[categoryFilterFn],
	);

	// Initialize the table
	const table = useReactTable({
		data: products,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		onExpandedChange: setExpanded,
		onPaginationChange: setPagination,
		globalFilterFn,
		state: {
			sorting,
			columnFilters,
			globalFilter,
			expanded,
			pagination,
		},
		getRowCanExpand: () => true,
	});

	// Keep the table's category column filter in sync with the select value
	useEffect(() => {
		const categoryColumn = table.getColumn("category");
		if (!categoryColumn) {
			return;
		}
		categoryColumn.setFilterValue(
			categoryFilter === "all" ? undefined : categoryFilter,
		);
	}, [categoryFilter, table]);

	if (products.length === 0) {
		return (
			<Card className="theme-transition border-[#E5E7EB] bg-white dark:border-[#374151] dark:bg-[#1E1F20]">
				<CardContent className="flex flex-col items-center justify-center py-12">
					<Package className="h-12 w-12 text-[#9CA3AF] dark:text-[#6B7280]" />
					<h3 className="mt-4 font-semibold text-[#11181C] dark:text-[#ECEDEE]">
						No hay productos
					</h3>
					<p className="mt-2 text-center text-[#687076] text-sm dark:text-[#9BA1A6]">
						No se encontraron productos que coincidan con los filtros aplicados.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{/* Dispose Item Dialog */}
			<DisposeItemDialog />

			{/* Filters */}
			<div className="flex items-center space-x-4">
				{/* Search Filter */}
				<div className="relative max-w-sm flex-1">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-[#687076] dark:text-[#9BA1A6]" />
					<Input
						className="border-[#E5E7EB] bg-white pr-10 pl-10 text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
						onChange={(e) => setGlobalFilter(e.target.value)}
						placeholder="Buscar por producto, código de barras o UUID..."
						value={globalFilter}
					/>
					{globalFilter && (
						<Button
							className="-translate-y-1/2 absolute top-1/2 right-1 h-6 w-6 p-0 hover:bg-[#E5E7EB] dark:hover:bg-[#2D3033]"
							onClick={() => setGlobalFilter("")}
							size="sm"
							variant="ghost"
						>
							<X className="h-3 w-3" />
						</Button>
					)}
				</div>

				{/* Category Filter */}
				<div className="min-w-[180px]">
					<Select
						onValueChange={handleCategoryFilterChange}
						value={categoryFilter}
					>
						<SelectTrigger className="border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]">
							<SelectValue placeholder="Todas las categorías" />
						</SelectTrigger>
						<SelectContent className="border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
							<SelectItem
								className="text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
								value="all"
							>
								Todas las categorías
							</SelectItem>
							{uniqueCategories.map((category) => (
								<SelectItem
									className="text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
									key={category}
									value={category}
								>
									{category}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Clear All Filters */}
				{(globalFilter || categoryFilter !== "all") && (
					<Button
						className="text-[#687076] hover:text-[#11181C] dark:text-[#9BA1A6] dark:hover:text-[#ECEDEE]"
						onClick={() => {
							setGlobalFilter("");
							setCategoryFilter("all");
						}}
						size="sm"
						variant="ghost"
					>
						Limpiar filtros
					</Button>
				)}

				{/* Results Counter */}
				<div className="whitespace-nowrap text-[#687076] text-sm dark:text-[#9BA1A6]">
					{table.getFilteredRowModel().rows.length} de {products.length}{" "}
					productos
				</div>
			</div>

			{/* Table */}
			<div className="theme-transition rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow
								className="border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]"
								key={headerGroup.id}
							>
								{headerGroup.headers.map((header) => (
									<TableHead
										className="font-medium text-[#11181C] dark:text-[#ECEDEE]"
										key={header.id}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<React.Fragment key={row.id}>
									{/* Main row */}
									<TableRow
										className="theme-transition border-[#E5E7EB] border-b hover:bg-[#F9FAFB] data-[state=selected]:bg-[#F9FAFB] dark:border-[#2D3033] dark:data-[state=selected]:bg-[#2D3033] dark:hover:bg-[#2D3033]"
										data-state={row.getIsSelected() && "selected"}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
									{/* Expanded row */}
									{row.getIsExpanded() && (
										<TableRow key={`${row.id}-expanded`}>
											<TableCell className="p-0" colSpan={columns.length}>
												{renderSubComponent({ row })}
											</TableCell>
										</TableRow>
									)}
								</React.Fragment>
							))
						) : (
							<TableRow>
								<TableCell
									className="h-24 text-center"
									colSpan={columns.length}
								>
									No se encontraron productos.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination Controls */}
			<div className="flex items-center justify-between px-2">
				<div className="flex items-center space-x-2">
					<p className="text-[#687076] text-sm dark:text-[#9BA1A6]">
						Filas por página
					</p>
					<Select
						onValueChange={(value) => {
							table.setPageSize(Number(value));
						}}
						value={`${table.getState().pagination.pageSize}`}
					>
						<SelectTrigger className="h-8 w-[70px] border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]">
							<SelectValue placeholder={table.getState().pagination.pageSize} />
						</SelectTrigger>
						<SelectContent
							className="theme-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]"
							side="top"
						>
							{[5, 10, 20, 30, 40, 50].map((pageSize) => (
								<SelectItem
									className="theme-transition text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
									key={pageSize}
									value={`${pageSize}`}
								>
									{pageSize}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center space-x-6 lg:space-x-8">
					<div className="theme-transition flex w-[100px] items-center justify-center font-medium text-[#687076] text-sm dark:text-[#9BA1A6]">
						Página {table.getState().pagination.pageIndex + 1} de{" "}
						{table.getPageCount()}
					</div>
					<div className="flex items-center space-x-2">
						<Button
							className="theme-transition h-8 w-8 border-[#E5E7EB] p-0 text-[#687076] hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:text-[#9BA1A6] dark:hover:bg-[#2D3033]"
							disabled={!table.getCanPreviousPage()}
							onClick={() => table.previousPage()}
							variant="outline"
						>
							<span className="sr-only">Ir a la página anterior</span>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<Button
							className="theme-transition h-8 w-8 border-[#E5E7EB] p-0 text-[#687076] hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:text-[#9BA1A6] dark:hover:bg-[#2D3033]"
							disabled={!table.getCanNextPage()}
							onClick={() => table.nextPage()}
							variant="outline"
						>
							<span className="sr-only">Ir a la página siguiente</span>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
