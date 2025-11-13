"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type {
	ColumnDef,
	ColumnFiltersState,
	PaginationState,
	SortingState,
} from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getDeletedAndEmptyProductStock } from "@/lib/fetch-functions/inventory";
import { createQueryKey } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";

/**
 * Type for deleted and empty product stock item from the API response.
 */
type DeletedAndEmptyItem = {
	id: string;
	description?: string | null;
	lastUsed?: string | null;
	numberOfUses?: number | null;
	warehouseId?: string | null;
	warehouseName?: string | null;
	currentWarehouse?: string | null;
	isEmpty?: boolean | null;
	isDeleted?: boolean | null;
};

/**
 * Formats an ISO date string to "dd/MM/yyyy" using the Spanish locale.
 *
 * @param dateString - The date input as a string (e.g., ISO 8601). May be undefined.
 * @returns The formatted date string in `dd/MM/yyyy` or `"N/A"` when input is missing or invalid.
 */
function formatDate(dateString: string | undefined | null): string {
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
 * Resolves warehouse name from warehouse ID using the warehouses map.
 *
 * @param warehouseId - The warehouse ID to resolve.
 * @param warehouseNameMap - Map of warehouse IDs to warehouse names.
 * @returns The warehouse name or a fallback string.
 */
function resolveWarehouseName(
	warehouseId: string | null | undefined,
	warehouseNameMap: Map<string, string> | null,
): string {
	if (!warehouseId) {
		return "Sin almacén asignado";
	}

	if (warehouseNameMap) {
		const warehouseName = warehouseNameMap.get(warehouseId);
		if (warehouseName) {
			return warehouseName;
		}
	}

	return `Almacén ${warehouseId}`;
}

interface DeletedAndEmptyTableProps {
	/** Map of warehouse IDs to warehouse names for resolving warehouse names */
	warehouseNameMap?: Map<string, string> | null;
}

/**
 * Renders a table displaying deleted and empty product stock items with filtering and pagination.
 *
 * The table shows product stock items that are either deleted or empty, with columns for description,
 * last used date, number of uses, warehouse name, and status badges. It includes global search,
 * warehouse filtering, sorting, and pagination controls.
 *
 * @param warehouseNameMap - Map of warehouse IDs to warehouse names used to resolve human-friendly warehouse names.
 */
export function DeletedAndEmptyTable({
	warehouseNameMap = null,
}: DeletedAndEmptyTableProps) {
	const { data: response } = useSuspenseQuery({
		queryKey: createQueryKey(queryKeys.deletedAndEmptyProductStock, ["all"]),
		queryFn: getDeletedAndEmptyProductStock,
	});

	// Extract data from response
	const items: DeletedAndEmptyItem[] = useMemo(() => {
		if (!response || typeof response !== "object") {
			return [];
		}

		if ("success" in response && response.success && "data" in response) {
			const data = response.data;
			if (Array.isArray(data)) {
				return data as DeletedAndEmptyItem[];
			}
		}

		// Fallback: if response is already an array
		if (Array.isArray(response)) {
			return response as DeletedAndEmptyItem[];
		}

		return [];
	}, [response]);

	// State for table features
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	// Extract unique warehouse IDs for filter options
	const warehouseFilterOptions = useMemo(() => {
		const warehouseSet = new Set<string>();
		for (const item of items) {
			// Use currentWarehouse if available, otherwise fall back to warehouseId
			const warehouseId = item.currentWarehouse ?? item.warehouseId;
			if (warehouseId) {
				warehouseSet.add(warehouseId);
			}
		}

		const options = Array.from(warehouseSet)
			.map((id) => ({
				value: id,
				label: resolveWarehouseName(id, warehouseNameMap),
			}))
			.sort((a, b) => a.label.localeCompare(b.label, "es"));

		return options;
	}, [items, warehouseNameMap]);

	// Filter items by warehouse
	const filteredItems = useMemo(() => {
		let result = items;

		// Apply warehouse filter
		if (warehouseFilter !== "all") {
			result = result.filter((item) => {
				// Use currentWarehouse if available, otherwise fall back to warehouseId
				const warehouseId = item.currentWarehouse ?? item.warehouseId;
				return warehouseId === warehouseFilter;
			});
		}

		return result;
	}, [items, warehouseFilter]);

	// Global filter function
	const globalFilterFn = useMemo(
		() =>
			(
				row: { original: DeletedAndEmptyItem },
				_columnId: string,
				value: string,
			) => {
				const item = row.original;
				const searchValue = value.toLowerCase();

				if (!value.trim()) {
					return true;
				}

				const description = item.description?.toLowerCase() ?? "";
				// Use currentWarehouse if available, otherwise fall back to warehouseId
				const warehouseId = item.currentWarehouse ?? item.warehouseId;
				const warehouseName = resolveWarehouseName(
					warehouseId,
					warehouseNameMap,
				).toLowerCase();
				const id = item.id?.toLowerCase() ?? "";

				return (
					description.includes(searchValue) ||
					warehouseName.includes(searchValue) ||
					id.includes(searchValue)
				);
			},
		[warehouseNameMap],
	);

	// Define table columns
	const columns = useMemo<ColumnDef<DeletedAndEmptyItem>[]>(
		() => [
			{
				accessorKey: "description",
				header: "Descripción",
				cell: ({ row }) => {
					const description = row.getValue("description") as
						| string
						| null
						| undefined;
					return (
						<div className="font-medium text-[#11181C] dark:text-[#ECEDEE]">
							{description || "Sin descripción"}
						</div>
					);
				},
			},
			{
				accessorKey: "lastUsed",
				header: "Último Uso",
				cell: ({ row }) => {
					const lastUsed = row.getValue("lastUsed") as
						| string
						| null
						| undefined;
					return (
						<div className="text-[#687076] text-sm dark:text-[#9BA1A6]">
							{formatDate(lastUsed)}
						</div>
					);
				},
			},
			{
				accessorKey: "numberOfUses",
				header: "# Usos",
				cell: ({ row }) => {
					const numberOfUses = row.getValue("numberOfUses") as
						| number
						| null
						| undefined;
					return (
						<div className="text-[#687076] text-sm dark:text-[#9BA1A6]">
							{numberOfUses ?? 0}
						</div>
					);
				},
			},
			{
				id: "warehouse",
				header: "Almacén",
				cell: ({ row }) => {
					const item = row.original;
					// Use currentWarehouse if available, otherwise fall back to warehouseId
					const warehouseId = item.currentWarehouse ?? item.warehouseId;
					return (
						<div className="text-[#687076] text-sm dark:text-[#9BA1A6]">
							{resolveWarehouseName(warehouseId, warehouseNameMap)}
						</div>
					);
				},
			},
			{
				id: "status",
				header: "Estado",
				cell: ({ row }) => {
					const item = row.original;
					const isDeleted = item.isDeleted ?? false;
					const isEmpty = item.isEmpty ?? false;

					return (
						<div className="flex gap-2">
							{isDeleted && (
								<Badge
									className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
									variant="secondary"
								>
									Eliminado
								</Badge>
							)}
							{isEmpty && (
								<Badge
									className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
									variant="secondary"
								>
									Vacío
								</Badge>
							)}
							{!isDeleted && !isEmpty && (
								<Badge
									className="bg-[#F3F4F6] text-[#374151] dark:bg-[#374151] dark:text-[#D1D5DB]"
									variant="secondary"
								>
									Sin estado
								</Badge>
							)}
						</div>
					);
				},
			},
		],
		[warehouseNameMap],
	);

	// Initialize the table
	const table = useReactTable({
		data: filteredItems,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		onPaginationChange: setPagination,
		globalFilterFn,
		state: {
			sorting,
			columnFilters,
			globalFilter,
			pagination,
		},
	});

	return (
		<Card className="card-transition flex h-full flex-col overflow-hidden">
			<CardHeader className="flex-shrink-0">
				<CardTitle className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">
					Productos Eliminados y Vacíos
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col space-y-4 overflow-hidden">
				{/* Filters */}
				<div className="flex flex-shrink-0 flex-wrap items-center gap-4">
					{/* Search Filter */}
					<div className="relative max-w-sm flex-1">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-[#687076] dark:text-[#9BA1A6]" />
						<Input
							className="border-[#E5E7EB] bg-white pr-10 pl-10 text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
							onChange={(e) => setGlobalFilter(e.target.value)}
							placeholder="Buscar por descripción, almacén o ID..."
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

					{/* Warehouse Filter */}
					{warehouseFilterOptions.length > 0 && (
						<div className="min-w-[200px]">
							<Select
								onValueChange={setWarehouseFilter}
								value={warehouseFilter}
							>
								<SelectTrigger className="border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]">
									<SelectValue placeholder="Todos los almacenes" />
								</SelectTrigger>
								<SelectContent className="border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
									<SelectItem
										className="text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
										value="all"
									>
										Todos los almacenes
									</SelectItem>
									{warehouseFilterOptions.map((option) => (
										<SelectItem
											className="text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
											key={option.value}
											value={option.value}
										>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Clear Filters */}
					{(globalFilter || warehouseFilter !== "all") && (
						<Button
							className="text-[#687076] hover:text-[#11181C] dark:text-[#9BA1A6] dark:hover:text-[#ECEDEE]"
							onClick={() => {
								setGlobalFilter("");
								setWarehouseFilter("all");
							}}
							size="sm"
							variant="ghost"
						>
							Limpiar filtros
						</Button>
					)}
				</div>

				{/* Table */}
				<div className="theme-transition flex flex-1 flex-col overflow-hidden rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
					<div className="flex-1 overflow-auto">
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
									<TableRow
										className="theme-transition border-[#E5E7EB] border-b hover:bg-[#F9FAFB] data-[state=selected]:bg-[#F9FAFB] dark:border-[#2D3033] dark:data-[state=selected]:bg-[#2D3033] dark:hover:bg-[#2D3033]"
										data-state={row.getIsSelected() && "selected"}
										key={row.id}
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
								))
							) : (
								<TableRow>
									<TableCell
										className="h-24 text-center"
										colSpan={columns.length}
									>
										No se encontraron productos eliminados o vacíos.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
					</div>
				</div>

				{/* Pagination Controls */}
				{filteredItems.length > 0 && (
					<div className="flex flex-shrink-0 items-center justify-between px-2">
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
									<SelectValue
										placeholder={table.getState().pagination.pageSize}
									/>
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
						{/* Results Counter */}
						<div className="whitespace-nowrap text-[#687076] text-sm dark:text-[#9BA1A6]">
							{table.getFilteredRowModel().rows.length} de{" "}
							{filteredItems.length} productos
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
				)}
			</CardContent>
		</Card>
	);
}
