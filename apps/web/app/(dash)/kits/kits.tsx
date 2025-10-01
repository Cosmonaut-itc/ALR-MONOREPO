"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, ChevronsUpDown, Plus, Users, Warehouse } from "lucide-react";
import { useMemo, useState } from "react";
import { AssignKitModal } from "@/components/kits/AssignKitModal";
import { EmployeeKitCard } from "@/components/kits/EmployeeKitCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	getAllProductStock,
	getAllWarehouses,
	getInventoryByWarehouse,
} from "@/lib/fetch-functions/inventory";
import {
	getAllEmployees,
	getAllKits,
	getEmployeesByWarehouseId,
} from "@/lib/fetch-functions/kits";
import { createQueryKey } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useKitsStore } from "@/stores/kits-store";
import type { EmployeesResponse } from "@/types";

// Infer API response type from fetcher
type APIResponse = Awaited<ReturnType<typeof getAllKits>> | null;
type InventoryResponse =
	| Awaited<ReturnType<typeof getAllProductStock>>
	| Awaited<ReturnType<typeof getInventoryByWarehouse>>
	| null;
type WarehousesResponse = Awaited<ReturnType<typeof getAllWarehouses>>;

/**
 * Warehouse type from API response
 */
type WarehouseData = {
	id: string;
	name: string;
	code: string;
	description?: string | null;
};

export default function KitsPageClient({
	warehouseId,
	isEncargado,
}: {
	warehouseId: string;
	isEncargado: boolean;
}) {
	const [modalOpen, setModalOpen] = useState(false);
	const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<
		string | "all"
	>("all");
	const [warehouseComboboxOpen, setWarehouseComboboxOpen] = useState(false);

	const kitsQueryParams = [isEncargado ? "all" : warehouseId];
	const kitsQueryFn = getAllKits;
	const employeesQueryParams = [isEncargado ? "all" : warehouseId];
	const employeesQueryFn = isEncargado
		? getAllEmployees
		: () => getEmployeesByWarehouseId(warehouseId);
	const inventoryQueryParams = [isEncargado ? "all" : warehouseId];
	const inventoryQueryFn = isEncargado
		? getAllProductStock
		: () => getInventoryByWarehouse(warehouseId);

	const { data: kitsResponse } = useSuspenseQuery<
		APIResponse,
		Error,
		APIResponse
	>({
		queryKey: createQueryKey(queryKeys.kits, kitsQueryParams),
		queryFn: kitsQueryFn,
	});

	const { data: employeesResponse } = useSuspenseQuery<
		EmployeesResponse,
		Error,
		EmployeesResponse
	>({
		queryKey: createQueryKey(["employees"], employeesQueryParams),
		queryFn: employeesQueryFn,
	});

	const { data: inventoryResponse } = useSuspenseQuery<
		InventoryResponse,
		Error,
		InventoryResponse
	>({
		queryKey: createQueryKey(queryKeys.inventory, inventoryQueryParams),
		queryFn: inventoryQueryFn,
	});

	// Fetch warehouses data for filtering
	const { data: warehousesResponse } = useSuspenseQuery<
		WarehousesResponse,
		Error,
		WarehousesResponse
	>({
		queryKey: queryKeys.warehouses,
		queryFn: getAllWarehouses,
	});

	// Helper functions for data normalization
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

	const kitProducts = useMemo(() => {
		return inventoryResponse && "data" in inventoryResponse
			? inventoryResponse.data.warehouse.filter(
					(product) => product.productStock?.isKit,
				)
			: [];
	}, [inventoryResponse]);

	// Normalize employees response to match ajustes type
	const normalizeEmployee = useMemo(
		() => (raw: unknown) => {
			const rec = (raw as { employee?: unknown }).employee ?? raw;
			const e = (rec ?? {}) as {
				id?: unknown;
				name?: unknown;
				surname?: unknown;
				warehouseId?: unknown;
				passcode?: unknown;
			};
			const id = toStringOrEmpty(e.id);
			const name = toStringOrEmpty(e.name);
			const surname = toStringOrEmpty(e.surname);
			const warehouseId = toStringOrEmpty(e.warehouseId);
			const fullName = [name, surname].filter(Boolean).join(" ");
			return {
				id,
				name: fullName || name || "Empleado",
				warehouseId,
				passcode: typeof e.passcode === "number" ? e.passcode : undefined,
			};
		},
		[toStringOrEmpty],
	);

	const employees = useMemo(() => {
		const root = (employeesResponse ?? { data: [], json: [] }) as {
			data?: unknown;
			json?: unknown;
		};
		const candidate = root.data ?? root.json ?? [];
		return toArray(candidate).map(normalizeEmployee);
	}, [employeesResponse, toArray, normalizeEmployee]);

	// Normalize warehouses response
	const warehouses = useMemo(() => {
		if (warehousesResponse && "data" in warehousesResponse) {
			return (warehousesResponse.data || []) as WarehouseData[];
		}
		return [];
	}, [warehousesResponse]);

	// Normalize the API response into the shape the UI expects
	const kits = useMemo(() => {
		const root = kitsResponse ?? { data: [] };
		const list: unknown = (root as { data?: unknown }).data ?? [];
		return Array.isArray(list)
			? (list as Array<{
					id: string;
					employeeId: string;
					date: string;
					items: Array<{ productId: string; qty: number }>;
				}>)
			: [];
	}, [kitsResponse]);

	// Get today's kits (based on actual today's date, not a selector)
	const todayKits = useMemo(() => {
		const today = new Date().toDateString();
		return kits.filter((kit) => {
			const kitDate = new Date(kit.date).toDateString();
			return kitDate === today;
		});
	}, [kits]);

	// Filter employees by selected warehouse
	const filteredEmployees = useMemo(() => {
		if (selectedWarehouseFilter === "all") {
			return employees;
		}
		return employees.filter(
			(emp) => emp.warehouseId === selectedWarehouseFilter,
		);
	}, [employees, selectedWarehouseFilter]);

	// Create a map of employees with their kits
	const employeesWithKits = useMemo(() => {
		return filteredEmployees.map((employee) => {
			// Get all kits for this employee
			const employeeKits = kits.filter((kit) => kit.employeeId === employee.id);
			// Get current kit (for selected date)
			const currentKit = todayKits.find(
				(kit) => kit.employeeId === employee.id,
			);
			// Get warehouse name
			const warehouse = warehouses.find((w) => w.id === employee.warehouseId);
			return {
				employee,
				currentKit,
				allKits: employeeKits,
				warehouseName: warehouse?.name || "Sin bodega",
			};
		});
	}, [filteredEmployees, kits, todayKits, warehouses]);

	// Calculate statistics based on filtered employees
	const filteredTodayKits = todayKits.filter((kit) =>
		filteredEmployees.some((emp) => emp.id === kit.employeeId),
	);

	const totalKits = filteredTodayKits.length;
	const totalProducts = filteredTodayKits.reduce(
		(sum, kit) =>
			sum +
			kit.items.reduce(
				(kitSum, item) =>
					kitSum + (typeof item.qty === "number" ? item.qty : 0),
				0,
			),
		0,
	);
	const activeEmployees = new Set(
		filteredTodayKits.map((kit) => kit.employeeId),
	).size;
	const totalEmployees = filteredEmployees.length;

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-[#11181C] dark:text-[#ECEDEE]">
						Gestión de Empleadas
					</h1>
					<p className="text-[#687076] dark:text-[#9BA1A6]">
						Visualiza y gestiona los kits asignados a cada empleada
					</p>
				</div>
				<Button className="gap-2" onClick={() => setModalOpen(true)}>
					<Plus className="h-4 w-4" />
					Asignar Kit
				</Button>
			</div>

			{/* Filters - Only visible for encargado */}
			{isEncargado && (
				<div className="flex items-center gap-4">
					<Popover
						onOpenChange={setWarehouseComboboxOpen}
						open={warehouseComboboxOpen}
					>
						<PopoverTrigger asChild>
							<Button
								className="w-[280px] justify-between"
								role="combobox"
								variant="outline"
							>
								<div className="flex items-center gap-2">
									<Warehouse className="h-4 w-4" />
									{selectedWarehouseFilter === "all"
										? "Todas las bodegas"
										: warehouses.find((w) => w.id === selectedWarehouseFilter)
												?.name || "Seleccionar bodega"}
								</div>
								<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[280px] p-0">
							<Command>
								<CommandInput placeholder="Buscar bodega..." />
								<CommandList>
									<CommandEmpty>No se encontraron bodegas.</CommandEmpty>
									<CommandGroup>
										<CommandItem
											onSelect={() => {
												setSelectedWarehouseFilter("all");
												setWarehouseComboboxOpen(false);
											}}
											value="all"
										>
											<Check
												className={cn(
													"mr-2 h-4 w-4",
													selectedWarehouseFilter === "all"
														? "opacity-100"
														: "opacity-0",
												)}
											/>
											Todas las bodegas
										</CommandItem>
										{warehouses.map((warehouse) => (
											<CommandItem
												key={warehouse.id}
												onSelect={() => {
													setSelectedWarehouseFilter(warehouse.id);
													setWarehouseComboboxOpen(false);
												}}
												value={warehouse.name}
											>
												<Check
													className={cn(
														"mr-2 h-4 w-4",
														selectedWarehouseFilter === warehouse.id
															? "opacity-100"
															: "opacity-0",
													)}
												/>
												<div className="flex flex-col">
													<span className="font-medium">{warehouse.name}</span>
													<span className="text-muted-foreground text-xs">
														{warehouse.code}
													</span>
												</div>
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				</div>
			)}

			{/* Statistics Cards */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card className="card-transition">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-[#687076] text-sm dark:text-[#9BA1A6]">
							Total Empleadas
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl text-[#11181C] dark:text-[#ECEDEE]">
							{totalEmployees}
						</div>
						<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
							empleadas registradas
						</p>
					</CardContent>
				</Card>

				<Card className="card-transition">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-[#687076] text-sm dark:text-[#9BA1A6]">
							Con Kits Activos
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl text-[#11181C] dark:text-[#ECEDEE]">
							{activeEmployees}
						</div>
						<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
							para hoy
						</p>
					</CardContent>
				</Card>

				<Card className="card-transition">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-[#687076] text-sm dark:text-[#9BA1A6]">
							Kits Asignados
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl text-[#11181C] dark:text-[#ECEDEE]">
							{totalKits}
						</div>
						<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
							kits del día
						</p>
					</CardContent>
				</Card>

				<Card className="card-transition">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-[#687076] text-sm dark:text-[#9BA1A6]">
							Total Productos
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl text-[#11181C] dark:text-[#ECEDEE]">
							{totalProducts}
						</div>
						<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
							productos asignados
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Employees Grid */}
			{filteredEmployees.length > 0 ? (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{employeesWithKits.map(
						({ employee, currentKit, allKits, warehouseName }) => (
							<EmployeeKitCard
								allKitsForEmployee={allKits}
								currentKit={currentKit}
								employee={employee}
								key={employee.id}
								warehouseName={warehouseName}
							/>
						),
					)}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
						<Users className="h-6 w-6 text-muted-foreground" />
					</div>
					<h3 className="mb-2 font-semibold text-[#11181C] text-lg dark:text-[#ECEDEE]">
						No hay empleadas
						{selectedWarehouseFilter !== "all" && " en esta bodega"}
					</h3>
					<p className="mb-4 max-w-sm text-[#687076] text-sm dark:text-[#9BA1A6]">
						{selectedWarehouseFilter !== "all"
							? "No se encontraron empleadas en la bodega seleccionada. Intenta con otra bodega."
							: "No se encontraron empleadas en el sistema. Contacta al administrador para agregar empleadas."}
					</p>
				</div>
			)}

			{/* Assign Kit Modal */}
			<AssignKitModal
				employeesData={employeesResponse}
				kitProducts={kitProducts}
				onOpenChange={setModalOpen}
				open={modalOpen}
			/>
		</div>
	);
}
