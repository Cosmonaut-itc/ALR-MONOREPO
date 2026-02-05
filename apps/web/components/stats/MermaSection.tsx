"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
	type MermaEventsRow,
	type MermaMissingTransfersSummaryResponse,
	type MermaReason,
	type MermaScope,
	type MermaSource,
	type MermaWriteoffsSummaryResponse,
	exportMermaEventsCsv,
	getMermaMissingTransfersSummary,
	getMermaWriteoffEvents,
	getMermaWriteoffsSummary,
} from "@/lib/fetch-functions/merma";
import { createQueryKey } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";
import type { DateRange } from "@/lib/stats/estadisticas";

type ScopeOption = "global" | "warehouse";
type EventFilters = {
	source: MermaSource;
	reason: MermaReason | "all";
	search: string;
};

type MermaSectionProps = {
	userRole: string;
	isEncargado: boolean;
	scope: ScopeOption;
	warehouseId: string | null;
	resolvedWarehouseId: string | null;
	effectiveRange: DateRange;
};

const reasonLabel: Record<MermaReason, string> = {
	consumido: "Consumido",
	dañado: "Dañado",
	otro: "Otro",
};

const sourceLabel: Record<MermaSource, string> = {
	manual: "Baja operativa",
	transfer_missing: "Faltante transferencia",
};

function formatIsoDate(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}
	return format(date, "dd/MM/yyyy HH:mm", { locale: es });
}

function getWriteoffTotals(
	response: MermaWriteoffsSummaryResponse | null,
): { total: number; consumido: number; dañado: number; otro: number } {
	if (!response?.success) {
		return { total: 0, consumido: 0, dañado: 0, otro: 0 };
	}
	const data = response.data;
	if (data.scope === "global") {
		return {
			total: data.totals.total,
			consumido: data.totals.consumido,
			dañado: data.totals.dañado,
			otro: data.totals.otro,
		};
	}

	const consumed = data.reasonSummary.find(
		(item) => item.reason === "consumido",
	)?.total;
	const damaged = data.reasonSummary.find(
		(item) => item.reason === "dañado",
	)?.total;
	const other = data.reasonSummary.find((item) => item.reason === "otro")?.total;
	return {
		total: data.total,
		consumido: consumed ?? 0,
		dañado: damaged ?? 0,
		otro: other ?? 0,
	};
}

export function MermaSection({
	userRole,
	isEncargado,
	scope,
	warehouseId,
	resolvedWarehouseId,
	effectiveRange,
}: MermaSectionProps) {
	const mermaScope: MermaScope = isEncargado ? "warehouse" : scope;
	const mermaWarehouseId =
		mermaScope === "warehouse"
			? (resolvedWarehouseId ?? warehouseId ?? null)
			: null;
	const startIso = effectiveRange.start.toISOString();
	const endIso = effectiveRange.end.toISOString();

	const [eventsOpen, setEventsOpen] = useState(false);
	const [eventsSource, setEventsSource] = useState<MermaSource>("manual");
	const [eventsReason, setEventsReason] = useState<MermaReason | "all">("all");
	const [searchInput, setSearchInput] = useState("");
	const [eventsSearch, setEventsSearch] = useState("");
	const [eventsItems, setEventsItems] = useState<MermaEventsRow[]>([]);
	const [eventsCursor, setEventsCursor] = useState<string | null>(null);
	const [eventsLoading, setEventsLoading] = useState(false);
	const [eventsError, setEventsError] = useState<string | null>(null);
	const [isExporting, setIsExporting] = useState(false);

	const { data: writeoffsSummaryResponse } = useSuspenseQuery<
		MermaWriteoffsSummaryResponse | null,
		Error,
		MermaWriteoffsSummaryResponse | null
	>({
		queryKey: createQueryKey(queryKeys.mermaWriteoffsSummary, [
			mermaScope,
			mermaWarehouseId ?? "all",
			startIso,
			endIso,
		]),
		queryFn: () =>
			getMermaWriteoffsSummary({
				start: startIso,
				end: endIso,
				scope: mermaScope,
				...(mermaWarehouseId ? { warehouseId: mermaWarehouseId } : {}),
			}),
	});

	const { data: missingSummaryResponse } = useSuspenseQuery<
		MermaMissingTransfersSummaryResponse | null,
		Error,
		MermaMissingTransfersSummaryResponse | null
	>({
		queryKey: createQueryKey(queryKeys.mermaMissingTransfersSummary, [
			mermaScope,
			mermaWarehouseId ?? "all",
			startIso,
			endIso,
		]),
		queryFn: () =>
			getMermaMissingTransfersSummary({
				start: startIso,
				end: endIso,
				scope: mermaScope,
				...(mermaWarehouseId ? { warehouseId: mermaWarehouseId } : {}),
			}),
	});

	const writeoffTotals = useMemo(
		() => getWriteoffTotals(writeoffsSummaryResponse),
		[writeoffsSummaryResponse],
	);
	const missingTotal = useMemo(() => {
		if (!missingSummaryResponse?.success) {
			return 0;
		}
		return missingSummaryResponse.data.totalMissing;
	}, [missingSummaryResponse]);

	const fetchEvents = async (filters: EventFilters, cursor?: string) => {
		setEventsLoading(true);
		setEventsError(null);

		const response = await getMermaWriteoffEvents({
			start: startIso,
			end: endIso,
			source: filters.source,
			...(mermaWarehouseId ? { warehouseId: mermaWarehouseId } : {}),
			...(filters.reason !== "all" ? { reason: filters.reason } : {}),
			...(filters.search ? { q: filters.search } : {}),
			limit: 50,
			...(cursor ? { cursor } : {}),
		});

		if (!response?.success) {
			setEventsError(response?.message ?? "No se pudieron cargar eventos");
			setEventsLoading(false);
			return;
		}

		const payload = response.data;
		setEventsItems((previousItems) =>
			cursor ? [...previousItems, ...payload.items] : payload.items,
		);
		setEventsCursor(payload.nextCursor);
		setEventsLoading(false);
	};

	const applyEventFilters = (nextFilters: EventFilters) => {
		setEventsSource(nextFilters.source);
		setEventsReason(nextFilters.reason);
		setEventsSearch(nextFilters.search);
		setEventsItems([]);
		setEventsCursor(null);
		void fetchEvents(nextFilters);
	};

	const handleExport = async () => {
		setIsExporting(true);
		const csv = await exportMermaEventsCsv({
			start: startIso,
			end: endIso,
			scope: mermaScope,
			...(mermaWarehouseId ? { warehouseId: mermaWarehouseId } : {}),
		});
		setIsExporting(false);
		if (!csv) {
			return;
		}
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = window.URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `merma_${Date.now()}.csv`;
		anchor.click();
		window.URL.revokeObjectURL(url);
	};

	const openEvents = (source: MermaSource) => {
		const nextFilters: EventFilters = {
			source,
			reason: "all",
			search: "",
		};
		setSearchInput("");
		setEventsOpen(true);
		applyEventFilters(nextFilters);
	};

	const writeoffSummaryData =
		writeoffsSummaryResponse?.success ? writeoffsSummaryResponse.data : null;
	const missingSummaryData =
		missingSummaryResponse?.success ? missingSummaryResponse.data : null;

	return (
		<section className="grid gap-4">
			<Card className="card-transition">
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">
						Merma - Bajas operativas
					</CardTitle>
					<div className="flex items-center gap-2">
						<Button
							onClick={() => openEvents("manual")}
							size="sm"
							type="button"
							variant="outline"
						>
							Ver eventos
						</Button>
						{userRole === "admin" ? (
							<Button
								onClick={handleExport}
								size="sm"
								type="button"
								variant="outline"
							>
								<Download className="mr-2 h-4 w-4" />
								{isExporting ? "Exportando..." : "Exportar CSV"}
							</Button>
						) : null}
					</div>
				</CardHeader>
				<CardContent className="grid gap-4">
					<div className="grid gap-3 md:grid-cols-4">
						<div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 dark:border-[#2D3033] dark:bg-[#1E1F20]">
							<p className="text-xs uppercase text-[#9BA1A6]">Total</p>
							<p className="text-2xl font-semibold text-[#11181C] dark:text-[#ECEDEE]">
								{writeoffTotals.total}
							</p>
						</div>
						<div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 dark:border-[#2D3033] dark:bg-[#1E1F20]">
							<p className="text-xs uppercase text-[#9BA1A6]">Consumido</p>
							<p className="text-2xl font-semibold text-[#E85D04]">
								{writeoffTotals.consumido}
							</p>
						</div>
						<div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 dark:border-[#2D3033] dark:bg-[#1E1F20]">
							<p className="text-xs uppercase text-[#9BA1A6]">Dañado</p>
							<p className="text-2xl font-semibold text-[#C1121F]">
								{writeoffTotals.dañado}
							</p>
						</div>
						<div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 dark:border-[#2D3033] dark:bg-[#1E1F20]">
							<p className="text-xs uppercase text-[#9BA1A6]">Otro</p>
							<p className="text-2xl font-semibold text-[#0a7ea4]">
								{writeoffTotals.otro}
							</p>
						</div>
					</div>

					{writeoffSummaryData?.scope === "global" ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Almacén</TableHead>
									<TableHead className="text-right">Consumido</TableHead>
									<TableHead className="text-right">Dañado</TableHead>
									<TableHead className="text-right">Otro</TableHead>
									<TableHead className="text-right">Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{writeoffSummaryData.rows.map((row) => (
									<TableRow key={row.warehouseId}>
										<TableCell>{row.warehouseName}</TableCell>
										<TableCell className="text-right">{row.consumido}</TableCell>
										<TableCell className="text-right">{row.dañado}</TableCell>
										<TableCell className="text-right">{row.otro}</TableCell>
										<TableCell className="text-right font-medium">
											{row.total}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : null}

					{writeoffSummaryData?.scope === "warehouse" ? (
						<div className="grid gap-4">
							{writeoffSummaryData.reasonSummary.map((reason) => (
								<div
									className="rounded-lg border border-[#E5E7EB] p-4 dark:border-[#2D3033]"
									key={reason.reason}
								>
									<div className="mb-3 flex items-center justify-between">
										<p className="font-medium text-[#11181C] dark:text-[#ECEDEE]">
											{reasonLabel[reason.reason]}
										</p>
										<p className="text-sm text-[#687076] dark:text-[#9BA1A6]">
											{reason.total} ({reason.percentage}%)
										</p>
									</div>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Barcode</TableHead>
												<TableHead>Descripción</TableHead>
												<TableHead className="text-right">Total</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{reason.topProducts.length > 0 ? (
												reason.topProducts.map((product) => (
													<TableRow
														key={`${reason.reason}-${product.barcode}`}
													>
														<TableCell>{product.barcode}</TableCell>
														<TableCell>
															{product.description ?? "Sin descripción"}
														</TableCell>
														<TableCell className="text-right">
															{product.total}
														</TableCell>
													</TableRow>
												))
											) : (
												<TableRow>
													<TableCell
														className="text-center text-[#687076] dark:text-[#9BA1A6]"
														colSpan={3}
													>
														Sin productos para este motivo.
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								</div>
							))}
						</div>
					) : null}
				</CardContent>
			</Card>

			<Card className="card-transition">
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-base font-semibold text-[#11181C] dark:text-[#ECEDEE]">
						Merma - Faltantes por transferencias externas
					</CardTitle>
					<Button
						onClick={() => openEvents("transfer_missing")}
						size="sm"
						type="button"
						variant="outline"
					>
						Ver eventos
					</Button>
				</CardHeader>
				<CardContent className="grid gap-4">
					<div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 dark:border-[#2D3033] dark:bg-[#1E1F20]">
						<p className="text-xs uppercase text-[#9BA1A6]">Total faltantes</p>
						<p className="text-2xl font-semibold text-[#11181C] dark:text-[#ECEDEE]">
							{missingTotal}
						</p>
					</div>

					{missingSummaryData?.scope === "global" ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Almacén destino</TableHead>
									<TableHead className="text-right">Faltantes</TableHead>
									<TableHead className="text-right">% global</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{missingSummaryData.rows.map((row) => (
									<TableRow key={row.warehouseId}>
										<TableCell>{row.warehouseName}</TableCell>
										<TableCell className="text-right">{row.totalMissing}</TableCell>
										<TableCell className="text-right">
											{row.percentageOfGlobal}%
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : null}

					{missingSummaryData?.scope === "warehouse" ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Transferencia</TableHead>
									<TableHead>Origen</TableHead>
									<TableHead className="text-right">Enviado</TableHead>
									<TableHead className="text-right">Recibido</TableHead>
									<TableHead className="text-right">Faltante</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{missingSummaryData.rows.map((row) => (
									<TableRow key={row.transferId}>
										<TableCell>{row.transferNumber}</TableCell>
										<TableCell>{row.originWarehouseName}</TableCell>
										<TableCell className="text-right">{row.sent}</TableCell>
										<TableCell className="text-right">{row.received}</TableCell>
										<TableCell className="text-right font-medium">
											{row.missing}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : null}
				</CardContent>
			</Card>

			<Dialog onOpenChange={setEventsOpen} open={eventsOpen}>
				<DialogContent className="max-h-[80vh] max-w-5xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Eventos de merma</DialogTitle>
						<DialogDescription>
							Consulta detallada con paginación por cursor.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 md:grid-cols-4">
						<div className="grid gap-2">
							<Label>Fuente</Label>
							<Select
								onValueChange={(value) =>
									applyEventFilters({
										source: value as MermaSource,
										reason: eventsReason,
										search: eventsSearch,
									})
								}
								value={eventsSource}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="manual">Baja operativa</SelectItem>
									<SelectItem value="transfer_missing">
										Faltante transferencia
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label>Motivo</Label>
							<Select
								onValueChange={(value) =>
									applyEventFilters({
										source: eventsSource,
										reason: value as MermaReason | "all",
										search: eventsSearch,
									})
								}
								value={eventsReason}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Todos</SelectItem>
									<SelectItem value="consumido">Consumido</SelectItem>
									<SelectItem value="dañado">Dañado</SelectItem>
									<SelectItem value="otro">Otro</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2 md:col-span-2">
							<Label>Búsqueda</Label>
							<div className="flex gap-2">
								<Input
									onChange={(event) => setSearchInput(event.target.value)}
									placeholder="barcode, UUID, transferencia, descripción"
									value={searchInput}
								/>
								<Button
									onClick={() =>
										applyEventFilters({
											source: eventsSource,
											reason: eventsReason,
											search: searchInput.trim(),
										})
									}
									type="button"
									variant="outline"
								>
									<Search className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>

					{eventsError ? (
						<div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-sm text-[#991B1B]">
							{eventsError}
						</div>
					) : null}

					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Fecha</TableHead>
								<TableHead>Fuente</TableHead>
								<TableHead>Motivo</TableHead>
								<TableHead>Almacén</TableHead>
								<TableHead>Barcode</TableHead>
								<TableHead className="text-right">Cantidad</TableHead>
								<TableHead>Notas</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{eventsItems.length === 0 ? (
								<TableRow>
									<TableCell
										className="text-center text-[#687076] dark:text-[#9BA1A6]"
										colSpan={7}
									>
										{eventsLoading
											? "Cargando eventos..."
											: "No hay eventos para los filtros seleccionados."}
									</TableCell>
								</TableRow>
							) : (
								eventsItems.map((item) => (
									<TableRow key={item.id}>
										<TableCell>{formatIsoDate(item.createdAt)}</TableCell>
										<TableCell>{sourceLabel[item.source]}</TableCell>
										<TableCell>{reasonLabel[item.reason]}</TableCell>
										<TableCell>{item.warehouseName}</TableCell>
										<TableCell>{item.productBarcode}</TableCell>
										<TableCell className="text-right">{item.quantity}</TableCell>
										<TableCell>{item.notes ?? "—"}</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>

					<div className="flex justify-end">
						<Button
							disabled={eventsLoading || !eventsCursor}
							onClick={() => {
								if (!eventsCursor) {
									return;
								}
								void fetchEvents(
									{
										source: eventsSource,
										reason: eventsReason,
										search: eventsSearch,
									},
									eventsCursor,
								);
							}}
							type="button"
							variant="outline"
						>
							{eventsLoading ? "Cargando..." : "Cargar más"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</section>
	);
}
