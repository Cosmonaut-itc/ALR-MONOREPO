'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, Calendar, CheckCircle, Clock, Package } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { getWarehouseTransferById } from '@/lib/fetch-functions/recepciones';
import { createQueryKey } from '@/lib/helpers';
import { queryKeys } from '@/lib/query-keys';
import type { WarehouseTransfer } from '@/types';

type APIResponse = WarehouseTransfer | null;

// Pre-declare regex to comply with lint rule (top-level declaration)
const completeRegex = /complete/i;

// Narrowed item interface based on expected transfer fields
interface TransferDetailItem {
	quantityTransferred?: number;
}

interface TransferListItemShape {
	id?: string;
	transferNumber?: string;
	shipmentId?: string;
	status?: string;
	transferStatus?: string;
	transferDetails?: readonly TransferDetailItem[] | TransferDetailItem[];
	scheduledDate?: string;
	receivedAt?: string;
	createdAt?: string;
	updatedAt?: string;
	totalItems?: number;
}

// Type guard utilities
const isTransferDetailArray = (
	value: unknown,
): value is readonly TransferDetailItem[] | TransferDetailItem[] => Array.isArray(value);

const isTransferListItem = (value: unknown): value is TransferListItemShape =>
	value !== null && typeof value === 'object';

const isArrayOfTransferListItem = (value: unknown): value is TransferListItemShape[] =>
	Array.isArray(value) && value.every((v) => isTransferListItem(v));

// Extract list of transfers from potentially nested API response shapes
function extractTransferItems(root: APIResponse): TransferListItemShape[] {
	const unknownRoot: unknown = root ?? [];
	let list: unknown = [] as unknown[];

	if (Array.isArray(unknownRoot)) {
		list = unknownRoot;
	} else {
		const withData = unknownRoot as { data?: unknown };
		const withTransfers = unknownRoot as { transfers?: unknown };
		if (isArrayOfTransferListItem(withData?.data)) {
			list = withData.data as unknown;
		} else if (isArrayOfTransferListItem(withTransfers?.transfers)) {
			list = withTransfers.transfers as unknown;
		} else {
			const maybeData = (unknownRoot as { data?: { transfers?: unknown } })?.data;
			if (maybeData && isArrayOfTransferListItem(maybeData.transfers)) {
				list = maybeData.transfers as unknown;
			}
		}
	}

	return isArrayOfTransferListItem(list) ? list : [];
}

function normalizeTransferStatus(raw?: string): 'pendiente' | 'completada' {
	if (!raw) {
		return 'pendiente';
	}
	return completeRegex.test(raw) ? 'completada' : 'pendiente';
}

function computeTotalItems(
	transferDetails: readonly TransferDetailItem[] | TransferDetailItem[] | undefined,
	explicitTotal: number | undefined,
): number {
	if (typeof explicitTotal === 'number') {
		return explicitTotal;
	}
	const details = isTransferDetailArray(transferDetails) ? transferDetails : [];
	return details.reduce((sum: number, d: TransferDetailItem) => {
		const qty = typeof d.quantityTransferred === 'number' ? d.quantityTransferred : 0;
		return sum + qty;
	}, 0);
}

function selectArrivalDate(item: TransferListItemShape): string {
	return (
		item.scheduledDate ??
		item.receivedAt ??
		item.createdAt ??
		item.updatedAt ??
		new Date().toISOString()
	);
}

export function RecepcionesPage({ warehouseId }: { warehouseId: string }) {
	const { data: transfers } = useSuspenseQuery<APIResponse, Error, APIResponse>({
		queryKey: createQueryKey(queryKeys.receptions, [warehouseId as string]),
		queryFn: () => getWarehouseTransferById(warehouseId as string),
	});

	// Derive receptions list from transfers response
	type DerivedReception = {
		shipmentId: string;
		arrivalDate: string;
		totalItems: number;
		status: 'pendiente' | 'completada';
	};

	const receptions: DerivedReception[] = useMemo(() => {
		const items = extractTransferItems(transfers);

		return items.map((item) => {
			const status = normalizeTransferStatus(item.status ?? item.transferStatus);
			const totalItems = computeTotalItems(item.transferDetails, item.totalItems);
			const arrivalDate = selectArrivalDate(item);
			const shipmentId = String(item.transferNumber ?? item.shipmentId ?? item.id ?? 'N/A');

			return {
				shipmentId,
				arrivalDate,
				totalItems,
				status,
			};
		});
	}, [transfers]);

	const formatDate = (dateString: string) => {
		try {
			return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
		} catch {
			return 'N/A';
		}
	};

	const pendingReceptions = receptions.filter((r) => r.status === 'pendiente');
	const completedReceptions = receptions.filter((r) => r.status === 'completada');

	return (
		<div className="theme-transition flex-1 space-y-6 bg-white p-4 md:p-6 dark:bg-[#151718]">
			{/* Header */}
			<div className="space-y-2">
				<h1 className="font-bold text-2xl text-[#11181C] text-transition md:text-3xl dark:text-[#ECEDEE]">
					Recepciones pendientes
				</h1>
				<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
					Gestiona las recepciones desde el centro de distribución
				</p>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="p-6">
						<div className="flex items-center space-x-4">
							<div className="rounded-lg bg-orange-500/10 p-2">
								<Clock className="h-6 w-6 text-orange-600" />
							</div>
							<div className="flex-1 space-y-1">
								<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
									Pendientes
								</p>
								<p className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
									{pendingReceptions.length}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="p-6">
						<div className="flex items-center space-x-4">
							<div className="rounded-lg bg-green-500/10 p-2">
								<CheckCircle className="h-6 w-6 text-green-600" />
							</div>
							<div className="flex-1 space-y-1">
								<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
									Completadas
								</p>
								<p className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
									{completedReceptions.length}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="p-6">
						<div className="flex items-center space-x-4">
							<div className="rounded-lg bg-[#0a7ea4]/10 p-2">
								<Package className="h-6 w-6 text-[#0a7ea4]" />
							</div>
							<div className="flex-1 space-y-1">
								<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
									Total items
								</p>
								<p className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
									{receptions.reduce((sum, rec) => sum + rec.totalItems, 0)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="p-6">
						<div className="flex items-center space-x-4">
							<div className="rounded-lg bg-blue-500/10 p-2">
								<Calendar className="h-6 w-6 text-blue-600" />
							</div>
							<div className="flex-1 space-y-1">
								<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
									Hoy
								</p>
								<p className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
									{
										receptions.filter((rec) => {
											const recDate = new Date(rec.arrivalDate);
											const today = new Date();
											return recDate.toDateString() === today.toDateString();
										}).length
									}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Receptions Table */}
			<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<CardHeader>
					<CardTitle className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
						Lista de recepciones
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="theme-transition rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
						<Table>
							<TableHeader>
								<TableRow className="border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]">
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Nº de envío
									</TableHead>
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Fecha de llegada
									</TableHead>
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Total de ítems
									</TableHead>
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Estado
									</TableHead>
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Acción
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{receptions.length === 0 ? (
									<TableRow>
										<TableCell className="py-12 text-center" colSpan={5}>
											<Package className="mx-auto mb-4 h-12 w-12 text-[#687076] dark:text-[#9BA1A6]" />
											<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
												No hay recepciones disponibles
											</p>
										</TableCell>
									</TableRow>
								) : (
									receptions.map((reception) => (
										<TableRow
											className="theme-transition border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]"
											key={reception.shipmentId}
										>
											<TableCell className="font-mono text-[#11181C] text-sm text-transition dark:text-[#ECEDEE]">
												{reception.shipmentId}
											</TableCell>
											<TableCell className="text-[#687076] text-transition dark:text-[#9BA1A6]">
												{formatDate(reception.arrivalDate)}
											</TableCell>
											<TableCell className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
												{reception.totalItems}
											</TableCell>
											<TableCell>
												<Badge
													className={
														reception.status === 'pendiente'
															? 'theme-transition bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400'
															: 'theme-transition bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
													}
													variant={
														reception.status === 'pendiente'
															? 'secondary'
															: 'default'
													}
												>
													{reception.status === 'pendiente'
														? 'Pendiente'
														: 'Completada'}
												</Badge>
											</TableCell>
											<TableCell>
												{reception.status === 'pendiente' ? (
													<Button
														asChild
														className="theme-transition bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90"
														size="sm"
													>
														<Link
															href={`/recepciones/${reception.shipmentId}`}
														>
															<ArrowRight className="mr-1 h-4 w-4" />
															Recibir
														</Link>
													</Button>
												) : (
													<span className="text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
														Completada
													</span>
												)}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
