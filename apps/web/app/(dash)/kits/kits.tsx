"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Plus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { AssignKitModal } from "@/components/kits/AssignKitModal";
import { EmployeeKitCard } from "@/components/kits/EmployeeKitCard";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { getInventoryByWarehouse } from "@/lib/fetch-functions/inventory";
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
type InventoryResponse = Awaited<
	ReturnType<typeof getInventoryByWarehouse>
> | null;

export default function KitsPageClient({
	warehouseId,
	isEncargado,
}: {
	warehouseId: string;
	isEncargado: boolean;
}) {
	const { setDraft } = useKitsStore();
	const [date, setDate] = useState<Date>(new Date());
	const [modalOpen, setModalOpen] = useState(false);
	const kitsQueryParams = [isEncargado ? "all" : warehouseId];
	const kitsQueryFn = getAllKits;
	const employeesQueryParams = [isEncargado ? "all" : warehouseId];
	const employeesQueryFn = isEncargado
		? getAllEmployees
		: () => getEmployeesByWarehouseId(warehouseId);

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
		queryKey: createQueryKey(queryKeys.inventory, [warehouseId]),
		queryFn: () => getInventoryByWarehouse(warehouseId),
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

	// Normalize employees response
	const normalizeEmployee = useMemo(
		() => (raw: unknown) => {
			const rec = (raw as { employee?: unknown }).employee ?? raw;
			const e = (rec ?? {}) as {
				id?: unknown;
				name?: unknown;
				surname?: unknown;
				avatar?: unknown;
			};
			const id = toStringOrEmpty(e.id);
			const name = toStringOrEmpty(e.name);
			const surname = toStringOrEmpty(e.surname);
			const avatar = toStringOrEmpty(e.avatar);
			const fullName = [name, surname].filter(Boolean).join(" ");
			return {
				id,
				name: fullName || name || "Empleado",
				specialty: "",
				avatar,
				active: true as const,
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

	const handleDateSelect = (selectedDate: Date | undefined) => {
		if (selectedDate) {
			setDate(selectedDate);
			// Store as Date in draft to satisfy kit schema type
			setDraft({ date: selectedDate as unknown as Date });
		}
	};

	// Filter kits for the selected date
	const todayKits = kits.filter((kit) => {
		const kitDate = new Date(kit.date).toDateString();
		const selectedDate = date.toDateString();
		return kitDate === selectedDate;
	});

	// Create a map of employees with their kits
	const employeesWithKits = useMemo(() => {
		return employees.map((employee) => {
			// Get all kits for this employee
			const employeeKits = kits.filter((kit) => kit.employeeId === employee.id);
			// Get current kit (for selected date)
			const currentKit = todayKits.find(
				(kit) => kit.employeeId === employee.id,
			);
			return {
				employee,
				currentKit,
				allKits: employeeKits,
			};
		});
	}, [employees, kits, todayKits]);

	// Calculate statistics
	const totalKits = todayKits.length;
	const totalProducts = todayKits.reduce(
		(sum, kit) =>
			sum +
			kit.items.reduce(
				(kitSum, item) =>
					kitSum + (typeof item.qty === "number" ? item.qty : 0),
				0,
			),
		0,
	);
	const activeEmployees = new Set(todayKits.map((kit) => kit.employeeId)).size;
	const totalEmployees = employees.length;

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

			{/* Top Bar */}
			<div className="flex items-center gap-4">
				<Popover>
					<PopoverTrigger asChild>
						<Button
							className={cn(
								"w-[240px] justify-start text-left font-normal",
								!date && "text-muted-foreground",
							)}
							variant="outline"
						>
							<CalendarIcon className="mr-2 h-4 w-4" />
							{date ? format(date, "PPP", { locale: es }) : "Seleccionar fecha"}
						</Button>
					</PopoverTrigger>
					<PopoverContent align="start" className="w-auto p-0">
						<Calendar
							initialFocus
							locale={es}
							mode="single"
							onSelect={handleDateSelect}
							selected={date}
						/>
					</PopoverContent>
				</Popover>
			</div>

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
							para {format(date, "d 'de' MMMM", { locale: es })}
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
			{employees.length > 0 ? (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{employeesWithKits.map(({ employee, currentKit, allKits }) => (
						<EmployeeKitCard
							allKitsForEmployee={allKits}
							currentKit={currentKit}
							employee={employee}
							key={employee.id}
							selectedDate={date}
						/>
					))}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
						<Users className="h-6 w-6 text-muted-foreground" />
					</div>
					<h3 className="mb-2 font-semibold text-[#11181C] text-lg dark:text-[#ECEDEE]">
						No hay empleadas registradas
					</h3>
					<p className="mb-4 max-w-sm text-[#687076] text-sm dark:text-[#9BA1A6]">
						No se encontraron empleadas en el sistema. Contacta al administrador
						para agregar empleadas.
					</p>
				</div>
			)}

			{/* Assign Kit Modal */}
			<AssignKitModal
				employeesData={employeesResponse}
				inventoryData={inventoryResponse}
				onOpenChange={setModalOpen}
				open={modalOpen}
				warehouseId={warehouseId}
			/>
		</div>
	);
}
