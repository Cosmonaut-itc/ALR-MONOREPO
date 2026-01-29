"use client";

import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type ColumnDef,
	type ColumnFiltersState,
	type PaginationState,
	type RowData,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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

type DataTableProps<TData extends RowData, TValue> = {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	enableSorting?: boolean;
	enableFiltering?: boolean;
	enablePagination?: boolean;
	pageSizeOptions?: number[];
	globalFilter?: string;
	onGlobalFilterChange?: (value: string) => void;
	sorting?: SortingState;
	onSortingChange?: (updater: SortingState | ((prev: SortingState) => SortingState)) => void;
	columnFilters?: ColumnFiltersState;
	onColumnFiltersChange?: (
		updater:
			| ColumnFiltersState
			| ((prev: ColumnFiltersState) => ColumnFiltersState),
	) => void;
	pagination?: PaginationState;
	onPaginationChange?: (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => void;
	globalFilterPlaceholder?: string;
};

export function DataTable<TData extends RowData, TValue>({
	columns,
	data,
	enableSorting = true,
	enableFiltering = false,
	enablePagination = true,
	pageSizeOptions = [10, 20, 50],
	globalFilter,
	onGlobalFilterChange,
	sorting,
	onSortingChange,
	columnFilters,
	onColumnFiltersChange,
	pagination,
	onPaginationChange,
	globalFilterPlaceholder = "Buscar...",
}: DataTableProps<TData, TValue>) {
	const [internalSorting, setInternalSorting] = useState<SortingState>([]);
	const [internalColumnFilters, setInternalColumnFilters] = useState<ColumnFiltersState>(
		[],
	);
	const [internalGlobalFilter, setInternalGlobalFilter] = useState("");
	const [internalPagination, setInternalPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: pageSizeOptions[0] ?? 10,
	});

	const resolvedSorting = sorting ?? internalSorting;
	const resolvedColumnFilters = columnFilters ?? internalColumnFilters;
	const resolvedGlobalFilter = globalFilter ?? internalGlobalFilter;
	const resolvedPagination = pagination ?? internalPagination;

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting: enableSorting ? resolvedSorting : undefined,
			columnFilters: enableFiltering ? resolvedColumnFilters : undefined,
			globalFilter: enableFiltering ? resolvedGlobalFilter : undefined,
			pagination: enablePagination ? resolvedPagination : undefined,
		},
		enableSorting,
		enableColumnFilters: enableFiltering,
		enableGlobalFilter: enableFiltering,
		onSortingChange: enableSorting
			? onSortingChange ?? setInternalSorting
			: undefined,
		onColumnFiltersChange: enableFiltering
			? onColumnFiltersChange ?? setInternalColumnFilters
			: undefined,
		onGlobalFilterChange: enableFiltering
			? onGlobalFilterChange ?? setInternalGlobalFilter
			: undefined,
		onPaginationChange: enablePagination
			? onPaginationChange ?? setInternalPagination
			: undefined,
		getCoreRowModel: getCoreRowModel(),
		...(enableSorting ? { getSortedRowModel: getSortedRowModel() } : {}),
		...(enableFiltering ? { getFilteredRowModel: getFilteredRowModel() } : {}),
		...(enablePagination
			? { getPaginationRowModel: getPaginationRowModel() }
			: {}),
	});

	const pageSizeItems = useMemo(
		() => pageSizeOptions.map((size) => ({ label: `${size} / página`, value: size })),
		[pageSizeOptions],
	);

	return (
		<div className="space-y-3">
			{enableFiltering && (
				<div className="flex items-center gap-2">
					<Input
						className="max-w-sm"
						onChange={(event) =>
							table.setGlobalFilter(event.target.value ?? "")
						}
						placeholder={globalFilterPlaceholder}
						value={table.getState().globalFilter ?? ""}
					/>
				</div>
			)}

			<div className="rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									if (header.isPlaceholder) {
										return <TableHead key={header.id} />;
									}
									const canSort = enableSorting && header.column.getCanSort();
									const sorted = header.column.getIsSorted();
									return (
										<TableHead
											className={canSort ? "cursor-pointer select-none" : undefined}
											key={header.id}
											onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
										>
											<div className="flex items-center gap-2">
												{flexRender(header.column.columnDef.header, header.getContext())}
											{canSort ? (
												<ChevronsUpDown
													aria-hidden
													className={`h-4 w-4 text-[#9BA1A6] transition ${
														sorted ? "opacity-100" : "opacity-60"
													}`}
													strokeWidth={sorted ? 2.4 : 1.8}
												/>
											) : null}
										</div>
									</TableHead>
								);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.length === 0 ? (
							<TableRow>
								<TableCell className="py-6 text-center" colSpan={columns.length}>
									Sin resultados.
								</TableCell>
							</TableRow>
						) : (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{enablePagination && (
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div className="flex items-center gap-2 text-sm text-[#687076] dark:text-[#9BA1A6]">
						{(() => {
							const pageState = table.getState().pagination;
							const pageIndex = pageState?.pageIndex ?? 0;
							const totalPages = table.getPageCount() || 1;
							return (
								<span>
									Página {pageIndex + 1} de {totalPages}
								</span>
							);
						})()}
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Select
							onValueChange={(value) =>
								table.setPageSize(Number.parseInt(value, 10))
							}
							value={`${table.getState().pagination?.pageSize ?? pageSizeOptions[0]}`}
						>
							<SelectTrigger className="w-[140px]">
								<SelectValue placeholder="Filas" />
							</SelectTrigger>
							<SelectContent>
								{pageSizeItems.map((option) => (
									<SelectItem key={option.value} value={`${option.value}`}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<div className="flex items-center gap-1">
							<Button
								variant="outline"
								onClick={() => table.setPageIndex(0)}
								disabled={!table.getCanPreviousPage()}
								size="sm"
							>
								«
							</Button>
							<Button
								variant="outline"
								onClick={() => table.previousPage()}
								disabled={!table.getCanPreviousPage()}
								size="sm"
							>
								←
							</Button>
							<Button
								variant="outline"
								onClick={() => table.nextPage()}
								disabled={!table.getCanNextPage()}
								size="sm"
							>
								→
							</Button>
							<Button
								variant="outline"
								onClick={() => table.setPageIndex(table.getPageCount() - 1)}
								disabled={!table.getCanNextPage()}
								size="sm"
							>
								»
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
