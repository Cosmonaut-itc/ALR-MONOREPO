'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { ArrowLeft, Package, PackageCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { getKitDetails } from '@/lib/fetch-functions/kits';
import { createQueryKey } from '@/lib/helpers';
import { useUpdateKit, useUpdateKitItemStatus } from '@/lib/mutations/kits';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { useKitsStore } from '@/stores/kits-store';
import { SkeletonKitInspectionGroup } from '@/ui/skeletons/Skeleton.KitInspectionGroup';

interface PageProps {
	params: { kitId: string };
}

// Deterministic UUIDv5 generator using a stable, app-specific namespace.
// Combines multiple identifying parts to maximize uniqueness while remaining stable across renders.
const UUID_NAMESPACE = uuidv5('alr-dashboard.kit-items', uuidv5.URL);
function generateUUID(...parts: Array<string | number>): string {
	const name = parts.filter((p) => p !== undefined && p !== null).join('|');
	return uuidv5(name, UUID_NAMESPACE);
}

type APIResponse = Awaited<ReturnType<typeof getKitDetails>> | null;

export function KitInspectionPage({ params }: PageProps) {
	const { kitId } = params;
	const router = useRouter();

	const {
		inspectionItems,
		inspectionLoading,
		loadInspection,
		toggleInspectionItem,
		toggleInspectionGroup,
		markAllReturned,
		getInspectionProgress,
	} = useKitsStore();

	const { data: details } = useSuspenseQuery<APIResponse, Error, APIResponse>({
		queryKey: createQueryKey(queryKeys.kits, [kitId as string]),
		queryFn: () => getKitDetails(kitId as string),
	});

	const { mutateAsync: updateKit } = useUpdateKit();
	const { mutateAsync: updateItemStatus } = useUpdateKitItemStatus();

	// Seed inspection from API details
	useEffect(() => {
		const root = (details ?? {}) as { data?: unknown };
		const data = (root.data ?? {}) as {
			kitItems?: Array<{
				id?: string;
				uuid?: string;
				barcode?: string | number;
				productName?: string;
				isReturned?: boolean;
			}>;
		};
		const items = Array.isArray(data.kitItems) ? data.kitItems : [];
		const normalized = items.map((it, idx) => ({
			id: it.id || `kit-item-${idx + 1}`,
			uuid: it.uuid || generateUUID(kitId, it.id || idx),
			barcode: String(it.barcode ?? ''),
			productName: it.productName || 'Sin nombre',
			returned: Boolean(it.isReturned),
		}));
		loadInspection(kitId, normalized);
	}, [details, kitId, loadInspection]);

	// Group items by barcode
	const groupedItems = useMemo(() => {
		return inspectionItems.reduce(
			(groups, item) => {
				const key = item.barcode;
				if (!groups[key]) {
					groups[key] = [];
				}
				groups[key].push(item);
				return groups;
			},
			{} as Record<string, typeof inspectionItems>,
		);
	}, [inspectionItems]);

	const handleMarkAllReturned = async () => {
		markAllReturned(kitId);
		try {
			await updateKit({ kitId, observations: 'Todos los artículos devueltos' });
			toast('Kit devuelto: Todos los artículos han sido marcados como devueltos');
		} catch {
			toast.error('No se pudo actualizar el kit');
		}
		setTimeout(() => {
			router.push('/kits');
		}, 1500);
	};

	const handleToggleItem = async (itemId: string, nextReturned: boolean) => {
		toggleInspectionItem(itemId);
		try {
			await updateItemStatus({ kitItemId: itemId, isReturned: nextReturned });
		} catch {
			toast.error('No se pudo actualizar el artículo');
		}
	};

	const handleGroupToggle = (barcode: string) => {
		toggleInspectionGroup(barcode);
	};

	const getGroupSelectionState = (barcode: string) => {
		const groupItems = groupedItems[barcode] || [];
		const returnedCount = groupItems.filter((item) => item.returned).length;
		if (returnedCount === 0) {
			return 'unchecked';
		}
		if (returnedCount === groupItems.length) {
			return 'checked';
		}
		return 'indeterminate';
	};

	// Stable keys for skeleton rows to avoid using array index
	const skeletonKeys = useMemo(() => Array.from({ length: 3 }, () => uuidv4()), []);

	const progress = getInspectionProgress();
	const isAllReturned = progress.total > 0 && progress.returned === progress.total;

	return (
		<div className="theme-transition flex-1 space-y-6 bg-white p-4 md:p-6 dark:bg-[#151718]">
			{/* Breadcrumb */}
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink
							asChild={true}
							className="theme-transition flex items-center text-[#0a7ea4] hover:text-[#0a7ea4]/80"
						>
							<Link href="/kits">
								<ArrowLeft className="mr-1 h-4 w-4" />
								Volver a kits
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
							{kitId}
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-2">
					<h1 className="font-bold text-2xl text-[#11181C] text-transition md:text-3xl dark:text-[#ECEDEE]">
						Inspeccionar Kit {kitId}
					</h1>
					<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
						Marca los artículos como devueltos
					</p>
				</div>

				<Button
					className="theme-transition bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90 disabled:opacity-50"
					disabled={inspectionLoading || isAllReturned}
					onClick={handleMarkAllReturned}
				>
					<PackageCheck className="mr-2 h-4 w-4" />
					Marcar todo como devuelto
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
									Progreso de devolución
								</p>
								<p className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
									{inspectionLoading
										? '...'
										: `${progress.returned} / ${progress.total}`}
								</p>
							</div>
						</div>
						<div className="text-right">
							<p className="text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
								Completado
							</p>
							<p className="font-semibold text-[#0a7ea4] text-lg">
								{inspectionLoading ? '0%' : `${progress.percentage}%`}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Items Table */}
			<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<CardHeader>
					<CardTitle className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
						Artículos del kit
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="theme-transition rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
						<Table>
							<TableHeader>
								<TableRow className="border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]">
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										UUID
									</TableHead>
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Código de barras
									</TableHead>
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Nombre de producto
									</TableHead>
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Devuelto
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{inspectionLoading &&
									skeletonKeys.map((key) => (
										<SkeletonKitInspectionGroup key={key} />
									))}

								{!inspectionLoading &&
									Object.entries(groupedItems).length === 0 && (
										<TableRow>
											<TableCell className="py-12 text-center" colSpan={4}>
												<Package className="mx-auto mb-4 h-12 w-12 text-[#687076] dark:text-[#9BA1A6]" />
												<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
													No hay artículos en este kit
												</p>
											</TableCell>
										</TableRow>
									)}

								{!inspectionLoading &&
									Object.entries(groupedItems).length > 0 &&
									Object.entries(groupedItems).map(([barcode, groupItems]) => {
										const selectionState = getGroupSelectionState(barcode);

										return (
											<Fragment key={barcode}>
												{/* Group header */}
												<TableRow className="theme-transition bg-[#F9FAFB]/60 dark:bg-[#1E1F20]/60">
													<TableCell
														className="py-3 font-medium text-[#687076] text-transition dark:text-[#9BA1A6]"
														colSpan={4}
													>
														<div className="flex items-center space-x-3">
															<Checkbox
																checked={
																	selectionState ===
																	'indeterminate'
																		? 'indeterminate'
																		: selectionState ===
																			'checked'
																}
																className="h-4 w-4"
																onCheckedChange={() =>
																	handleGroupToggle(barcode)
																}
															/>
															<span className="font-mono text-sm">
																Código: {barcode}
															</span>
															<span className="text-sm">
																• {groupItems[0].productName}
															</span>
															<span className="rounded-full bg-[#0a7ea4]/10 px-2 py-1 text-[#0a7ea4] text-xs">
																{groupItems.length} items
															</span>
														</div>
													</TableCell>
												</TableRow>

												{/* Group items */}
												{groupItems.map((item) => (
													<TableRow
														className={cn(
															'theme-transition border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]',
															item.returned && 'opacity-75',
														)}
														key={item.id}
													>
														<TableCell className="pl-8 font-mono text-[#11181C] text-sm text-transition dark:text-[#ECEDEE]">
															{item.uuid.split('-')[0]}...
														</TableCell>
														<TableCell className="font-mono text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
															{item.barcode}
														</TableCell>
														<TableCell
															className={cn(
																'text-[#11181C] text-transition dark:text-[#ECEDEE]',
																item.returned && 'line-through',
															)}
														>
															{item.productName}
														</TableCell>
														<TableCell>
															<Checkbox
																checked={item.returned}
																className="h-5 w-5 data-[state=checked]:border-[#0a7ea4] data-[state=checked]:bg-[#0a7ea4]"
																onCheckedChange={(checked) =>
																	handleToggleItem(
																		item.id,
																		Boolean(checked),
																	)
																}
															/>
														</TableCell>
													</TableRow>
												))}
											</Fragment>
										);
									})}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
