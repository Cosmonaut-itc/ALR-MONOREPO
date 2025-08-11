'use client';

import { ArrowLeft, CheckCircle2, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
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
import { cn } from '@/lib/utils';
import { useReceptionStore } from '@/stores/reception-store';
import { SkeletonReceptionGroup } from '@/ui/skeletons/Skeleton.ReceptionGroup';

type ReceptionItem = {
	id: string;
	barcode: number;
	productName: string;
	received: boolean;
};

interface PageProps {
	params: {
		shipmentId: string;
	};
}

export default function ReceptionDetailPage({ params }: PageProps) {
	const [isLoading, setIsLoading] = useState(true);
	const router = useRouter();

	const {
		items,
		setItems,
		toggleReceived,
		markAllReceived,
		getReceivedCount,
		getTotalCount,
		isAllReceived,
	} = useReceptionStore();

	// Mock data loading - TODO: Replace mock with GET /api/recepciones/{shipmentId}
	useEffect(() => {
		setTimeout(() => {
			const mockItems: ReceptionItem[] = [
				// Group 1: Barcode 123456
				{
					id: 'item-001',
					barcode: 123_456,
					productName: 'Esmalte Gel Rosa Pastel',
					received: false,
				},
				{
					id: 'item-002',
					barcode: 123_456,
					productName: 'Esmalte Gel Rosa Pastel',
					received: false,
				},
				{
					id: 'item-003',
					barcode: 123_456,
					productName: 'Esmalte Gel Rosa Pastel',
					received: true,
				},
				// Group 2: Barcode 789012
				{
					id: 'item-004',
					barcode: 789_012,
					productName: 'Base Coat Profesional',
					received: false,
				},
				{
					id: 'item-005',
					barcode: 789_012,
					productName: 'Base Coat Profesional',
					received: false,
				},
				// Group 3: Barcode 345678
				{
					id: 'item-006',
					barcode: 345_678,
					productName: 'Top Coat Brillante',
					received: false,
				},
				{
					id: 'item-007',
					barcode: 345_678,
					productName: 'Top Coat Brillante',
					received: true,
				},
				{
					id: 'item-008',
					barcode: 345_678,
					productName: 'Top Coat Brillante',
					received: false,
				},
			];
			setItems(mockItems);
			setIsLoading(false);
		}, 1500);
	}, [setItems]);

	// Group items by barcode
	const groupedItems = items.reduce(
		(groups, item) => {
			const key = item.barcode;
			if (!groups[key]) {
				groups[key] = [];
			}
			groups[key].push(item);
			return groups;
		},
		{} as Record<number, ReceptionItem[]>,
	);

	const groupedEntries = Object.entries(groupedItems) as [string, ReceptionItem[]][];
	// Stable keys for skeleton rows to avoid using array index
	const skeletonKeys = useMemo(() => Array.from({ length: 3 }, () => uuidv4()), []);

	const handleMarkAllReceived = () => {
		markAllReceived();
		toast('Recepción completada: Todos los artículos han sido marcados como recibidos');

		// Navigate back to receptions list
		setTimeout(() => {
			router.push('/recepciones');
		}, 1500);
	};

	const handleToggleItem = (itemId: string) => {
		toggleReceived(itemId);
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
							{params.shipmentId}
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-2">
					<h1 className="font-bold text-2xl text-[#11181C] text-transition md:text-3xl dark:text-[#ECEDEE]">
						Recepción de envío {params.shipmentId}
					</h1>
					<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
						Marca los artículos como recibidos
					</p>
				</div>

				<Button
					className="theme-transition bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90 disabled:opacity-50"
					disabled={isLoading || isAllReceived()}
					onClick={handleMarkAllReceived}
				>
					<CheckCircle2 className="mr-2 h-4 w-4" />
					Marcar todo como recibido
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
									{isLoading ? '...' : `${receivedCount} / ${totalCount}`}
								</p>
							</div>
						</div>
						<div className="text-right">
							<p className="text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
								Completado
							</p>
							<p className="font-semibold text-[#0a7ea4] text-lg">
								{isLoading
									? '0%'
									: `${totalCount > 0 ? Math.round((receivedCount / totalCount) * 100) : 0}%`}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

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
								{isLoading &&
									skeletonKeys.map((key) => <SkeletonReceptionGroup key={key} />)}

								{!isLoading && groupedEntries.length === 0 && (
									<TableRow>
										<TableCell className="py-12 text-center" colSpan={4}>
											<Package className="mx-auto mb-4 h-12 w-12 text-[#687076] dark:text-[#9BA1A6]" />
											<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
												No hay artículos en este envío
											</p>
										</TableCell>
									</TableRow>
								)}

								{!isLoading &&
									groupedEntries.length > 0 &&
									groupedEntries.map(([barcode, groupItems]) => (
										<Fragment key={barcode}>
											{/* Group header */}
											<TableRow className="theme-transition bg-[#F9FAFB]/60 dark:bg-[#1E1F20]/60">
												<TableCell
													className="py-3 font-medium text-[#687076] text-transition dark:text-[#9BA1A6]"
													colSpan={4}
												>
													<div className="flex items-center space-x-3">
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
														item.received && 'opacity-75',
													)}
													key={item.id}
												>
													<TableCell className="pl-8 font-mono text-[#11181C] text-sm text-transition dark:text-[#ECEDEE]">
														{item.id}
													</TableCell>
													<TableCell className="font-mono text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
														{item.barcode}
													</TableCell>
													<TableCell
														className={cn(
															'text-[#11181C] text-transition dark:text-[#ECEDEE]',
															item.received && 'line-through',
														)}
													>
														{item.productName}
													</TableCell>
													<TableCell>
														<Checkbox
															checked={item.received}
															className="h-5 w-5 data-[state=checked]:border-[#0a7ea4] data-[state=checked]:bg-[#0a7ea4]"
															onCheckedChange={() =>
																handleToggleItem(item.id)
															}
														/>
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
		</div>
	);
}
