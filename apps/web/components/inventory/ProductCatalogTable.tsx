'use client';

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
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	Copy,
	Package,
	Search,
	X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

// Type for product with inventory data
type ProductWithInventory = {
	barcode: number;
	name: string;
	category: string;
	description: string;
	stockCount: number;
	inventoryItems: unknown[];
};

// Type for individual inventory item display
type InventoryItemDisplay = {
	id: string;
	uuid: string;
	lastUsed?: string;
	lastUsedBy?: string;
	numberOfUses: number;
	isBeingUsed: boolean;
	firstUsed: string;
};

interface ProductCatalogTableProps {
	products: ProductWithInventory[];
}

// Helper to extract inventory item data safely
function extractInventoryItemData(item: unknown): InventoryItemDisplay {
	if (item && typeof item === 'object' && 'product_stock' in item) {
		const stock = (item as { product_stock: unknown }).product_stock;
		const employee = (item as { employee?: { name?: string } }).employee;

		if (stock && typeof stock === 'object') {
			const stockData = stock as {
				id?: string | number;
				uuid?: string;
				lastUsed?: string;
				lastUsedBy?: string;
				numberOfUses?: number;
				isBeingUsed?: boolean;
				firstUsed?: string;
			};

			const fallbackId = Math.random().toString();
			const idValue = stockData.id?.toString() || fallbackId;
			const lastUsedBy = employee?.name || stockData.lastUsedBy;

			return {
				id: idValue,
				uuid: stockData.uuid || `uuid-${stockData.id || fallbackId}`,
				lastUsed: stockData.lastUsed,
				lastUsedBy,
				numberOfUses: stockData.numberOfUses || 0,
				isBeingUsed: stockData.isBeingUsed ?? false,
				firstUsed: stockData.firstUsed || new Date().toISOString(),
			};
		}
	}

	return {
		id: Math.random().toString(),
		uuid: `uuid-${Math.random()}`,
		numberOfUses: 0,
		isBeingUsed: false,
		firstUsed: new Date().toISOString(),
	};
}

function formatDate(dateString: string | undefined): string {
	if (!dateString) {
		return 'N/A';
	}
	try {
		return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
	} catch {
		return 'N/A';
	}
}

export function ProductCatalogTable({ products }: ProductCatalogTableProps) {
	// State for table features
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState('');
	const [categoryFilter, setCategoryFilter] = useState<string>('all');
	const [expanded, setExpanded] = useState<ExpandedState>({});
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

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
		() => (items: unknown[], searchValue: string) => {
			for (const item of items) {
				const itemData = extractInventoryItemData(item);
				if (
					itemData.uuid.toLowerCase().includes(searchValue) ||
					itemData.id.toLowerCase().includes(searchValue)
				) {
					return true;
				}
			}
			return false;
		},
		[],
	);

	const globalFilterFn = useMemo(
		() => (row: { original: ProductWithInventory }, _columnId: string, value: string) => {
			const product = row.original;
			const searchValue = value.toLowerCase();

			// Apply category filter first
			if (categoryFilter !== 'all' && product.category !== categoryFilter) {
				return false;
			}

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
		[searchInProduct, searchInInventoryItems, categoryFilter],
	);

	// Handle category filter changes
	const handleCategoryFilterChange = (value: string) => {
		setCategoryFilter(value);
		// Force table to re-filter by updating the global filter state
		setGlobalFilter((prev) => prev);
	};

	// Utility functions - memoized to prevent recreating on every render
	const copyToClipboard = useMemo(
		() => (text: string) => {
			navigator.clipboard.writeText(text);
		},
		[],
	);

	const renderSubComponent = useMemo(
		() =>
			({ row }: { row: { original: ProductWithInventory } }) => {
				const product = row.original as ProductWithInventory;
				if (product.inventoryItems.length === 0) {
					return (
						<div className="border-[#E5E7EB] border-b bg-[#F8FAFC] p-4 text-center dark:border-[#374151] dark:bg-[#1A1B1C]">
							<p className="text-[#687076] text-sm dark:text-[#9BA1A6]">
								No hay items en inventario para este producto
							</p>
						</div>
					);
				}

				return (
					<div className="border-[#E5E7EB] border-b bg-[#F8FAFC] p-4 dark:border-[#374151] dark:bg-[#1A1B1C]">
						<h4 className="mb-3 font-medium text-[#11181C] text-sm dark:text-[#ECEDEE]">
							Inventario detallado ({product.inventoryItems.length} items)
						</h4>
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
									</TableRow>
								</TableHeader>
								<TableBody>
									{product.inventoryItems.map((item) => {
										const itemData = extractInventoryItemData(item);
										return (
											<TableRow
												className="border-[#E5E7EB] border-b last:border-b-0 dark:border-[#374151]"
												key={itemData.uuid}
											>
												<TableCell className="font-mono text-[#687076] text-xs dark:text-[#9BA1A6]">
													<div className="flex items-center gap-1">
														<span className="truncate">
															{itemData.uuid.slice(0, 8)}...
														</span>
														<Button
															className="h-4 w-4 p-0 hover:bg-[#E5E7EB] dark:hover:bg-[#2D3033]"
															onClick={() =>
																copyToClipboard(itemData.uuid)
															}
															size="sm"
															variant="ghost"
														>
															<Copy className="h-3 w-3" />
														</Button>
													</div>
												</TableCell>
												<TableCell className="text-[#687076] text-xs dark:text-[#9BA1A6]">
													{formatDate(itemData.lastUsed)}
												</TableCell>
												<TableCell className="text-[#687076] text-xs dark:text-[#9BA1A6]">
													{itemData.lastUsedBy || 'N/A'}
												</TableCell>
												<TableCell className="text-[#687076] text-xs dark:text-[#9BA1A6]">
													{itemData.numberOfUses}
												</TableCell>
												<TableCell>
													<Badge
														className={
															itemData.isBeingUsed
																? 'bg-[#EF4444] text-white text-xs'
																: 'bg-[#10B981] text-white text-xs'
														}
														variant={
															itemData.isBeingUsed
																? 'destructive'
																: 'default'
														}
													>
														{itemData.isBeingUsed
															? 'En Uso'
															: 'Disponible'}
													</Badge>
												</TableCell>
												<TableCell className="text-[#687076] text-xs dark:text-[#9BA1A6]">
													{formatDate(itemData.firstUsed)}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					</div>
				);
			},
		[copyToClipboard],
	);

	// Define table columns using useMemo for stable reference
	const columns = useMemo<ColumnDef<ProductWithInventory>[]>(
		() => [
			{
				id: 'expander',
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
				accessorKey: 'barcode',
				header: 'Código de Barras',
				cell: ({ row }) => (
					<div className="font-mono text-[#687076] text-sm dark:text-[#9BA1A6]">
						{row.getValue('barcode')}
					</div>
				),
			},
			{
				accessorKey: 'name',
				header: 'Producto',
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
				filterFn: 'includesString',
			},
			{
				accessorKey: 'category',
				header: 'Categoría',
				cell: ({ row }) => (
					<Badge
						className="bg-[#F3F4F6] text-[#374151] dark:bg-[#374151] dark:text-[#D1D5DB]"
						variant="secondary"
					>
						{row.getValue('category')}
					</Badge>
				),
				filterFn: 'includesString',
			},
			{
				accessorKey: 'stockCount',
				header: 'Stock',
				cell: ({ row }) => {
					const stockCount = row.getValue('stockCount') as number;
					return (
						<Badge
							className={
								stockCount > 0
									? 'bg-[#10B981] text-white'
									: 'bg-[#F3F4F6] text-[#6B7280] dark:bg-[#374151] dark:text-[#9CA3AF]'
							}
							variant={stockCount > 0 ? 'default' : 'secondary'}
						>
							{stockCount} unidades
						</Badge>
					);
				},
			},
		],
		[],
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
							onClick={() => setGlobalFilter('')}
							size="sm"
							variant="ghost"
						>
							<X className="h-3 w-3" />
						</Button>
					)}
				</div>

				{/* Category Filter */}
				<div className="min-w-[180px]">
					<Select onValueChange={handleCategoryFilterChange} value={categoryFilter}>
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
				{(globalFilter || categoryFilter !== 'all') && (
					<Button
						className="text-[#687076] hover:text-[#11181C] dark:text-[#9BA1A6] dark:hover:text-[#ECEDEE]"
						onClick={() => {
							setGlobalFilter('');
							setCategoryFilter('all');
						}}
						size="sm"
						variant="ghost"
					>
						Limpiar filtros
					</Button>
				)}

				{/* Results Counter */}
				<div className="whitespace-nowrap text-[#687076] text-sm dark:text-[#9BA1A6]">
					{table.getFilteredRowModel().rows.length} de {products.length} productos
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
										data-state={row.getIsSelected() && 'selected'}
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
								<TableCell className="h-24 text-center" colSpan={columns.length}>
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
					<p className="text-[#687076] text-sm dark:text-[#9BA1A6]">Filas por página</p>
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
						Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
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
