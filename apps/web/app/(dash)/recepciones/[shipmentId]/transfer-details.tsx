"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getAllProducts } from "@/lib/fetch-functions/products";
import { getTransferDetailsById } from "@/lib/fetch-functions/recepciones";
import { createQueryKey } from "@/lib/helpers";
import {
	type UpdateTransferItemStatusPayload,
	type UpdateTransferStatusPayload,
	useUpdateTransferItemStatus,
	useUpdateTransferStatus,
} from "@/lib/mutations/transfers";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useReceptionStore } from "@/stores/reception-store";
import type { ProductCatalogResponse, WarehouseTransferDetails } from "@/types";

// =============================
// Helper types and utilities for safe extraction
// =============================

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => {
	if (value === null) {
		return false;
	}
	return typeof value === "object";
};

const toStringIfString = (value: unknown): string | undefined => {
	if (typeof value === "string") {
		return value;
	}
	return;
};

const toNumberIfNumber = (value: unknown): number | undefined => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	return;
};

const readNestedString = (
	root: UnknownRecord,
	key: string,
): string | undefined => {
	const candidate = root[key];
	if (typeof candidate === "string") {
		return candidate;
	}
	if (isRecord(candidate)) {
		// Try common nested shapes like { product: { name } }
		const nestedName = toStringIfString(candidate.name);
		if (nestedName) {
			return nestedName;
		}
	}
	return;
};

const readNestedNumber = (
	root: UnknownRecord,
	key: string,
): number | undefined => {
	const candidate = root[key];
	if (typeof candidate === "number" && Number.isFinite(candidate)) {
		return candidate;
	}
	if (isRecord(candidate)) {
		const nestedBarcode = toNumberIfNumber(candidate.barcode);
		if (nestedBarcode !== undefined) {
			return nestedBarcode;
		}
	}
	return;
};

// =============================
// Component
// =============================

type ReceptionItem = {
	id: string;
	barcode: number;
	productName: string;
	received: boolean;
};

interface PageProps {
	shipmentId: string;
	warehouseId: string;
}

type APIResponse = WarehouseTransferDetails | null;

/**
 * Renders the reception detail view for a specific transfer, allowing viewing and updating receipt status of items.
 *
 * @param shipmentId - The identifier of the transfer shipment to display
 * @param warehouseId - The identifier of the warehouse where the transfer is being received
 * @returns The component's JSX for the reception detail page, including progress, item list, and controls to mark items received
 */
export function ReceptionDetailPage({ shipmentId, warehouseId }: PageProps) {
	const router = useRouter();
	const { data: transferDetails } = useSuspenseQuery<
		APIResponse,
		Error,
		APIResponse
	>({
		queryKey: createQueryKey(queryKeys.recepcionDetail, [shipmentId as string]),
		queryFn: () => getTransferDetailsById(shipmentId as string),
	});
	const { data: productCatalog } = useSuspenseQuery<
		ProductCatalogResponse | null,
		Error,
		ProductCatalogResponse | null
	>({
		queryKey: queryKeys.productCatalog,
		queryFn: getAllProducts,
	});

	const {
		items,
		setItems,
		toggleReceived,
		markAllReceived,
		getReceivedCount,
		getTotalCount,
		isAllReceived,
	} = useReceptionStore();

	// Mutations for updating transfer and item statuses
	const { mutateAsync: updateTransferStatus } = useUpdateTransferStatus();
	const { mutateAsync: updateItemStatus } = useUpdateTransferItemStatus();

	// Seed store with derived items when data changes
	useEffect(() => {
		setItems(
			transferDetails && "data" in transferDetails
				? transferDetails.data.details
				: [],
		);
	}, [transferDetails]);

	const handleMarkAllReceived = async () => {
		markAllReceived();
		try {
			const payload = {
				transferId: shipmentId,
				status: "complete",
			} as UpdateTransferStatusPayload;
			await updateTransferStatus(payload);
			toast(
				"Recepción completada: Todos los artículos han sido marcados como recibidos",
			);
		} catch {
			toast.error("No se pudo actualizar el estado del traspaso");
		}

		// Navigate back to receptions list
		setTimeout(() => {
			router.push("/recepciones");
		}, 1500);
	};

	const handleToggleItem = async (itemId: string, nextReceived: boolean) => {
		toggleReceived(itemId);
		try {
			const payload = {
				transferDetailId: itemId,
				isReceived: nextReceived,
			} as UpdateTransferItemStatusPayload;
			await updateItemStatus(payload);
		} catch {
			toast.error("No se pudo actualizar el estado del ítem");
		}
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
							{shipmentId}
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-2">
					<h1 className="font-bold text-2xl text-[#11181C] text-transition md:text-3xl dark:text-[#ECEDEE]">
						Recepción de envío {shipmentId}
					</h1>
					<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
						Marca los artículos como recibidos
					</p>
					<p className="text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
						Almacén: {warehouseId}
					</p>
				</div>

				<Button
					className="theme-transition bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90 disabled:opacity-50"
					disabled={isAllReceived()}
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
									{`${receivedCount} / ${totalCount}`}
								</p>
							</div>
						</div>
						<div className="text-right">
							<p className="text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
								Completado
							</p>
							<p className="font-semibold text-[#0a7ea4] text-lg">
								{`${totalCount > 0 ? Math.round((receivedCount / totalCount) * 100) : 0}%`}
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
								{items.length === 0 && (
									<TableRow>
										<TableCell className="py-12 text-center" colSpan={4}>
											<Package className="mx-auto mb-4 h-12 w-12 text-[#687076] dark:text-[#9BA1A6]" />
											<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
												No hay artículos en este envío
											</p>
										</TableCell>
									</TableRow>
								)}

								{items.length > 0 &&
									items.map((item) => (
										<Fragment key={item.id}>
											{/* Group header */}
											<TableRow className="theme-transition bg-[#F9FAFB]/60 dark:bg-[#1E1F20]/60">
												<TableCell
													className="py-3 font-medium text-[#687076] text-transition dark:text-[#9BA1A6]"
													colSpan={4}
												>
													<div className="flex items-center space-x-3">
														<span className="font-mono text-sm">
															Código: {item.productBarcode}
														</span>
														<span className="text-sm">
															•{" "}
															{
																productCatalog?.data.find(
																	(product) =>
																		product.good_id === item.productBarcode,
																)?.title
															}
														</span>
														<span className="rounded-full bg-[#0a7ea4]/10 px-2 py-1 text-[#0a7ea4] text-xs">
															{items.length} items
														</span>
													</div>
												</TableCell>
											</TableRow>

											{/* Group items */}
											{items.map((item) => (
												<TableRow
													className={cn(
														"theme-transition border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]",
														item.isReceived && "opacity-75",
													)}
													key={item.id}
												>
													<TableCell className="pl-8 font-mono text-[#11181C] text-sm text-transition dark:text-[#ECEDEE]">
														{item.id}
													</TableCell>
													<TableCell className="font-mono text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
														{item.productBarcode}
													</TableCell>
													<TableCell
														className={cn(
															"text-[#11181C] text-transition dark:text-[#ECEDEE]",
															item.isReceived && "line-through",
														)}
													>
														{
															productCatalog?.data.find(
																(product) =>
																	product.good_id === item.productBarcode,
															)?.title
														}
													</TableCell>
													<TableCell>
														<Checkbox
															checked={item.isReceived ?? false}
															className="h-5 w-5 data-[state=checked]:border-[#0a7ea4] data-[state=checked]:bg-[#0a7ea4]"
															onCheckedChange={(checked) =>
																handleToggleItem(item.id, Boolean(checked))
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
