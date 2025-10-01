"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
	Calendar,
	ChevronDown,
	ChevronUp,
	Eye,
	History,
	Package,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useKitsStore } from "@/stores/kits-store";

/**
 * Employee type based on the normalized shape used in kits page
 */
interface Employee {
	id: string;
	name: string;
	specialty: string;
	avatar: string;
	active: boolean;
}

/**
 * Kit type matching the normalized structure from kits page
 */
interface Kit {
	id: string;
	employeeId: string;
	date: string;
	items: Array<{ productId: string; qty: number }>;
}

interface EmployeeKitCardProps {
	/** Employee data */
	employee: Employee;
	/** Current kit for the selected date */
	currentKit: Kit | undefined;
	/** All kits for this employee (for history) */
	allKitsForEmployee: Kit[];
	/** Selected date for filtering current kit */
	selectedDate: Date;
}

/**
 * EmployeeKitCard Component
 *
 * Displays an employee card with their current kit and expandable kit history.
 * The history section allows viewing past kits with date information.
 */
export function EmployeeKitCard({
	employee,
	currentKit,
	allKitsForEmployee,
	selectedDate,
}: EmployeeKitCardProps) {
	const { products } = useKitsStore();
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);

	// Filter history to exclude the current kit
	const historyKits = allKitsForEmployee.filter(
		(kit) => new Date(kit.date).toDateString() !== selectedDate.toDateString(),
	);

	/**
	 * Formats a date string to a localized format
	 */
	const formatDate = (dateString: string) => {
		return format(new Date(dateString), "PPP", { locale: es });
	};

	/**
	 * Gets product names for a kit, showing up to 2 names and count of remaining
	 */
	const getProductNames = (kit: Kit) => {
		const names = kit.items.map((item) => {
			const product = products.find((p) => p.id === item.productId);
			return product?.name || "Producto desconocido";
		});

		if (names.length <= 2) {
			return names.join(", ");
		}

		return `${names.slice(0, 2).join(", ")} y ${names.length - 2} más`;
	};

	/**
	 * Calculates total products in a kit
	 */
	const getTotalProducts = (kit: Kit) => {
		return kit.items.reduce((sum, item) => sum + item.qty, 0);
	};

	return (
		<Card className="card-transition hover:shadow-md">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Avatar className="h-12 w-12">
							<AvatarImage
								alt={employee.name}
								src={employee.avatar || "/placeholder.svg"}
							/>
							<AvatarFallback className="bg-[#0a7ea4] text-white">
								{employee.name
									.split(" ")
									.map((n) => n[0])
									.join("")}
							</AvatarFallback>
						</Avatar>
						<div className="flex-1 min-w-0">
							<h3 className="font-semibold text-base truncate text-[#11181C] dark:text-[#ECEDEE]">
								{employee.name}
							</h3>
							<Badge className="text-xs mt-1" variant="secondary">
								{employee.specialty}
							</Badge>
						</div>
					</div>
					{currentKit && (
						<Badge className="ml-2" variant="default">
							Kit Activo
						</Badge>
					)}
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
								<Calendar className="h-3 w-3" />
								<span>Fecha:</span>
							</div>
							<span className="text-[#11181C] dark:text-[#ECEDEE]">
								{formatDate(currentKit.date)}
							</span>
						</div>

						<div className="pt-2">
							<p className="text-xs text-[#687076] dark:text-[#9BA1A6] truncate">
								{getProductNames(currentKit)}
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
							Sin kit asignado para{" "}
							{format(selectedDate, "PPP", { locale: es })}
						</p>
					</div>
				)}

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
								<span>Historial de Kits ({historyKits.length})</span>
							</div>
							{isHistoryOpen ? (
								<ChevronUp className="h-4 w-4" />
							) : (
								<ChevronDown className="h-4 w-4" />
							)}
						</Button>
					</CollapsibleTrigger>

					<CollapsibleContent className="pt-3 space-y-2">
						{historyKits.length > 0 ? (
							<div className="space-y-2 max-h-64 overflow-y-auto">
								{historyKits
									.sort(
										(a, b) =>
											new Date(b.date).getTime() - new Date(a.date).getTime(),
									)
									.map((kit) => (
										<Card className="p-3 bg-muted/50" key={kit.id}>
											<div className="space-y-2">
												<div className="flex items-center justify-between">
													<span className="font-mono text-xs text-[#687076] dark:text-[#9BA1A6]">
														{kit.id.slice(-8)}
													</span>
													<Badge className="text-xs" variant="outline">
														{format(new Date(kit.date), "dd/MM/yyyy")}
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
								No hay kits anteriores
							</p>
						)}
					</CollapsibleContent>
				</Collapsible>
			</CardContent>
		</Card>
	);
}
