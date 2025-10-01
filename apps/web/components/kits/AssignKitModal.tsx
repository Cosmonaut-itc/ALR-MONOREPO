"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { getInventoryByWarehouse } from "@/lib/fetch-functions/inventory";
import type { getEmployeesByUserId } from "@/lib/fetch-functions/kits";
import { useCreateKit, useUpdateProductStockUsage } from "@/lib/mutations/kits";
import { cn } from "@/lib/utils";
import { useKitsStore } from "@/stores/kits-store";

type EmployeesResponse = Awaited<
	ReturnType<typeof getEmployeesByUserId>
> | null;
type InventoryResponse = Awaited<
	ReturnType<typeof getInventoryByWarehouse>
> | null;

interface KitProduct {
	productStock?: {
		id?: string;
		currentWarehouse?: string;
		isKit?: boolean;
		description?: string | null;
		barcode?: number;
		lastUsedBy?: string | null;
	};
	productName?: string;
	productBrand?: string;
	employee?: {
		id?: string;
		name?: string;
		surname?: string;
	} | null;
}

interface AssignKitModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Employees data passed from parent */
	employeesData: EmployeesResponse;
	/** Kit products filtered by isKit flag */
	kitProducts: KitProduct[];
}

export function AssignKitModal({
	open,
	onOpenChange,
	employeesData,
	kitProducts,
}: AssignKitModalProps) {
	const { draft, setDraft, clearDraft, addKit } = useKitsStore();
	const [employeeOpen, setEmployeeOpen] = useState(false);
	const [kitId, setKitId] = useState("");
	const [selectedProducts, setSelectedProducts] = useState<
		Array<{ productId: string; qty: number }>
	>([]);

	const toArray = useMemo(
		() =>
			(value: unknown): unknown[] =>
				Array.isArray(value) ? value : [],
		[],
	);
	const toStringOrEmpty = useMemo(
		() =>
			(v: unknown): string =>
				typeof v === "string" ? v : "",
		[],
	);
	const normalizeEmployee = useMemo(
		() => (raw: unknown) => {
			const rec = (raw as { employee?: unknown }).employee ?? raw;
			const e = (rec ?? {}) as {
				id?: unknown;
				name?: unknown;
				surname?: unknown;
				avatar?: unknown;
				warehouseId?: unknown;
			};
			const id = toStringOrEmpty(e.id);
			const name = toStringOrEmpty(e.name);
			const surname = toStringOrEmpty(e.surname);
			const avatar = toStringOrEmpty(e.avatar);
			const warehouseId = toStringOrEmpty(e.warehouseId);
			const fullName = [name, surname].filter(Boolean).join(" ");
			return {
				id,
				name: fullName || name || "Empleado",
				specialty: "",
				avatar,
				active: true as const,
				warehouseId,
			};
		},
		[toStringOrEmpty],
	);
	const employees = useMemo(() => {
		const root = (employeesData ?? { data: [], json: [] }) as {
			data?: unknown;
			json?: unknown;
		};
		const candidate = root.data ?? root.json ?? [];
		return toArray(candidate).map(normalizeEmployee);
	}, [employeesData, toArray, normalizeEmployee]);

	// Filter kit products by selected employee's warehouse ID
	const products = useMemo(() => {
		const selectedEmployee = employees.find(
			(emp) => emp.id === draft.employeeId,
		);
		const employeeWarehouseId = selectedEmployee?.warehouseId;

		// If no employee selected, return empty array
		if (!employeeWarehouseId) {
			return [];
		}

		// Filter kitProducts by employee's warehouse
		return kitProducts
			.filter(
				(product) =>
					product.productStock?.currentWarehouse === employeeWarehouseId,
			)
			.map((row) => {
				const lastUsedByName = row.employee
					? [row.employee.name, row.employee.surname]
							.filter(Boolean)
							.join(" ") || "Desconocido"
					: null;

				return {
					id: String(row.productStock?.id ?? ""),
					name: String(
						row.productStock?.description ||
							row.productName ||
							"Producto sin nombre",
					),
					brand: String(row.productBrand ?? ""),
					barcode: row.productStock?.barcode ?? 0,
					lastUsedBy: lastUsedByName,
					stock: 1,
				};
			});
	}, [kitProducts, employees, draft.employeeId]);

	// Generate new kit ID when modal opens
	useEffect(() => {
		if (open) {
			setKitId(uuidv4());
			setSelectedProducts([]);
		}
	}, [open]);

	const selectedEmployee = employees.find((emp) => emp.id === draft.employeeId);

	const handleEmployeeSelect = (employeeId: string) => {
		setDraft({ employeeId });
		setEmployeeOpen(false);
		// Clear selected products when employee changes
		setSelectedProducts([]);
	};

	const handleAddProduct = (productId: string) => {
		// Always add with qty: 1, no duplicates allowed
		const existing = selectedProducts.find((p) => p.productId === productId);
		if (!existing) {
			setSelectedProducts((prev) => [...prev, { productId, qty: 1 }]);
		}
	};

	const handleRemoveProduct = (productId: string) => {
		setSelectedProducts((prev) =>
			prev.filter((p) => p.productId !== productId),
		);
	};

	const { mutateAsync: createKit, isPending } = useCreateKit();
	const { mutateAsync: updateProductStockUsage } = useUpdateProductStockUsage();

	const handleAssign = async () => {
		if (!draft.employeeId || selectedProducts.length === 0) {
			toast.error("Por favor completa todos los campos requeridos");
			return;
		}
		try {
			// Create the kit
			await createKit({
				assignedEmployee: draft.employeeId as string,
				observations: "Kit diario",
				kitItems: selectedProducts.map((p) => ({
					productId: p.productId,
					observations: "",
				})),
			});

			// Update usage information for each product in the kit
			const currentDate = new Date().toISOString();
			await Promise.all(
				selectedProducts.map(async (product) => {
					try {
						await updateProductStockUsage({
							productStockId: product.productId,
							isBeingUsed: true,
							lastUsedBy: draft.employeeId as string,
							lastUsed: currentDate,
							incrementUses: true,
						});
					} catch (error) {
						// Log error but don't fail the entire kit creation
						// biome-ignore lint/suspicious/noConsole: Needed for debugging
						console.error(
							`Error updating usage for product ${product.productId}:`,
							error,
						);
					}
				}),
			);

			// Update local store
			addKit({
				id: kitId,
				employeeId: draft.employeeId as string,
				date: ((draft.date as unknown as Date) || new Date()) as Date,
				items: selectedProducts,
			});

			toast.success("Kit asignado exitosamente");
			onOpenChange(false);
			handleCancel();
		} catch {
			toast.error("Error al crear el kit");
		}
	};

	const handleCancel = () => {
		clearDraft();
		setSelectedProducts([]);
		setKitId("");
		onOpenChange(false);
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Asignar Kit Diario</DialogTitle>
					<DialogDescription>
						Crea una nueva asignación de kit para una empleada
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Kit ID */}
					<div className="space-y-2">
						<Label htmlFor="kitId">ID del Kit</Label>
						<Input
							className="bg-muted font-mono text-sm"
							id="kitId"
							readOnly
							value={kitId}
						/>
					</div>

					{/* Employee Selection */}
					<div className="space-y-2">
						<Label>Empleada</Label>
						<Popover onOpenChange={setEmployeeOpen} open={employeeOpen}>
							<PopoverTrigger asChild>
								<Button
									aria-expanded={employeeOpen}
									className="w-full justify-between"
									variant="outline"
								>
									{selectedEmployee ? (
										<div className="flex items-center gap-2">
											<Avatar className="h-6 w-6">
												<AvatarImage
													src={selectedEmployee.avatar || "/placeholder.svg"}
												/>
												<AvatarFallback>
													{(selectedEmployee.name || "U")
														.split(" ")
														.map((n) => n[0])
														.join("")}
												</AvatarFallback>
											</Avatar>
											<span>{selectedEmployee.name}</span>
											<Badge className="text-xs" variant="secondary">
												{selectedEmployee.specialty}
											</Badge>
										</div>
									) : (
										"Seleccionar empleada..."
									)}
									<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-full p-0">
								<Command>
									<CommandInput placeholder="Buscar empleada..." />
									<CommandList>
										<CommandEmpty>No se encontraron empleadas.</CommandEmpty>
										<CommandGroup>
											{employees
												.filter((emp) => Boolean(emp.active))
												.map((employee, idx) => (
													<CommandItem
														key={employee.id || `emp-${idx}`}
														onSelect={() =>
															handleEmployeeSelect(employee.id || "")
														}
														value={employee.name || ""}
													>
														<div className="flex flex-1 items-center gap-2">
															<Avatar className="h-6 w-6">
																<AvatarImage
																	src={employee.avatar || "/placeholder.svg"}
																/>
																<AvatarFallback>
																	{(employee.name || "U")[0]}
																</AvatarFallback>
															</Avatar>
															<div className="flex flex-col">
																<span className="font-medium">
																	{employee.name}
																</span>
																<span className="text-muted-foreground text-xs">
																	{employee.specialty}
																</span>
															</div>
														</div>
														<Check
															className={cn(
																"ml-auto h-4 w-4",
																draft.employeeId === employee.id
																	? "opacity-100"
																	: "opacity-0",
															)}
														/>
													</CommandItem>
												))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>

					{/* Products Selection */}
					<div className="space-y-3">
						<Label>Productos Disponibles</Label>
						{!draft.employeeId ? (
							<div className="flex items-center justify-center rounded-lg border border-dashed border-[#E5E7EB] p-8 dark:border-[#2D3033]">
								<p className="text-center text-[#687076] text-sm dark:text-[#9BA1A6]">
									Selecciona una empleada para ver los productos disponibles
								</p>
							</div>
						) : products.length === 0 ? (
							<div className="flex items-center justify-center rounded-lg border border-dashed border-[#E5E7EB] p-8 dark:border-[#2D3033]">
								<p className="text-center text-[#687076] text-sm dark:text-[#9BA1A6]">
									No hay productos de kit disponibles en esta bodega
								</p>
							</div>
						) : (
							<div className="grid max-h-64 gap-2 overflow-y-auto">
								{products.map((product) => {
									const isSelected = selectedProducts.some(
										(p) => p.productId === product.id,
									);
									return (
										<Card
											className={cn(
												"p-3 transition-colors",
												isSelected && "border-[#0a7ea4] bg-[#0a7ea4]/5",
											)}
											key={product.id}
										>
											<div className="space-y-2">
												<div className="flex items-start justify-between gap-2">
													<div className="flex-1 min-w-0">
														<div className="font-medium text-sm">
															{product.name}
														</div>
														<div className="flex items-center gap-2 mt-1">
															<span className="font-mono text-muted-foreground text-xs">
																ID: {product.id.slice(-8)}
															</span>
															<span className="text-muted-foreground">•</span>
															<span className="font-mono text-muted-foreground text-xs">
																#{product.barcode}
															</span>
														</div>
														{product.lastUsedBy && (
															<div className="mt-1 text-muted-foreground text-xs">
																Último uso: {product.lastUsedBy}
															</div>
														)}
													</div>
													{isSelected ? (
														<Button
															onClick={() => handleRemoveProduct(product.id)}
															size="sm"
															variant="ghost"
														>
															<X className="h-4 w-4" />
														</Button>
													) : (
														<Button
															onClick={() => handleAddProduct(product.id)}
															size="sm"
															variant="outline"
														>
															Agregar
														</Button>
													)}
												</div>
											</div>
										</Card>
									);
								})}
							</div>
						)}
					</div>

					{/* Selected Products Summary */}
					{selectedProducts.length > 0 && (
						<div className="space-y-2">
							<Label>Productos Seleccionados ({selectedProducts.length})</Label>
							<Card className="p-3">
								<div className="space-y-2">
									{selectedProducts.map((item) => {
										const product = products.find(
											(p) => p.id === item.productId,
										);
										return (
											<div
												className="flex items-center justify-between gap-2 text-sm"
												key={item.productId}
											>
												<div className="flex-1 min-w-0">
													<div className="font-medium truncate">
														{product?.name}
													</div>
													<div className="font-mono text-muted-foreground text-xs">
														#{product?.barcode}
													</div>
												</div>
												<Button
													onClick={() => handleRemoveProduct(item.productId)}
													size="sm"
													variant="ghost"
												>
													<X className="h-3 w-3" />
												</Button>
											</div>
										);
									})}
								</div>
							</Card>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button onClick={handleCancel} variant="outline">
						Cancelar
					</Button>
					<Button
						disabled={
							!draft.employeeId || selectedProducts.length === 0 || isPending
						}
						onClick={handleAssign}
					>
						Asignar Kit
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
