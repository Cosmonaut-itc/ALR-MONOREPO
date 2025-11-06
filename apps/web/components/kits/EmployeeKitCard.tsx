"use memo";
"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
	Calendar as CalendarIcon,
	ChevronDown,
	ChevronUp,
	Eye,
	History,
	Package,
	User,
	X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { KitData } from "@/types";

/**
 * Employee type matching the structure from ajustes page
 */
interface Employee {
	id: string;
	name: string;
	warehouseId: string;
	passcode?: number;
}

type ProductStock = {
	productStock: {
		id: string;
		barcode: number;
		description: string | null;
		lastUsed: string | null;
		lastUsedBy: string | null;
		numberOfUses: number;
		isDeleted: boolean;
		currentWarehouse: string;
		currentCabinet: string | null;
		isBeingUsed: boolean;
		isKit: boolean;
		firstUsed: string | null;
	};
	employee: {
		id: string;
		name: string;
		surname: string;
	} | null;
};

interface EmployeeKitCardProps {
	/** Employee data */
	employee: Employee;
	/** Current kit for today */
	currentKit: KitData | undefined;
	/** All kits for this employee (for history) */
	allKitsForEmployee: KitData[];
	/** Warehouse name for display */
	warehouseName?: string;
	/** Products being used by the employee */
	employeeProducts: ProductStock[];
}

/**
 * EmployeeKitCard Component
 *
 * Displays an employee card with their current kit and expandable kit history.
 * The history section allows viewing past kits with date filtering.
 */
export function EmployeeKitCard({
	employee,
	currentKit,
	allKitsForEmployee,
	employeeProducts,
	warehouseName,
}: EmployeeKitCardProps) {
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);
	const [historyDateFilter, setHistoryDateFilter] = useState<Date | undefined>(
		undefined,
	);

	// Filter history to exclude the current kit and apply date filter
	const historyKits = useMemo(() => {
		// Exclude current kit from history
		let filtered = allKitsForEmployee.filter(
			(kit) => kit.id !== currentKit?.id,
		);

		// Apply date filter if selected
		if (historyDateFilter) {
			const filterDate = historyDateFilter.toDateString();
			filtered = filtered.filter(
				(kit) => new Date(kit.assignedDate).toDateString() === filterDate,
			);
		}

		return filtered;
	}, [allKitsForEmployee, currentKit?.id, historyDateFilter]);

	/**
	 * Formats a date string to a localized format
	 */
	const formatDate = (dateString: string) => {
		return format(new Date(dateString), "PPP", { locale: es });
	};

	/**
	 * Calculates total products in a kit
	 */
	const getTotalProducts = (kit: KitData) => {
		return kit.numProducts;
	};

	/**
	 * Gets the return status badge for the current kit
	 */
	const getReturnStatusBadge = (kit: KitData | undefined) => {
		if (!kit) return null;

		if (kit.isComplete) {
			return (
				<Badge
					className="ml-2 bg-green-600 hover:bg-green-700"
					variant="default"
				>
					Devuelto
				</Badge>
			);
		}

		if (kit.isPartial) {
			return (
				<Badge
					className="ml-2 bg-amber-500 hover:bg-amber-600"
					variant="default"
				>
					Parcial
				</Badge>
			);
		}

		return (
			<Badge className="ml-2 bg-blue-600 hover:bg-blue-700" variant="default">
				Activo
			</Badge>
		);
	};

	return (
		<Card className="card-transition hover:shadow-md">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3 flex-1 min-w-0">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0a7ea4]/10 dark:bg-[#0a7ea4]/20">
							<User className="h-6 w-6 text-[#0a7ea4]" />
						</div>
						<div className="flex-1 min-w-0">
							<h3 className="font-semibold text-base truncate text-[#11181C] dark:text-[#ECEDEE]">
								{employee.name}
							</h3>
							<div className="flex items-center gap-2 mt-1">
								{warehouseName && (
									<Badge className="text-xs" variant="secondary">
										{warehouseName}
									</Badge>
								)}
								{employee.passcode && (
									<span className="font-mono text-xs text-[#687076] dark:text-[#9BA1A6]">
										#{employee.passcode}
									</span>
								)}
							</div>
						</div>
					</div>
					{getReturnStatusBadge(currentKit)}
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Current Kit Section */}
				{currentKit ? (
					<div className="space-y-3 pb-3 border-b border-[#E5E7EB] dark:border-[#2D3033]">
						<div className="flex items-center justify-between text-sm">
							<span className="text-[#687076] dark:text-[#9BA1A6]">
								Kit ID:
							</span>
							<span className="font-mono text-xs text-[#11181C] dark:text-[#ECEDEE]">
								{currentKit.id.slice(-8)}
							</span>
						</div>

						<div className="flex items-center justify-between text-sm">
							<div className="flex items-center gap-1 text-[#687076] dark:text-[#9BA1A6]">
								<Package className="h-3 w-3" />
								<span>Productos:</span>
							</div>
							<span className="font-medium text-[#11181C] dark:text-[#ECEDEE]">
								{getTotalProducts(currentKit)}
							</span>
						</div>

						<div className="flex items-center justify-between text-sm">
							<div className="flex items-center gap-1 text-[#687076] dark:text-[#9BA1A6]">
								<CalendarIcon className="h-3 w-3" />
								<span>Fecha:</span>
							</div>
							<span className="text-[#11181C] dark:text-[#ECEDEE]">
								{formatDate(currentKit.assignedDate)}
							</span>
						</div>

						<div className="pt-2">
							<p className="text-xs text-[#687076] dark:text-[#9BA1A6] truncate">
								{currentKit.observations}
							</p>
						</div>

						<Button asChild className="w-full" size="sm">
							<Link href={`/kits/${currentKit.id}`}>
								<Eye className="h-4 w-4 mr-2" />
								Inspeccionar Kit
							</Link>
						</Button>
					</div>
				) : (
					<div className="pb-3 border-b border-[#E5E7EB] dark:border-[#2D3033]">
						<p className="text-center text-sm text-[#687076] dark:text-[#9BA1A6]">
							Sin kit asignado para hoy
						</p>
					</div>
				)}

				{/* Products Currently Being Used Section */}
				<div className="space-y-3 pb-3 border-b border-[#E5E7EB] dark:border-[#2D3033]">
					<div className="flex items-center gap-2">
						<Package className="h-4 w-4 text-[#0a7ea4]" />
						<h4 className="font-semibold text-sm text-[#11181C] dark:text-[#ECEDEE]">
							Productos en Uso ({employeeProducts.length})
						</h4>
					</div>
					{employeeProducts.length > 0 ? (
						<div className="space-y-2 max-h-48 overflow-y-auto">
							{employeeProducts.map((item) => (
								<Card
									className="p-2 bg-[#F9FAFB] dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033]"
									key={item.productStock.id}
								>
									<div className="space-y-1">
										<div className="flex items-start justify-between gap-2">
											<div className="flex-1 min-w-0">
												<p className="font-medium text-xs text-[#11181C] dark:text-[#ECEDEE] truncate">
													{item.productStock.description ||
														`Producto #${item.productStock.barcode}`}
												</p>
												<div className="flex items-center gap-2 mt-0.5">
													<span className="font-mono text-[#687076] text-xs dark:text-[#9BA1A6]">
														#{item.productStock.barcode}
													</span>
													{item.productStock.numberOfUses > 0 && (
														<>
															<span className="text-[#687076] dark:text-[#9BA1A6]">
																•
															</span>
															<span className="text-[#687076] text-xs dark:text-[#9BA1A6]">
																{item.productStock.numberOfUses}{" "}
																{item.productStock.numberOfUses === 1
																	? "uso"
																	: "usos"}
															</span>
														</>
													)}
												</div>
											</div>
											{item.productStock.isBeingUsed && (
												<Badge
													className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs"
													variant="outline"
												>
													En uso
												</Badge>
											)}
										</div>
										{item.productStock.lastUsed && (
											<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
												Último uso:{" "}
												{format(new Date(item.productStock.lastUsed), "PPp", {
													locale: es,
												})}
											</p>
										)}
									</div>
								</Card>
							))}
						</div>
					) : (
						<div className="flex items-center justify-center rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-6 dark:border-[#2D3033] dark:bg-[#1E1F20]">
							<p className="text-center text-[#687076] text-sm dark:text-[#9BA1A6]">
								No hay productos en uso actualmente
							</p>
						</div>
					)}
				</div>

				{/* Kit History Section */}
				<Collapsible onOpenChange={setIsHistoryOpen} open={isHistoryOpen}>
					<CollapsibleTrigger asChild>
						<Button
							className="w-full justify-between"
							size="sm"
							variant="outline"
						>
							<div className="flex items-center gap-2">
								<History className="h-4 w-4" />
								<span>
									Historial de Kits (
									{
										allKitsForEmployee.filter(
											(kit) => kit.id !== currentKit?.id,
										).length
									}
									)
								</span>
							</div>
							{isHistoryOpen ? (
								<ChevronUp className="h-4 w-4" />
							) : (
								<ChevronDown className="h-4 w-4" />
							)}
						</Button>
					</CollapsibleTrigger>

					<CollapsibleContent className="pt-3 space-y-2">
						{/* Date Filter */}
						<div className="flex items-center gap-2">
							<Popover>
								<PopoverTrigger asChild>
									<Button
										className="w-full justify-start text-left font-normal"
										size="sm"
										variant="outline"
									>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{historyDateFilter ? (
											format(historyDateFilter, "PPP", { locale: es })
										) : (
											<span>Filtrar por fecha</span>
										)}
									</Button>
								</PopoverTrigger>
								<PopoverContent align="start" className="w-auto p-0">
									<Calendar
										initialFocus
										locale={es}
										mode="single"
										onSelect={(date) => setHistoryDateFilter(date)}
										selected={historyDateFilter}
									/>
								</PopoverContent>
							</Popover>
							{historyDateFilter && (
								<Button
									onClick={() => setHistoryDateFilter(undefined)}
									size="sm"
									variant="ghost"
								>
									<X className="h-4 w-4" />
								</Button>
							)}
						</div>

						{/* History Kits List */}
						{historyKits.length > 0 ? (
							<div className="space-y-2 max-h-64 overflow-y-auto">
								{historyKits
									.sort(
										(a, b) =>
											new Date(b.assignedDate).getTime() -
											new Date(a.assignedDate).getTime(),
									)
									.map((kit) => (
										<Card className="p-3 bg-muted/50" key={kit.id}>
											<div className="space-y-2">
												<div className="flex items-center justify-between">
													<span className="font-mono text-xs text-[#687076] dark:text-[#9BA1A6]">
														{kit.id.slice(-8)}
													</span>
													<Badge className="text-xs" variant="outline">
														{format(new Date(kit.assignedDate), "dd/MM/yyyy")}
													</Badge>
												</div>
												<div className="flex items-center justify-between text-sm">
													<span className="text-xs text-[#687076] dark:text-[#9BA1A6]">
														{getTotalProducts(kit)} productos
													</span>
													<Button asChild size="sm" variant="ghost">
														<Link href={`/kits/${kit.id}`}>
															<Eye className="h-3 w-3" />
														</Link>
													</Button>
												</div>
											</div>
										</Card>
									))}
							</div>
						) : (
							<p className="text-center text-xs text-[#687076] dark:text-[#9BA1A6] py-2">
								{historyDateFilter
									? "No hay kits para la fecha seleccionada"
									: "No hay kits anteriores"}
							</p>
						)}
					</CollapsibleContent>
				</Collapsible>
			</CardContent>
		</Card>
	);
}
