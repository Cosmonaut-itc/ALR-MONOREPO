'use memo';

import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type SortingState,
	useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Copy, Eye, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { useDisposalStore } from '@/stores/disposal-store';
import { DisposeItemDialog } from './DisposeItemDialog';

// Type for table row data - matches transformed data structure
type InventoryTableData = {
	id: string;
	uuid: string;
	barcode: number;
	lastUsed?: string;
	lastUsedBy?: string;
	numberOfUses: number;
	currentWarehouse: number;
	isBeingUsed: boolean;
	firstUsed: string;
	productInfo?: {
		barcode: number;
		name: string;
		category: string;
		description: string;
	};
};

interface InventoryTableProps {
	items: InventoryTableData[];
	
}

export function InventoryTable({ items }: InventoryTableProps) {
	const showDisposeDialog = useDisposalStore((state) => state.show);

	// State for table features
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	// Utility functions - memoized to prevent recreating on every render
	const formatDate = useMemo(
		() => (dateString: string | undefined) => {
			if (!dateString) {
				return 'N/A';
			}
			try {
				return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
			} catch {
				return 'N/A';
			}
		},
		[],
	);

	const getWarehouseName = useMemo(
		() => (warehouse: number) => {
			return warehouse === 1 ? 'General' : 'Gabinete';
		},
		[],
	);

	const copyToClipboard = useMemo(
		() => (text: string) => {
			navigator.clipboard.writeText(text);
		},
		[],
	);

	// Define table columns using useMemo for stable reference
	const columns = useMemo<ColumnDef<InventoryTableData>[]>(
		() => [
			{
				accessorKey: 'id',
				header: 'ID',
				cell: ({ row }) => {
					const id = row.getValue('id') as string;
					return (
						<div className="max-w-[120px] font-mono text-[#687076] text-transition text-xs dark:text-[#9BA1A6]">
							<div className="flex items-center gap-1">
								<span className="truncate">{id.split('-')[0]}...</span>
								<Button
									className="h-6 w-6 p-0 hover:bg-[#E5E7EB] dark:hover:bg-[#2D3033]"
									onClick={() => copyToClipboard(id)}
									size="sm"
									variant="ghost"
								>
									<Copy className="h-3 w-3" />
								</Button>
							</div>
						</div>
					);
				},
				enableSorting: false,
			},
			{
				accessorKey: 'barcode',
				header: 'Código de barras',
				cell: ({ row }) => (
					<div className="font-mono text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
						{row.getValue('barcode')}
					</div>
				),
			},
			{
				accessorKey: 'productInfo.name',
				header: 'Nombre',
				cell: ({ row }) => {
					const item = row.original;
					return (
						<div className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
							<div>{item.productInfo?.name || 'Producto desconocido'}</div>
							<div className="text-[#687076] text-xs dark:text-[#9BA1A6]">
								{item.productInfo?.category} •{' '}
								{getWarehouseName(item.currentWarehouse)}
							</div>
						</div>
					);
				},
				filterFn: 'includesString',
			},
			{
				accessorKey: 'numberOfUses',
				header: 'Usos',
				cell: ({ row }) => (
					<span
						className={
							row.getValue('numberOfUses') === 0
								? 'text-[#687076] dark:text-[#9BA1A6]'
								: 'text-[#11181C] text-transition dark:text-[#ECEDEE]'
						}
					>
						{row.getValue('numberOfUses')}
					</span>
				),
			},
			{
				accessorKey: 'lastUsed',
				header: 'Último uso',
				cell: ({ row }) => (
					<div className="text-[#687076] text-transition dark:text-[#9BA1A6]">
						{formatDate(row.getValue('lastUsed'))}
					</div>
				),
			},
			{
				accessorKey: 'lastUsedBy',
				header: 'Usado por',
				cell: ({ row }) => (
					<div className="text-[#687076] text-transition dark:text-[#9BA1A6]">
						{row.getValue('lastUsedBy') || 'N/A'}
					</div>
				),
			},
			{
				accessorKey: 'isBeingUsed',
				header: '¿En uso?',
				cell: ({ row }) => {
					const isBeingUsed = row.getValue('isBeingUsed') as boolean;
					return (
						<Badge
							className={
								isBeingUsed
									? 'bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90'
									: 'bg-[#F9FAFB] text-[#687076] hover:bg-[#E5E7EB] dark:bg-[#2D3033] dark:text-[#9BA1A6] dark:hover:bg-[#1E1F20]'
							}
							variant={isBeingUsed ? 'default' : 'secondary'}
						>
							{isBeingUsed ? 'Sí' : 'No'}
						</Badge>
					);
				},
				filterFn: (row, columnId, filterValue) => {
					if (filterValue === 'all') {
						return true;
					}
					return row.getValue(columnId) === (filterValue === 'true');
				},
			},
			{
				id: 'actions',
				header: 'Acciones',
				cell: ({ row }) => (
					<div className="flex items-center gap-1">
						<Button
							className="h-8 w-8 p-0 hover:bg-[#E5E7EB] dark:hover:bg-[#2D3033]"
							size="sm"
							variant="ghost"
						>
							<Eye className="h-4 w-4" />
							<span className="sr-only">Ver detalles</span>
						</Button>
						<Button
							className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
							onClick={() => {
								const item = row.original;
								if (item.productInfo) {
									showDisposeDialog({
										id: item.id,
										uuid: item.uuid,
										barcode: item.barcode,
										productInfo: {
											name: item.productInfo.name,
											category: item.productInfo.category,
											description: item.productInfo.description,
										},
									});
								}
							}}
							size="sm"
							variant="ghost"
						>
							<Trash2 className="h-4 w-4" />
							<span className="sr-only">Dar de baja</span>
						</Button>
					</div>
				),
				enableSorting: false,
			},
		],
		[showDisposeDialog, copyToClipboard, formatDate, getWarehouseName],
	);

	// Initialize the table
	const table = useReactTable({
		data: items,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onPaginationChange: setPagination,
		state: {
			sorting,
			columnFilters,
			pagination,
		},
	});

	if (items.length === 0) {
		return (
			<div className="theme-transition rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
				<div className="flex items-center justify-center py-12">
					<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
						No se encontraron productos
					</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<div className="space-y-4">
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
											className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]"
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
										data-state={row.getIsSelected() && 'selected'}
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
						<p className="text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
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
							Página {table.getState().pagination.pageIndex + 1} de{' '}
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
			<DisposeItemDialog />
		</>
	);
}
