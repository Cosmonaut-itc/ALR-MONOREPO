import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronRight, Eye, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDisposalStore } from '@/stores/disposal-store';
import { DisposeItemDialog } from './DisposeItemDialog';

type InventoryItemRow = {
	id: string;
	uuid: string;
	barcode: number;
	lastUsed?: string;
	lastUsedBy?: string;
	numberOfUses: number;
	currentWarehouse: number;
	isBeingUsed: boolean;
	firstUsed: string;
};

type ProductCatalogItem = {
	barcode: number;
	name: string;
	category: string;
	description: string;
};

interface InventoryCatalogTableProps {
	catalog: ProductCatalogItem[];
	inventory: InventoryItemRow[];
}

export function InventoryCatalogTable({ catalog, inventory }: InventoryCatalogTableProps) {
	const { show: showDisposeDialog } = useDisposalStore();
	const [expanded, setExpanded] = useState<Set<number>>(new Set());

	const toggleExpanded = (barcode: number) => {
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(barcode)) {
				next.delete(barcode);
			} else {
				next.add(barcode);
			}
			return next;
		});
	};

	const groupedByBarcode = useMemo(() => {
		const map = new Map<number, InventoryItemRow[]>();
		for (const item of inventory) {
			if (typeof item.barcode !== 'number') {
				continue;
			}
			const list = map.get(item.barcode) ?? [];
			list.push(item);
			map.set(item.barcode, list);
		}
		return map;
	}, [inventory]);

	const formatDate = (dateString: string | undefined) => {
		if (!dateString) {
			return 'N/A';
		}
		try {
			return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
		} catch {
			return 'N/A';
		}
	};

	return (
		<>
			<div className="theme-transition rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
				<Table>
					<TableHeader>
						<TableRow className="border-[#E5E7EB] border-b dark:border-[#2D3033]">
							<TableHead className="w-[48px]" />
							<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
								Producto
							</TableHead>
							<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
								Código de barras
							</TableHead>
							<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
								Categoría
							</TableHead>
							<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
								Cantidad
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{catalog.map((product) => {
							const items = groupedByBarcode.get(product.barcode) ?? [];
							const isOpen = expanded.has(product.barcode);
							return (
								<>
									<TableRow
										className="theme-transition border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]"
										key={`p-${product.barcode}`}
									>
										<TableCell className="w-[48px]">
											<Button
												className="h-8 w-8 p-0"
												onClick={() => toggleExpanded(product.barcode)}
												variant="ghost"
												type="button"
											>
												<ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
												<span className="sr-only">Alternar filas</span>
											</Button>
										</TableCell>
										<TableCell className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
											{product.name}
											<div className="text-[#687076] text-xs dark:text-[#9BA1A6]">
												{product.description}
											</div>
										</TableCell>
										<TableCell className="font-mono text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
											{product.barcode}
										</TableCell>
										<TableCell className="text-[#687076] text-transition dark:text-[#9BA1A6]">
											{product.category}
										</TableCell>
										<TableCell className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
											{items.length}
										</TableCell>
									</TableRow>
									{isOpen && (
										<TableRow className="bg-[#F9FAFB] dark:bg-[#1E1F20]">
											<TableCell colSpan={5}>
												<div className="p-3">
													<div className="mb-2 text-sm text-[#687076] dark:text-[#9BA1A6]">
														Inventario para {product.name} (Código {product.barcode})
													</div>
													<Table>
													<TableHeader>
															<TableRow>
																<TableHead>ID</TableHead>
																<TableHead>UUID</TableHead>
																<TableHead>Último uso</TableHead>
																<TableHead>Usado por</TableHead>
																<TableHead>¿En uso?</TableHead>
																<TableHead className="text-right">Acciones</TableHead>
															</TableRow>
														</TableHeader>
														<TableBody>
															{items.length === 0 ? (
																<TableRow>
																	<TableCell className="text-center" colSpan={6}>
																		No hay inventario para este producto.
																	</TableCell>
																</TableRow>
															) : (
																items.map((it) => (
																	<TableRow key={it.id}>
																		<TableCell className="font-mono text-xs">{it.id.split('-')[0]}...</TableCell>
																		<TableCell className="font-mono text-xs">{it.uuid}</TableCell>
																		<TableCell>{formatDate(it.lastUsed)}</TableCell>
																		<TableCell>{it.lastUsedBy ?? 'N/A'}</TableCell>
																		<TableCell>
																			<Badge className={it.isBeingUsed ? 'bg-[#0a7ea4] text-white' : 'bg-[#E5E7EB] text-[#687076] dark:bg-[#2D3033] dark:text-[#9BA1A6]'}>
																				{it.isBeingUsed ? 'Sí' : 'No'}
																			</Badge>
																		</TableCell>
																		<TableCell className="text-right">
																			<div className="flex items-center justify-end gap-1">
																				<Button className="h-8 w-8 p-0" size="sm" variant="ghost" type="button">
																					<Eye className="h-4 w-4" />
																					<span className="sr-only">Ver detalles</span>
																				</Button>
																				<Button
																					className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
																					onClick={() => showDisposeDialog({ ...it, productInfo: { barcode: product.barcode, name: product.name, category: product.category, description: product.description } })}
																					size="sm"
																					variant="ghost"
																					type="button"
																				>
																					<Trash2 className="h-4 w-4" />
																					<span className="sr-only">Dar de baja</span>
																				</Button>
																			</div>
																		</TableCell>
																	</TableRow>
															)))
														}
													</TableBody>
												</Table>
											</div>
										</TableCell>
									</TableRow>
								)}
							</>
							);
						})}
					</TableBody>
				</Table>
			</div>
			<DisposeItemDialog />
		</>
	);
}


