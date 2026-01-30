"use client";

import { formatISO } from "date-fns";
import {
	Check,
	ChevronDown,
	ChevronsUpDown,
	Search,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import type { getEmployeesByUserId } from "@/lib/fetch-functions/kits";
import { useCreateKit, useUpdateProductStockUsage } from "@/lib/mutations/kits";
import { cn } from "@/lib/utils";
import { useKitsStore } from "@/stores/kits-store";
import { useShallow } from "zustand/shallow";

type EmployeesResponse = Awaited<
	ReturnType<typeof getEmployeesByUserId>
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

type NormalizedProduct = {
	id: string;
	name: string;
	brand: string;
	barcode: number;
	lastUsedBy: string | null;
	stock: number;
};

interface AssignKitModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Employees data passed from parent */
	employeesData: EmployeesResponse;
	/** Kit products filtered by isKit flag */
	kitProducts: KitProduct[];
	/** Today's kits to filter out employees who already have a kit */
	todayKits?: Array<{ assignedEmployee: string }>;
}

export function AssignKitModal({
	open,
	onOpenChange,
	employeesData,
	kitProducts,
	todayKits = [],
}: AssignKitModalProps) {
	const { draft, setDraft, clearDraft } = useKitsStore(
		useShallow((state) => ({
			draft: state.draft,
			setDraft: state.setDraft,
			clearDraft: state.clearDraft,
		})),
	);
	const [employeeOpen, setEmployeeOpen] = useState(false);
	const [kitId, setKitId] = useState("");
	const [selectedProducts, setSelectedProducts] = useState<
		Array<{ productId: string; qty: number }>
	>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
	const [selectedSearchQuery, setSelectedSearchQuery] = useState("");
	const [selectedOpenGroups, setSelectedOpenGroups] = useState<Set<string>>(
		new Set(),
	);

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
		const allEmployees = toArray(candidate).map(normalizeEmployee);

		// Filter out employees who already have a kit assigned today
		const employeesWithKitsToday = new Set(
			todayKits.map((kit) => kit.assignedEmployee),
		);

		return allEmployees.filter((emp) => !employeesWithKitsToday.has(emp.id));
	}, [employeesData, toArray, normalizeEmployee, todayKits]);

	// Filter kit products by selected employee's warehouse ID
	const products = useMemo<NormalizedProduct[]>(() => {
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
				} satisfies NormalizedProduct;
			});
	}, [kitProducts, employees, draft.employeeId]);

	// Group products by name or barcode
	type ProductGroup = {
		key: string;
		name: string;
		barcode: number;
		products: NormalizedProduct[];
	};

	const buildGroupKey = useCallback((product: NormalizedProduct): string => {
		const normalizedName = product.name.toLowerCase().trim();
		if (normalizedName.length > 0) {
			return normalizedName;
		}
		return `barcode-${product.barcode}`;
	}, []);

	const groupedProducts = useMemo(() => {
		const groups = new Map<string, ProductGroup>();

		for (const product of products) {
			const groupKey = buildGroupKey(product);
			const existingGroup = groups.get(groupKey);

			if (existingGroup) {
				existingGroup.products.push(product);
			} else {
				groups.set(groupKey, {
					key: groupKey,
					name: product.name,
					barcode: product.barcode,
					products: [product],
				});
			}
		}

		return Array.from(groups.values());
	}, [products, buildGroupKey]);

	type SelectedProductGroup = {
		key: string;
		name: string;
		barcode: number;
		count: number;
		products: NormalizedProduct[];
	};

	const selectedProductGroups = useMemo<SelectedProductGroup[]>(() => {
		const productMap = new Map<string, NormalizedProduct>();
		for (const product of products) {
			productMap.set(product.id, product);
		}

		const groups = new Map<string, SelectedProductGroup>();

		for (const item of selectedProducts) {
			const product = productMap.get(item.productId);

			if (!product) {
				continue;
			}

			const groupKey = buildGroupKey(product);
			const existingGroup = groups.get(groupKey);

			if (existingGroup) {
				existingGroup.products.push(product);
				existingGroup.count = existingGroup.count + 1;
			} else {
				groups.set(groupKey, {
					key: groupKey,
					name: product.name,
					barcode: product.barcode,
					count: 1,
					products: [product],
				});
			}
		}

		return Array.from(groups.values());
	}, [selectedProducts, products, buildGroupKey]);

	// Filter grouped products by search query
	const filteredGroups = useMemo(() => {
		if (!searchQuery.trim()) {
			return groupedProducts;
		}

		const query = searchQuery.toLowerCase().trim();
		return groupedProducts.filter((group) => {
			// Search by name or barcode
			const matchesName = group.name.toLowerCase().includes(query);
			const matchesBarcode = String(group.barcode).includes(query);
			// Also check individual products within the group
			const matchesProduct = group.products.some(
				(p) =>
					p.name.toLowerCase().includes(query) ||
					String(p.barcode).includes(query) ||
					p.id.toLowerCase().includes(query),
			);

			return matchesName || matchesBarcode || matchesProduct;
		});
	}, [groupedProducts, searchQuery]);

	const filteredSelectedGroups = useMemo(() => {
		if (!selectedSearchQuery.trim()) {
			return selectedProductGroups;
		}

		const query = selectedSearchQuery.toLowerCase().trim();
		return selectedProductGroups.filter((group) => {
			const matchesName = group.name.toLowerCase().includes(query);
			const matchesBarcode = String(group.barcode).includes(query);
			const matchesProduct = group.products.some((product) => {
				const combined =
					`${product.name} ${product.barcode} ${product.id}`.toLowerCase();
				return combined.includes(query);
			});

			return matchesName || matchesBarcode || matchesProduct;
		});
	}, [selectedProductGroups, selectedSearchQuery]);

	const autoOpenGroups = useMemo(() => {
		if (!searchQuery.trim()) {
			return null;
		}
		return new Set(filteredGroups.map((group) => group.key));
	}, [searchQuery, filteredGroups]);

	const autoSelectedOpenGroups = useMemo(() => {
		if (!selectedSearchQuery.trim()) {
			return null;
		}
		return new Set(filteredSelectedGroups.map((group) => group.key));
	}, [selectedSearchQuery, filteredSelectedGroups]);

	const effectiveOpenGroups = autoOpenGroups ?? openGroups;
	const effectiveSelectedOpenGroups =
		autoSelectedOpenGroups ?? selectedOpenGroups;

	/**
	 * Toggles the open state for a product group in the available products list.
	 * @param groupKey - Identifier for the group being toggled.
	 */
	const toggleGroup = (groupKey: string): void => {
		setOpenGroups((prev) => {
			const next = new Set(prev);
			if (next.has(groupKey)) {
				next.delete(groupKey);
			} else {
				next.add(groupKey);
			}
			return next;
		});
	};

	/**
	 * Toggles the open state for a product group in the selected products summary.
	 * @param groupKey - Identifier for the group being toggled.
	 */
	const toggleSelectedGroup = (groupKey: string): void => {
		setSelectedOpenGroups((prev) => {
			const next = new Set(prev);
			if (next.has(groupKey)) {
				next.delete(groupKey);
			} else {
				next.add(groupKey);
			}
			return next;
		});
	};

	const handleDialogOpenChange = (nextOpen: boolean) => {
		if (nextOpen) {
			setKitId(uuidv4());
			setSelectedProducts([]);
			setSearchQuery("");
			setOpenGroups(new Set());
			setSelectedSearchQuery("");
			setSelectedOpenGroups(new Set());
		}
		onOpenChange(nextOpen);
	};

	const handleSearchChange = (value: string) => {
		setSearchQuery(value);
		if (!value.trim()) {
			setOpenGroups(new Set());
		}
	};

	const handleSelectedSearchChange = (value: string) => {
		setSelectedSearchQuery(value);
		if (!value.trim()) {
			setSelectedOpenGroups(new Set());
		}
	};

	const selectedEmployee = employees.find((emp) => emp.id === draft.employeeId);

	/**
	 * Selects an employee for the current kit draft and resets related state.
	 * @param employeeId - Identifier of the employee being assigned the kit.
	 */
	const handleEmployeeSelect = (employeeId: string): void => {
		setDraft({ employeeId });
		setEmployeeOpen(false);
		// Clear selected products and search when employee changes
		setSelectedProducts([]);
		setSearchQuery("");
		setOpenGroups(new Set());
		setSelectedSearchQuery("");
		setSelectedOpenGroups(new Set());
	};

	/**
	 * Adds a single product to the current selection ensuring uniqueness.
	 * @param productId - Identifier of the product stock item to add.
	 */
	const handleAddProduct = (productId: string): void => {
		// Always add with qty: 1, no duplicates allowed
		const existing = selectedProducts.find((p) => p.productId === productId);
		if (!existing) {
			setSelectedProducts((prev) => [...prev, { productId, qty: 1 }]);
		}
	};

	/**
	 * Removes a single product from the current selection.
	 * @param productId - Identifier of the product stock item to remove.
	 */
	const handleRemoveProduct = (productId: string): void => {
		setSelectedProducts((prev) =>
			prev.filter((p) => p.productId !== productId),
		);
	};

	/**
	 * Updates the selection state for an entire product group.
	 * @param productIds - Collection of product stock identifiers affecting the group.
	 * @param shouldSelect - When true adds missing products, otherwise removes them.
	 */
	const handleGroupSelectionChange = (
		productIds: string[],
		shouldSelect: boolean,
	): void => {
		setSelectedProducts((prev) => {
			if (shouldSelect) {
				const existingIds = new Set(prev.map((item) => item.productId));
				const additions = productIds.filter((id) => !existingIds.has(id));
				if (additions.length === 0) {
					return prev;
				}
				return [
					...prev,
					...additions.map((productId) => ({ productId, qty: 1 })),
				];
			}

			return prev.filter((item) => !productIds.includes(item.productId));
		});
	};

	/**
	 * Removes all products that belong to a specific group from the selection.
	 * @param productIds - Collection of product stock identifiers to remove.
	 */
	const handleRemoveGroup = (productIds: string[]): void => {
		handleGroupSelectionChange(productIds, false);
	};

	const { mutateAsync: createKit, isPending } = useCreateKit();
	const { mutateAsync: updateProductStockUsage } = useUpdateProductStockUsage();

	/**
	 * Persists the current kit selection and updates stock usage metadata.
	 */
	const handleAssign = async (): Promise<void> => {
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
			const currentDate = formatISO(new Date());
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
						console.error(
							`Error updating usage for product ${product.productId}:`,
							error,
						);
					}
				}),
			);

			toast.success("Kit asignado exitosamente");
			onOpenChange(false);
			handleCancel();
		} catch {
			toast.error("Error al crear el kit");
		}
	};

	/**
	 * Resets the modal state and closes the dialog without persisting changes.
	 */
	const handleCancel = (): void => {
		clearDraft();
		setSelectedProducts([]);
		setKitId("");
		setSearchQuery("");
		setOpenGroups(new Set());
		setSelectedSearchQuery("");
		setSelectedOpenGroups(new Set());
		onOpenChange(false);
	};

	return (
		<Dialog onOpenChange={handleDialogOpenChange} open={open}>
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
										<CommandEmpty>
											{employees.length === 0 && todayKits.length > 0
												? "Todas las empleadas ya tienen un kit asignado para hoy."
												: "No se encontraron empleadas."}
										</CommandEmpty>
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
						<div className="flex items-center justify-between">
							<Label>Productos Disponibles</Label>
							{products.length > 0 && (
								<span className="text-muted-foreground text-xs">
									{products.length} producto{products.length !== 1 ? "s" : ""}
								</span>
							)}
						</div>
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
							<div className="space-y-2">
								{/* Search Bar */}
								<div className="relative">
									<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										className="pl-9"
										onChange={(e) => handleSearchChange(e.target.value)}
										placeholder="Buscar por nombre o código de barras..."
										type="search"
										value={searchQuery}
									/>
								</div>

								{/* Grouped Products */}
								<div className="max-h-96 space-y-2 overflow-y-auto">
									{filteredGroups.length === 0 ? (
										<div className="flex items-center justify-center rounded-lg border border-dashed border-[#E5E7EB] p-8 dark:border-[#2D3033]">
											<p className="text-center text-[#687076] text-sm dark:text-[#9BA1A6]">
												No se encontraron productos que coincidan con la
												búsqueda
											</p>
										</div>
									) : (
										filteredGroups.map((group) => {
											const isOpen = effectiveOpenGroups.has(group.key);
											const selectedCount = group.products.filter((product) =>
												selectedProducts.some(
													(sp) => sp.productId === product.id,
												),
											).length;
											const groupProductIds = group.products.map(
												(product) => product.id,
											);
											const isGroupFullySelected =
												selectedCount === group.products.length;
											const isGroupPartiallySelected =
												selectedCount > 0 && !isGroupFullySelected;
											return (
												<Collapsible
													key={group.key}
													onOpenChange={() => toggleGroup(group.key)}
													open={isOpen}
												>
													<Card>
														<CollapsibleTrigger asChild>
															<Button
																className="w-full justify-between p-3"
																variant="ghost"
															>
																<div className="flex flex-1 items-center justify-between">
																	<div className="flex flex-1 items-center gap-3 text-left">
																		<ChevronDown
																			className={cn(
																				"h-4 w-4 shrink-0 transition-transform",
																				isOpen && "rotate-180",
																			)}
																		/>
																		<div className="min-w-0 flex-1">
																			<div className="text-sm font-semibold">
																				{group.name}
																			</div>
																			<div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
																				<span className="font-mono">
																					#{group.barcode}
																				</span>
																				<span>•</span>
																				<span>
																					{group.products.length} unidad
																					{group.products.length !== 1
																						? "es"
																						: ""}
																				</span>
																				{selectedCount > 0 && (
																					<>
																						<span>•</span>
																						<Badge
																							className="text-xs"
																							variant="secondary"
																						>
																							{selectedCount} seleccionada
																							{selectedCount !== 1 ? "s" : ""}
																						</Badge>
																					</>
																				)}
																			</div>
																		</div>
																	</div>
																</div>
															</Button>
														</CollapsibleTrigger>
														<CollapsibleContent>
															<div className="border-t border-[#E5E7EB] px-3 py-2 dark:border-[#2D3033]">
																<div className="flex flex-wrap items-center justify-between gap-2 py-2">
																	<div className="flex items-center gap-2">
																		<Badge
																			className="text-xs"
																			variant={
																				isGroupFullySelected
																					? "default"
																					: selectedCount > 0
																						? "secondary"
																						: "outline"
																			}
																		>
																			{selectedCount}/{group.products.length}{" "}
																			seleccionadas
																		</Badge>
																		{isGroupPartiallySelected && (
																			<span className="text-xs text-muted-foreground">
																				Selección parcial
																			</span>
																		)}
																	</div>
																	<Button
																		onClick={() =>
																			handleGroupSelectionChange(
																				groupProductIds,
																				!isGroupFullySelected,
																			)
																		}
																		size="sm"
																		variant={
																			isGroupFullySelected
																				? "secondary"
																				: "outline"
																		}
																	>
																		{isGroupFullySelected
																			? "Quitar todas"
																			: "Agregar todas"}
																	</Button>
																</div>
																<div className="space-y-2">
																	{group.products.map((product) => {
																		const isSelected = selectedProducts.some(
																			(item) => item.productId === product.id,
																		);
																		return (
																			<div
																				className={cn(
																					"flex items-start justify-between gap-3 rounded-md border border-[#E5E7EB] bg-background p-3 transition-colors dark:border-[#2D3033]",
																					isSelected &&
																						"border-primary/50 bg-primary/5",
																				)}
																				key={product.id}
																			>
																				<div className="min-w-0 flex-1 space-y-1">
																					<div className="flex items-start justify-between gap-2">
																						<p className="truncate text-sm font-medium">
																							{product.name}
																						</p>
																						{product.brand && (
																							<Badge
																								className="shrink-0 text-[10px]"
																								variant="outline"
																							>
																								{product.brand}
																							</Badge>
																						)}
																					</div>
																					<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
																						<span className="font-mono">
																							ID: {product.id.slice(-8)}
																						</span>
																						<span>•</span>
																						<span className="font-mono">
																							#{product.barcode}
																						</span>
																						{product.lastUsedBy && (
																							<>
																								<span>•</span>
																								<span>
																									Último uso:{" "}
																									{product.lastUsedBy}
																								</span>
																							</>
																						)}
																					</div>
																				</div>
																				{isSelected ? (
																					<Button
																						onClick={() =>
																							handleRemoveProduct(product.id)
																						}
																						size="sm"
																						variant="ghost"
																					>
																						<X className="h-4 w-4" />
																						<span className="sr-only">
																							Quitar {product.name}
																						</span>
																					</Button>
																				) : (
																					<Button
																						onClick={() =>
																							handleAddProduct(product.id)
																						}
																						size="sm"
																						variant="outline"
																					>
																						Agregar
																					</Button>
																				)}
																			</div>
																		);
																	})}
																</div>
															</div>
														</CollapsibleContent>
													</Card>
												</Collapsible>
											);
										})
									)}
								</div>
							</div>
						)}
					</div>

					{/* Selected Products Summary */}
					{selectedProducts.length > 0 && (
						<div className="space-y-3">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<Label className="text-sm font-medium">
									Productos Seleccionados
								</Label>
								<Badge variant="secondary">
									{selectedProducts.length} elemento
									{selectedProducts.length !== 1 ? "s" : ""}
								</Badge>
							</div>
							<div className="relative">
								<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-9"
									onChange={(event) =>
										handleSelectedSearchChange(event.target.value)
									}
									placeholder="Buscar dentro de los seleccionados..."
									type="search"
									value={selectedSearchQuery}
								/>
							</div>
							<div className="max-h-72 space-y-2 overflow-y-auto">
								{filteredSelectedGroups.length === 0 ? (
									<div className="flex items-center justify-center rounded-lg border border-dashed border-[#E5E7EB] p-6 dark:border-[#2D3033]">
										<p className="text-center text-[#687076] text-sm dark:text-[#9BA1A6]">
											No se encontraron productos seleccionados con ese criterio
										</p>
									</div>
								) : (
									filteredSelectedGroups.map((group) => {
										const isOpen =
											effectiveSelectedOpenGroups.has(group.key);
										const groupProductIds = group.products.map(
											(product) => product.id,
										);
										return (
											<Collapsible
												key={group.key}
												onOpenChange={() => toggleSelectedGroup(group.key)}
												open={isOpen}
											>
												<Card>
													<CollapsibleTrigger asChild>
														<Button
															className="w-full justify-between p-3"
															variant="ghost"
														>
															<div className="flex flex-1 items-center gap-3 text-left">
																<ChevronDown
																	className={cn(
																		"h-4 w-4 shrink-0 transition-transform",
																		isOpen && "rotate-180",
																	)}
																/>
																<div className="min-w-0 flex-1">
																	<div className="text-sm font-semibold">
																		{group.name}
																	</div>
																	<div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
																		<span className="font-mono">
																			#{group.barcode}
																		</span>
																		<span>•</span>
																		<span>
																			{group.count} seleccionada
																			{group.count !== 1 ? "s" : ""}
																		</span>
																	</div>
																</div>
															</div>
															<Badge className="text-xs" variant="secondary">
																{group.count}
															</Badge>
														</Button>
													</CollapsibleTrigger>
													<CollapsibleContent>
														<div className="border-t border-[#E5E7EB] px-3 py-2 dark:border-[#2D3033]">
															<div className="flex items-center justify-between gap-2 pb-2">
																<span className="text-xs text-muted-foreground">
																	{group.count} elemento
																	{group.count !== 1 ? "s" : ""} en este grupo
																</span>
																<Button
																	onClick={() =>
																		handleRemoveGroup(groupProductIds)
																	}
																	size="sm"
																	variant="ghost"
																>
																	<Trash2 className="h-4 w-4" />
																	<span className="sr-only">
																		Quitar grupo {group.name}
																	</span>
																</Button>
															</div>
															<div className="space-y-2">
																{group.products.map((product) => (
																	<div
																		className="flex items-start justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 p-3"
																		key={product.id}
																	>
																		<div className="min-w-0 flex-1 space-y-1">
																			<div className="flex items-start justify-between gap-2">
																				<p className="truncate text-sm font-medium">
																					{product.name}
																				</p>
																				{product.brand && (
																					<Badge
																						className="shrink-0 text-[10px]"
																						variant="outline"
																					>
																						{product.brand}
																					</Badge>
																				)}
																			</div>
																			<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
																				<span className="font-mono">
																					ID: {product.id.slice(-8)}
																				</span>
																				<span>•</span>
																				<span className="font-mono">
																					#{product.barcode}
																				</span>
																				{product.lastUsedBy && (
																					<>
																						<span>•</span>
																						<span>
																							Último uso: {product.lastUsedBy}
																						</span>
																					</>
																				)}
																			</div>
																		</div>
																		<Button
																			onClick={() =>
																				handleRemoveProduct(product.id)
																			}
																			size="sm"
																			variant="ghost"
																		>
																			<X className="h-4 w-4" />
																			<span className="sr-only">
																				Quitar {product.name}
																			</span>
																		</Button>
																	</div>
																))}
															</div>
														</div>
													</CollapsibleContent>
												</Card>
											</Collapsible>
										);
									})
								)}
							</div>
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
