"use memo";
"use client";

import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, ShieldAlert, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { getAllUsers, getAllWarehouses } from "@/lib/fetch-functions/inventory";
import {
	getAllEmployees,
	getAllPermissions,
	getEmployeesByWarehouseId,
} from "@/lib/fetch-functions/kits";
import { createQueryKey } from "@/lib/helpers";
import { useSignUpMutation, useUpdateUserMutation } from "@/lib/mutations/auth";
import { useCreateEmployee } from "@/lib/mutations/kits";
import {
	useCreateWarehouseMutation,
	useUpdateWarehouseAltegioConfigMutation,
} from "@/lib/mutations/warehouses";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useDeleteUserMutation } from "@/lib/mutations/auth";

/**
 * Type definition for user data from the API
 */
type UserData = {
	id: string;
	name: string;
	email: string;
	role?: string;
	warehouseId?: string;
};

/**
 * Type definition for warehouse data from the API
 */
type WarehouseData = {
	id: string;
	name: string;
	code: string;
	description?: string | null;
	[key: string]: unknown; // Allow additional properties from API
};

/**
 * Type definition for the API response containing users
 */
type UsersResponse =
	| {
			success: true;
			message: string;
			data: UserData[];
	  }
	| {
			success: false;
			message: string;
	  }
	| null;

/**
 * Type definition for the API response containing warehouses
 */
type WarehousesResponse =
	| {
			success: true;
			message: string;
			data: WarehouseData[];
	  }
	| {
			success: false;
			message: string;
	  }
	| null;

/**
 * Type definition for the API response containing employees
 */
type EmployeesResponse = Awaited<
	ReturnType<typeof getAllEmployees | typeof getEmployeesByWarehouseId>
>;

/**
 * Type definition for the API response containing permissions
 */
type PermissionsResponse = Awaited<ReturnType<typeof getAllPermissions>>;

type EmployeeData = {
	id: string;
	name: string;
	surname: string;
	warehouseId: string;
	passcode?: number | null;
	userId?: string | null;
	permissions?: string | null;
};

type PermissionData = {
	id: string;
	name: string;
};

type ForbiddenCardProps = {
	title: string;
	description: string;
};

const ForbiddenCard = ({ title, description }: ForbiddenCardProps) => (
	<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
		<CardContent className="px-6 flex flex-col items-center justify-center py-12">
			<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
				<ShieldAlert className="h-8 w-8 text-amber-600 dark:text-amber-400" />
			</div>
			<h3 className="mb-2 font-semibold text-[#11181C] text-lg dark:text-[#ECEDEE]">
				{title}
			</h3>
			<p className="max-w-md text-center text-[#687076] text-sm dark:text-[#9BA1A6]">
				{description}
			</p>
		</CardContent>
	</Card>
);

/**
 * Render the settings page with tabs for managing users (create and, for encargados, update) and warehouses.
 *
 * The update user form is restricted to users with the "encargado" role and includes comboboxes for selecting
 * users and warehouses; create forms perform client-side validation and invoke server mutations.
 *
 * @param role - Current user's role; used to determine whether the update-user form is accessible
 * @returns The AjustesPage JSX element
 */
export function AjustesPage({ role }: { role: string }) {
	const router = useRouter();
	const normalizedRole =
		typeof role === "string" ? role.toLowerCase() : String(role ?? "");
	const isEncargado = normalizedRole === "encargado";
	const isEmployee = normalizedRole === "employee";
	const user = useAuthStore((s) => s.user);
	const warehouseId = user?.warehouseId ?? "";
	const employeeWarehouseId = isEmployee ? warehouseId.trim() : "";

	// Fetch users and warehouses data
	const { data: usersResponse } = useSuspenseQuery<
		UsersResponse,
		Error,
		UsersResponse
	>({
		queryKey: queryKeys.users,
		queryFn: getAllUsers,
	});

	const { data: warehousesResponse } = useSuspenseQuery<
		WarehousesResponse,
		Error,
		WarehousesResponse
	>({
		queryKey: queryKeys.warehouses,
		queryFn: getAllWarehouses,
	});

	// Fetch employees data based on role
	const employeesQueryParams = [isEncargado ? "all" : warehouseId];
	const employeesQueryFn = isEncargado
		? getAllEmployees
		: () => getEmployeesByWarehouseId(warehouseId);

	const { data: employeesResponse } = useSuspenseQuery<
		EmployeesResponse,
		Error,
		EmployeesResponse
	>({
		queryKey: createQueryKey(["employees"], employeesQueryParams),
		queryFn: employeesQueryFn,
	});

	// Fetch permissions data
	const { data: permissionsResponse } = useSuspenseQuery<
		PermissionsResponse,
		Error,
		PermissionsResponse
	>({
		queryKey: createQueryKey(["permissions"], []),
		queryFn: getAllPermissions,
	});

	const users =
		usersResponse && "data" in usersResponse ? usersResponse.data : [];
const warehouses =
	warehousesResponse && "data" in warehousesResponse
		? warehousesResponse.data
		: [];

	const [deleteUserId, setDeleteUserId] = useState<string>("");
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const employees = useMemo<EmployeeData[]>(() => {
		if (employeesResponse && "data" in employeesResponse) {
			return (employeesResponse.data || []).map(
				(item: { employee: EmployeeData }) => ({
					id: item.employee.id,
					name: item.employee.name,
					surname: item.employee.surname,
					warehouseId: item.employee.warehouseId,
					passcode: item.employee.passcode,
					userId: item.employee.userId,
					permissions: item.employee.permissions,
				}),
			);
		}
		return [];
	}, [employeesResponse]);
	const scopedEmployees = useMemo(() => {
		if (isEncargado) {
			return employees;
		}
		if (!warehouseId) {
			return [];
		}
		return employees.filter((employee) => employee.warehouseId === warehouseId);
	}, [employees, isEncargado, warehouseId]);

	const permissions: PermissionData[] =
		permissionsResponse && "data" in permissionsResponse
			? permissionsResponse.data.map((p: { id: string; permission: string }) => ({
					id: p.id,
					name: p.permission,
				}))
			: [];

	// State for comboboxes
	const [userComboboxOpen, setUserComboboxOpen] = useState(false);
	const [warehouseComboboxOpen, setWarehouseComboboxOpen] = useState(false);
	const [employeeWarehouseComboboxOpen, setEmployeeWarehouseComboboxOpen] =
		useState(false);
	const [employeeUserComboboxOpen, setEmployeeUserComboboxOpen] =
		useState(false);
	const [permissionComboboxOpen, setPermissionComboboxOpen] = useState(false);
	const [altegioWarehouseComboboxOpen, setAltegioWarehouseComboboxOpen] =
		useState(false);
	const isEmployeeWarehouseLocked = isEmployee;

	// Form instances for user management
	const userForm = useForm({
		defaultValues: {
			name: "",
			email: "",
			password: "",
		},
	});

	const updateUserForm = useForm({
		defaultValues: {
			userId: "",
			role: "" as "" | "employee" | "encargado",
			warehouseId: "",
		},
	});

	// Form instance for warehouse management
	const warehouseForm = useForm({
		defaultValues: {
			name: "",
			code: "",
			description: "",
		},
	});

	// Form instance for employee management
	const employeeForm = useForm({
		defaultValues: {
			name: "",
			surname: "",
			warehouseId: employeeWarehouseId,
			passcode: "",
			userId: "",
			permissions: "",
		},
	});

	useEffect(() => {
		if (!isEmployee || !employeeWarehouseId) {
			return;
		}
		if (employeeForm.state.values.warehouseId !== employeeWarehouseId) {
			employeeForm.setFieldValue("warehouseId", employeeWarehouseId);
		}
	}, [employeeForm, employeeWarehouseId, isEmployee]);

	// Form instance for warehouse Altegio config
	const altegioConfigForm = useForm({
		defaultValues: {
			warehouseId: "",
			altegioId: "",
			consumablesId: "",
			salesId: "",
			isCedis: false,
		},
	});

	// Mutations
	const { mutateAsync: createUser, isPending: isCreatingUser } =
		useSignUpMutation();
	const { mutateAsync: updateUser, isPending: isUpdatingUser } =
		useUpdateUserMutation();
	const { mutateAsync: deleteUserMutateAsync, isPending: isDeletingUser } =
		useDeleteUserMutation();
	const { mutateAsync: createWarehouse, isPending: isCreatingWarehouse } =
		useCreateWarehouseMutation();
	const { mutateAsync: createEmployee, isPending: isCreatingEmployee } =
		useCreateEmployee();
	const {
		mutateAsync: updateWarehouseAltegioConfig,
		isPending: isUpdatingAltegioConfig,
	} = useUpdateWarehouseAltegioConfigMutation();

	/**
	 * Handles the submission of the create user form.
	 * Validates the form data, calls the sign-up mutation, and shows appropriate toast notifications.
	 *
	 * @param e - The form submission event
	 */
	const handleUserSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const { name, email, password } = userForm.state.values;
			const response = await createUser({ name, email, password });
			if (response?.data?.user?.id) {
				toast.success("Usuario creado correctamente");
				userForm.reset();
				router.refresh();
			} else {
				toast.info(
					"Solicitud enviada. Revisa el correo de verificación si aplica.",
				);
			}
		} catch (error) {
			toast.error("No se pudo crear el usuario");
			console.error(error);
		}
	};

	/**
	 * Handles the submission of the update user form.
	 * Validates that at least one field is being updated, calls the update mutation,
	 * and shows appropriate toast notifications.
	 *
	 * @param e - The form submission event
	 */
	const handleUpdateUserSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const {
				userId,
				role: selectedRole,
				warehouseId,
			} = updateUserForm.state.values;

			// Validate that userId is provided
			if (!userId.trim()) {
				toast.error("Debes seleccionar un usuario");
				return;
			}

			// Validate that at least one field is being updated
			if (!selectedRole && !warehouseId) {
				toast.error(
					"Debes proporcionar al menos un campo para actualizar (rol o bodega)",
				);
				return;
			}

			// Build payload with only provided fields
			const payload: {
				userId: string;
				role?: "employee" | "encargado";
				warehouseId?: string;
			} = {
				userId: userId.trim(),
			};

			if (selectedRole) {
				payload.role = selectedRole;
			}

			if (warehouseId?.trim()) {
				payload.warehouseId = warehouseId.trim();
			}

			await updateUser(payload);
			toast.success("Usuario actualizado correctamente");
			updateUserForm.reset();
			router.refresh();
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "No se pudo actualizar el usuario";
			toast.error(errorMessage);
			console.error(error);
		}
	};

	const handleDeleteUser = async () => {
		if (!deleteUserId) {
			toast.error("Selecciona un usuario a borrar.");
			return;
		}
		try {
			await deleteUserMutateAsync({ userId: deleteUserId });
			toast.success("Usuario eliminado correctamente");
			setDeleteUserId("");
			setIsDeleteDialogOpen(false);
		} catch (error) {
			if (error instanceof Error) {
				toast.error(error.message);
			}
		}
	};

	/**
	 * Handles the submission of the create warehouse form.
	 * Validates required fields, calls the create warehouse mutation,
	 * and shows appropriate toast notifications.
	 *
	 * @param e - The form submission event
	 */
	const handleWarehouseSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const { name, code, description } = warehouseForm.state.values;
		const payload = {
			name: name.trim(),
			code: code.trim(),
			...(description.trim() ? { description: description.trim() } : {}),
		};
		if (!payload.name || !payload.code) {
			toast.error("Nombre y código son obligatorios");
			return;
		}
		try {
			await createWarehouse(payload);
			warehouseForm.reset();
			router.refresh();
		} catch {
			// Toast and logging handled inside the mutation hook
		}
	};

	/**
	 * Handles the submission of the create employee form.
	 * Validates required fields, checks for duplicate employees,
	 * calls the create employee mutation, and shows appropriate toast notifications.
	 *
	 * @param e - The form submission event
	 */
	const handleEmployeeSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const {
			name,
			surname,
			warehouseId: empWarehouseId,
			passcode,
			userId: empUserId,
			permissions: empPermissions,
		} = employeeForm.state.values;

		// Validate required fields
		if (!name.trim() || !surname.trim() || !empWarehouseId.trim()) {
			toast.error("Nombre, apellido y bodega son obligatorios");
			return;
		}

		// Check if employee already exists (by name and surname combination)
		const existingEmployee = scopedEmployees.find(
			(emp) =>
				emp.name.toLowerCase() === name.trim().toLowerCase() &&
				emp.surname.toLowerCase() === surname.trim().toLowerCase(),
		);

		if (existingEmployee) {
			toast.error(
				`El empleado ${name.trim()} ${surname.trim()} ya existe en el sistema`,
			);
			return;
		}

		// Build payload
		const payload: {
			name: string;
			surname: string;
			warehouseId: string;
			passcode?: number;
			userId?: string;
			permissions?: string;
		} = {
			name: name.trim(),
			surname: surname.trim(),
			warehouseId: empWarehouseId.trim(),
		};

		// Add optional fields if provided
		if (passcode.trim()) {
			const passcodeNum = Number.parseInt(passcode.trim(), 10);
			if (
				Number.isNaN(passcodeNum) ||
				passcodeNum < 1000 ||
				passcodeNum > 9999
			) {
				toast.error("El código debe ser un número de 4 dígitos (1000-9999)");
				return;
			}
			payload.passcode = passcodeNum;
		}

		if (empUserId.trim()) {
			payload.userId = empUserId.trim();
		}

		if (empPermissions.trim()) {
			payload.permissions = empPermissions.trim();
		}

		try {
			await createEmployee(payload);
			employeeForm.reset();
			router.refresh();
		} catch (error) {
			// Error handling is done in the mutation hook
			console.error(error);
		}
	};

	/**
	 * Handles the submission of the warehouse Altegio config form.
	 * Validates that at least one field is provided, converts string inputs to numbers,
	 * calls the update mutation, and shows appropriate toast notifications.
	 *
	 * @param e - The form submission event
	 */
	const handleAltegioConfigSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const {
			warehouseId: configWarehouseId,
			altegioId,
			consumablesId,
			salesId,
			isCedis,
		} = altegioConfigForm.state.values;

		// Validate that warehouse is selected
		if (!configWarehouseId.trim()) {
			toast.error("Debes seleccionar una bodega");
			return;
		}

		// Validate that at least one field is being updated
		if (
			!altegioId.trim() &&
			!consumablesId.trim() &&
			!salesId.trim() &&
			isCedis === false
		) {
			toast.error(
				"Debes proporcionar al menos un campo para actualizar",
			);
			return;
		}

		// Build payload with only provided fields
		const payload: {
			warehouseId: string;
			altegioId?: number;
			consumablesId?: number;
			salesId?: number;
			isCedis?: boolean;
		} = {
			warehouseId: configWarehouseId.trim(),
		};

		// Add optional fields if provided
		if (altegioId.trim()) {
			const altegioIdNum = Number.parseInt(altegioId.trim(), 10);
			if (Number.isNaN(altegioIdNum)) {
				toast.error("Altegio ID debe ser un número válido");
				return;
			}
			payload.altegioId = altegioIdNum;
		}

		if (consumablesId.trim()) {
			const consumablesIdNum = Number.parseInt(consumablesId.trim(), 10);
			if (Number.isNaN(consumablesIdNum)) {
				toast.error("Consumables ID debe ser un número válido");
				return;
			}
			payload.consumablesId = consumablesIdNum;
		}

		if (salesId.trim()) {
			const salesIdNum = Number.parseInt(salesId.trim(), 10);
			if (Number.isNaN(salesIdNum)) {
				toast.error("Sales ID debe ser un número válido");
				return;
			}
			payload.salesId = salesIdNum;
		}

		// Only include isCedis if it's explicitly set to true
		if (isCedis === true) {
			payload.isCedis = true;
		}

		try {
			await updateWarehouseAltegioConfig(payload);
			altegioConfigForm.reset();
			router.refresh();
		} catch (error) {
			// Error handling is done in the mutation hook
			console.error(error);
		}
	};

	return (
		<div className="theme-transition p-4 md:p-8">
			<div className="mx-auto w-full max-w-4xl">
				<div className="mb-6">
					<h1 className="font-bold text-2xl text-[#11181C] dark:text-[#ECEDEE]">
						Ajustes
					</h1>
					<p className="mt-1 text-[#687076] text-sm dark:text-[#9BA1A6]">
						Administra usuarios y bodegas del sistema
					</p>
				</div>

				<Tabs className="w-full" defaultValue="users">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="users">Usuarios</TabsTrigger>
						<TabsTrigger value="warehouses">Bodegas</TabsTrigger>
						<TabsTrigger value="employees">Empleadas</TabsTrigger>
					</TabsList>

					{/* Users Tab */}
					<TabsContent className="space-y-6" value="users">
						{isEncargado ? (
							<>
						{/* Create User Card */}
						<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
							<CardHeader>
								<CardTitle className="text-[#11181C] dark:text-[#ECEDEE]">
									Crear usuario
								</CardTitle>
								<CardDescription className="text-[#687076] dark:text-[#9BA1A6]">
									Registra un usuario nuevo para la plataforma
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form className="space-y-4" onSubmit={handleUserSubmit}>
									<div className="space-y-2">
										<Label
											className="text-[#11181C] dark:text-[#ECEDEE]"
											htmlFor="user-name"
										>
											Nombre
										</Label>
										<userForm.Field
											name="name"
											validators={{
												onChange: ({ value }) =>
													value.trim().length > 0 ? undefined : "Requerido",
											}}
										>
											{(field) => (
												<>
													<Input
														className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:placeholder:text-[#9BA1A6]"
														disabled={isCreatingUser}
														id="user-name"
														name={field.name}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														placeholder="Juan Pérez"
														value={field.state.value}
													/>
													{!field.state.meta.isValid && (
														<em className="mt-1 text-red-500 text-xs">
															{field.state.meta.errors.join(",")}
														</em>
													)}
												</>
											)}
										</userForm.Field>
									</div>

									<div className="space-y-2">
										<Label
											className="text-[#11181C] dark:text-[#ECEDEE]"
											htmlFor="user-email"
										>
											Correo
										</Label>
										<userForm.Field
											name="email"
											validators={{
												onChange: ({ value }) =>
													value.trim().length > 0 ? undefined : "Requerido",
											}}
										>
											{(field) => (
												<>
													<Input
														className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
														disabled={isCreatingUser}
														id="user-email"
														name={field.name}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														placeholder="correo@ejemplo.com"
														type="email"
														value={field.state.value}
													/>
													{!field.state.meta.isValid && (
														<em className="mt-1 text-red-500 text-xs">
															{field.state.meta.errors.join(",")}
														</em>
													)}
												</>
											)}
										</userForm.Field>
									</div>

									<div className="space-y-2">
										<Label
											className="text-[#11181C] dark:text-[#ECEDEE]"
											htmlFor="user-password"
										>
											Contraseña
										</Label>
										<userForm.Field
											name="password"
											validators={{
												onChange: ({ value }) =>
													value.trim().length >= 8
														? undefined
														: "Mínimo 8 caracteres",
											}}
										>
											{(field) => (
												<>
													<Input
														className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
														disabled={isCreatingUser}
														id="user-password"
														name={field.name}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														placeholder="********"
														type="password"
														value={field.state.value}
													/>
													{!field.state.meta.isValid && (
														<em className="mt-1 text-red-500 text-xs">
															{field.state.meta.errors.join(",")}
														</em>
													)}
												</>
											)}
										</userForm.Field>
									</div>

									<div className="pt-2">
										<Button
											className="theme-transition h-11 bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90"
											disabled={isCreatingUser}
											type="submit"
										>
											{isCreatingUser ? "Creando usuario..." : "Crear Usuario"}
										</Button>
									</div>
								</form>
					</CardContent>
				</Card>

				{/* Delete User Card */}
				<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardHeader>
						<CardTitle className="text-[#11181C] dark:text-[#ECEDEE]">
							Borrar usuario
						</CardTitle>
						<CardDescription className="text-[#687076] dark:text-[#9BA1A6]">
							Esta acción es permanente y eliminará al usuario seleccionado.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label className="text-[#11181C] dark:text-[#ECEDEE]">
								Usuario
							</Label>
							<Select
								disabled={isDeletingUser || users.length === 0}
								onValueChange={(value) => setDeleteUserId(value)}
								value={deleteUserId}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder={users.length === 0 ? "Sin usuarios" : "Selecciona un usuario"} />
								</SelectTrigger>
								<SelectContent>
									{users.length === 0 ? (
										<SelectItem disabled value="">
											No hay usuarios disponibles
										</SelectItem>
									) : (
										users.map((u) => (
											<SelectItem key={u.id} value={u.id}>
												{u.name || u.email}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
						</div>

					<Button
						className="bg-red-600 text-white hover:bg-red-700"
						disabled={!deleteUserId || isDeletingUser}
						onClick={() => setIsDeleteDialogOpen(true)}
						type="button"
					>
						{isDeletingUser ? "Borrando..." : "Borrar usuario"}
					</Button>

					<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Confirmar eliminación</DialogTitle>
								<DialogDescription>
									Esta acción no se puede deshacer. Se eliminará el usuario y se
									revocará su acceso.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<Button onClick={() => setIsDeleteDialogOpen(false)} variant="outline">
									Cancelar
								</Button>
								<Button
									className="bg-red-600 text-white hover:bg-red-700"
									onClick={handleDeleteUser}
								>
									Eliminar usuario
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
					</CardContent>
				</Card>

						{/* Update User Card - Only visible to encargados */}
						<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
								<CardHeader>
									<CardTitle className="text-[#11181C] dark:text-[#ECEDEE]">
										Actualizar usuario
									</CardTitle>
									<CardDescription className="text-[#687076] dark:text-[#9BA1A6]">
										Modifica el rol y/o la bodega asignada a un usuario
										existente
									</CardDescription>
								</CardHeader>
								<CardContent>
									<form className="space-y-4" onSubmit={handleUpdateUserSubmit}>
										{/* User Combobox */}
										<div className="space-y-2">
											<Label
												className="text-[#11181C] dark:text-[#ECEDEE]"
												htmlFor="update-user-select"
											>
												Usuario
											</Label>
											<updateUserForm.Field
												name="userId"
												validators={{
													onChange: ({ value }) =>
														value.trim().length > 0 ? undefined : "Requerido",
												}}
											>
												{(field) => (
													<>
														<Popover
															onOpenChange={setUserComboboxOpen}
															open={userComboboxOpen}
														>
															<PopoverTrigger asChild>
																<Button
																	aria-expanded={userComboboxOpen}
																	className="input-transition h-10 w-full justify-between border-[#E5E7EB] bg-white text-[#11181C] hover:bg-white hover:text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:hover:bg-[#151718] dark:hover:text-[#ECEDEE]"
																	disabled={isUpdatingUser}
																	type="button"
																	variant="outline"
																>
																	{field.state.value
																		? (users.find(
																				(user) => user.id === field.state.value,
																			)?.name ?? "Seleccionar usuario")
																		: "Seleccionar usuario"}
																	<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
																</Button>
															</PopoverTrigger>
															<PopoverContent className="w-full p-0">
																<Command>
																	<CommandInput placeholder="Buscar usuario..." />
																	<CommandList>
																		<CommandEmpty>
																			No se encontraron usuarios.
																		</CommandEmpty>
																		<CommandGroup>
																			{users.map((user) => (
																				<CommandItem
																					key={user.id}
																					onSelect={() => {
																						field.handleChange(user.id);
																						setUserComboboxOpen(false);
																					}}
																					value={user.name}
																				>
																					<Check
																						className={cn(
																							"mr-2 h-4 w-4",
																							field.state.value === user.id
																								? "opacity-100"
																								: "opacity-0",
																						)}
																					/>
																					<div className="flex flex-col">
																						<span className="font-medium">
																							{user.name}
																						</span>
																						<span className="text-muted-foreground text-xs">
																							{user.email}
																						</span>
																					</div>
																				</CommandItem>
																			))}
																		</CommandGroup>
																	</CommandList>
																</Command>
															</PopoverContent>
														</Popover>
														{!field.state.meta.isValid && (
															<em className="mt-1 text-red-500 text-xs">
																{field.state.meta.errors.join(",")}
															</em>
														)}
													</>
												)}
											</updateUserForm.Field>
										</div>

										{/* Role Select */}
										<div className="space-y-2">
											<Label
												className="text-[#11181C] dark:text-[#ECEDEE]"
												htmlFor="update-user-role"
											>
												Rol (opcional)
											</Label>
											<updateUserForm.Field name="role">
												{(field) => (
													<Select
														disabled={isUpdatingUser}
														onValueChange={(value) =>
															field.handleChange(
																value as "employee" | "encargado",
															)
														}
														value={field.state.value}
													>
														<SelectTrigger
															className="input-transition border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
															id="update-user-role"
														>
															<SelectValue placeholder="Seleccionar rol" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="employee">Empleado</SelectItem>
															<SelectItem value="encargado">
																Encargado
															</SelectItem>
														</SelectContent>
													</Select>
												)}
											</updateUserForm.Field>
										</div>

										{/* Warehouse Combobox */}
										<div className="space-y-2">
											<Label
												className="text-[#11181C] dark:text-[#ECEDEE]"
												htmlFor="update-user-warehouse"
											>
												Bodega (opcional)
											</Label>
											<updateUserForm.Field name="warehouseId">
												{(field) => (
													<Popover
														onOpenChange={setWarehouseComboboxOpen}
														open={warehouseComboboxOpen}
													>
														<PopoverTrigger asChild>
															<Button
																aria-expanded={warehouseComboboxOpen}
																className="input-transition h-10 w-full justify-between border-[#E5E7EB] bg-white text-[#11181C] hover:bg-white hover:text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:hover:bg-[#151718] dark:hover:text-[#ECEDEE]"
																disabled={isUpdatingUser}
																type="button"
																variant="outline"
															>
																{field.state.value
																	? (warehouses.find(
																			(warehouse) =>
																				warehouse.id === field.state.value,
																		)?.name ?? "Seleccionar bodega")
																	: "Seleccionar bodega"}
																<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
															</Button>
														</PopoverTrigger>
														<PopoverContent className="w-full p-0">
															<Command>
																<CommandInput placeholder="Buscar bodega..." />
																<CommandList>
																	<CommandEmpty>
																		No se encontraron bodegas.
																	</CommandEmpty>
																	<CommandGroup>
																		{warehouses.map((warehouse) => (
																			<CommandItem
																				key={warehouse.id}
																				onSelect={() => {
																					field.handleChange(warehouse.id);
																					setWarehouseComboboxOpen(false);
																				}}
																				value={warehouse.name}
																			>
																				<Check
																					className={cn(
																						"mr-2 h-4 w-4",
																						field.state.value === warehouse.id
																							? "opacity-100"
																							: "opacity-0",
																					)}
																				/>
																				<div className="flex flex-col">
																					<span className="font-medium">
																						{warehouse.name}
																					</span>
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
												)}
											</updateUserForm.Field>
										</div>

										{/* Note */}
										<div className="rounded-md border border-amber-500/20 bg-amber-50 p-3 dark:bg-amber-950/20">
											<p className="text-amber-800 text-xs dark:text-amber-300">
												<strong>Nota:</strong> Debes proporcionar al menos el
												rol o la bodega para actualizar el usuario.
											</p>
										</div>

										<div className="pt-2">
											<Button
												className="theme-transition h-11 bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90"
												disabled={isUpdatingUser}
												type="submit"
											>
												{isUpdatingUser
													? "Actualizando usuario..."
													: "Actualizar Usuario"}
											</Button>
										</div>
									</form>
								</CardContent>
							</Card>
						</>
					) : (
						<ForbiddenCard
							description="Solo los usuarios con rol de encargado pueden gestionar usuarios."
							title="Permisos insuficientes"
						/>
					)}
					</TabsContent>

					{/* Warehouses Tab */}
					<TabsContent className="space-y-6" value="warehouses">
						{isEncargado ? (
							<>
						<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
							<CardHeader>
								<CardTitle className="text-[#11181C] dark:text-[#ECEDEE]">
									Crear bodega
								</CardTitle>
								<CardDescription className="text-[#687076] dark:text-[#9BA1A6]">
									Registra un nuevo almacén en el sistema
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form className="space-y-4" onSubmit={handleWarehouseSubmit}>
									<div className="space-y-2">
										<Label
											className="text-[#11181C] dark:text-[#ECEDEE]"
											htmlFor="warehouse-name"
										>
											Nombre de la bodega
										</Label>
										<warehouseForm.Field
											name="name"
											validators={{
												onChange: ({ value }) =>
													value.trim().length > 0 ? undefined : "Requerido",
											}}
										>
											{(field) => (
												<>
													<Input
														className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
														disabled={isCreatingWarehouse}
														id="warehouse-name"
														name={field.name}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														placeholder="Bodega Centro"
														value={field.state.value}
													/>
													{!field.state.meta.isValid && (
														<em className="mt-1 text-red-500 text-xs">
															{field.state.meta.errors.join(",")}
														</em>
													)}
												</>
											)}
										</warehouseForm.Field>
									</div>

									<div className="space-y-2">
										<Label
											className="text-[#11181C] dark:text-[#ECEDEE]"
											htmlFor="warehouse-code"
										>
											Código interno
										</Label>
										<warehouseForm.Field
											name="code"
											validators={{
												onChange: ({ value }) =>
													value.trim().length > 0 ? undefined : "Requerido",
											}}
										>
											{(field) => (
												<>
													<Input
														className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
														disabled={isCreatingWarehouse}
														id="warehouse-code"
														name={field.name}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														placeholder="CENTRAL-001"
														value={field.state.value}
													/>
													{!field.state.meta.isValid && (
														<em className="mt-1 text-red-500 text-xs">
															{field.state.meta.errors.join(",")}
														</em>
													)}
												</>
											)}
										</warehouseForm.Field>
									</div>

									<div className="space-y-2">
										<Label
											className="text-[#11181C] dark:text-[#ECEDEE]"
											htmlFor="warehouse-description"
										>
											Descripción (opcional)
										</Label>
										<warehouseForm.Field name="description">
											{(field) => (
												<Textarea
													className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
													disabled={isCreatingWarehouse}
													id="warehouse-description"
													name={field.name}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder="Bodega principal para pedidos en línea"
													value={field.state.value}
												/>
											)}
										</warehouseForm.Field>
									</div>

									<div className="pt-2">
										<Button
											className="theme-transition h-11 bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90"
											disabled={isCreatingWarehouse}
											type="submit"
										>
											{isCreatingWarehouse
												? "Creando bodega..."
												: "Crear Bodega"}
										</Button>
									</div>
								</form>
							</CardContent>
						</Card>

						{/* Update Warehouse Altegio Config Card */}
						<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
							<CardHeader>
								<CardTitle className="text-[#11181C] dark:text-[#ECEDEE]">
									Configuración de Altegio
								</CardTitle>
								<CardDescription className="text-[#687076] dark:text-[#9BA1A6]">
									Actualiza la configuración de integración con Altegio para una
									bodega
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form
									className="space-y-4"
									onSubmit={handleAltegioConfigSubmit}
								>
									{/* Warehouse Combobox */}
									<div className="space-y-2">
										<Label
											className="text-[#11181C] dark:text-[#ECEDEE]"
											htmlFor="altegio-warehouse-select"
										>
											Bodega <span className="text-red-500">*</span>
										</Label>
										<altegioConfigForm.Field name="warehouseId">
											{(field) => (
												<>
													<Popover
														onOpenChange={setAltegioWarehouseComboboxOpen}
														open={altegioWarehouseComboboxOpen}
													>
														<PopoverTrigger asChild>
															<Button
																aria-expanded={altegioWarehouseComboboxOpen}
																className="input-transition h-10 w-full justify-between border-[#E5E7EB] bg-white text-[#11181C] hover:bg-white hover:text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:hover:bg-[#151718] dark:hover:text-[#ECEDEE]"
																disabled={isUpdatingAltegioConfig}
																type="button"
																variant="outline"
															>
																{field.state.value
																	? (warehouses.find(
																			(warehouse) =>
																				warehouse.id === field.state.value,
																		)?.name ?? "Seleccionar bodega")
																	: "Seleccionar bodega"}
																<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
															</Button>
														</PopoverTrigger>
														<PopoverContent className="w-full p-0">
															<Command>
																<CommandInput placeholder="Buscar bodega..." />
																<CommandList>
																	<CommandEmpty>
																		No se encontraron bodegas.
																	</CommandEmpty>
																	<CommandGroup>
																		{warehouses.map((warehouse) => (
																			<CommandItem
																				key={warehouse.id}
																				onSelect={() => {
																					field.handleChange(warehouse.id);
																					setAltegioWarehouseComboboxOpen(
																						false,
																					);
																				}}
																				value={warehouse.name}
																			>
																				<Check
																					className={cn(
																						"mr-2 h-4 w-4",
																						field.state.value === warehouse.id
																							? "opacity-100"
																							: "opacity-0",
																					)}
																				/>
																				<div className="flex flex-col">
																					<span className="font-medium">
																						{warehouse.name}
																					</span>
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
													{!field.state.meta.isValid && (
														<em className="mt-1 text-red-500 text-xs">
															{field.state.meta.errors.join(",")}
														</em>
													)}
												</>
											)}
										</altegioConfigForm.Field>
									</div>

									{/* Altegio ID Field */}
									<div className="space-y-2">
										<Label
											className="text-[#11181C] dark:text-[#ECEDEE]"
											htmlFor="altegio-id"
										>
											Altegio ID
										</Label>
										<altegioConfigForm.Field
											name="altegioId"
											validators={{
												onChange: ({ value }) =>
													value.trim().length === 0 ||
													!Number.isNaN(Number.parseInt(value.trim(), 10))
														? undefined
														: "Debe ser un número válido",
											}}
										>
											{(field) => (
												<>
													<Input
														className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
														disabled={isUpdatingAltegioConfig}
														id="altegio-id"
														name={field.name}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														placeholder="12345"
														type="number"
														value={field.state.value}
													/>
													{!field.state.meta.isValid && (
														<em className="mt-1 text-red-500 text-xs">
															{field.state.meta.errors.join(",")}
														</em>
													)}
												</>
											)}
										</altegioConfigForm.Field>
									</div>

									{/* Consumables ID Field */}
									<div className="space-y-2">
										<Label
											className="text-[#11181C] dark:text-[#ECEDEE]"
											htmlFor="consumables-id"
										>
											Consumables ID
										</Label>
										<altegioConfigForm.Field
											name="consumablesId"
											validators={{
												onChange: ({ value }) =>
													value.trim().length === 0 ||
													!Number.isNaN(Number.parseInt(value.trim(), 10))
														? undefined
														: "Debe ser un número válido",
											}}
										>
											{(field) => (
												<>
													<Input
														className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
														disabled={isUpdatingAltegioConfig}
														id="consumables-id"
														name={field.name}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														placeholder="67890"
														type="number"
														value={field.state.value}
													/>
													{!field.state.meta.isValid && (
														<em className="mt-1 text-red-500 text-xs">
															{field.state.meta.errors.join(",")}
														</em>
													)}
												</>
											)}
										</altegioConfigForm.Field>
									</div>

									{/* Sales ID Field */}
									<div className="space-y-2">
										<Label
											className="text-[#11181C] dark:text-[#ECEDEE]"
											htmlFor="sales-id"
										>
											Sales ID
										</Label>
										<altegioConfigForm.Field
											name="salesId"
											validators={{
												onChange: ({ value }) =>
													value.trim().length === 0 ||
													!Number.isNaN(Number.parseInt(value.trim(), 10))
														? undefined
														: "Debe ser un número válido",
											}}
										>
											{(field) => (
												<>
													<Input
														className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
														disabled={isUpdatingAltegioConfig}
														id="sales-id"
														name={field.name}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														placeholder="11111"
														type="number"
														value={field.state.value}
													/>
													{!field.state.meta.isValid && (
														<em className="mt-1 text-red-500 text-xs">
															{field.state.meta.errors.join(",")}
														</em>
													)}
												</>
											)}
										</altegioConfigForm.Field>
									</div>

									{/* Is CEDIS Checkbox */}
									<div className="space-y-2">
										<div className="flex items-center space-x-2">
											<altegioConfigForm.Field name="isCedis">
												{(field) => (
													<>
														<Checkbox
															checked={field.state.value}
															disabled={isUpdatingAltegioConfig}
															id="is-cedis"
															onBlur={field.handleBlur}
															onCheckedChange={(checked) =>
																field.handleChange(checked === true)
															}
														/>
													</>
												)}
											</altegioConfigForm.Field>
											<Label
												className="text-[#11181C] dark:text-[#ECEDEE]"
												htmlFor="is-cedis"
											>
												Es CEDIS
											</Label>
										</div>
									</div>

									<div className="pt-2">
										<Button
											className="theme-transition h-11 bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90"
											disabled={isUpdatingAltegioConfig}
											type="submit"
										>
											{isUpdatingAltegioConfig
												? "Actualizando configuración..."
												: "Actualizar Configuración"}
										</Button>
									</div>
								</form>
							</CardContent>
						</Card>
					</>
				) : (
					<ForbiddenCard
						description="Solo los usuarios con rol de encargado pueden gestionar bodegas."
						title="Permisos insuficientes"
					/>
				)}
					</TabsContent>

					{/* Employees Tab */}
					<TabsContent className="space-y-6" value="employees">
						{/* Create Employee Card */}
						<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-[#11181C] dark:text-[#ECEDEE]">
									<Users className="h-5 w-5" />
									Crear emplead@
								</CardTitle>
								<CardDescription className="text-[#687076] dark:text-[#9BA1A6]">
									Registra una nueva emplead@ en el sistema
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form className="space-y-4" onSubmit={handleEmployeeSubmit}>
									{/* Name Field */}
									<div className="space-y-2">
										<Label
											className="text-[#11181C] dark:text-[#ECEDEE]"
											htmlFor="employee-name"
										>
											Nombre <span className="text-red-500">*</span>
										</Label>
										<employeeForm.Field
											name="name"
											validators={{
												onChange: ({ value }) =>
													value.trim().length > 0 ? undefined : "Requerido",
											}}
										>
											{(field) => (
												<>
													<Input
														className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
														disabled={isCreatingEmployee}
														id="employee-name"
														name={field.name}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														placeholder="María"
														value={field.state.value}
													/>
													{!field.state.meta.isValid && (
														<em className="mt-1 text-red-500 text-xs">
															{field.state.meta.errors.join(",")}
														</em>
													)}
												</>
											)}
										</employeeForm.Field>
									</div>

									{/* Surname Field */}
									<div className="space-y-2">
										<Label
											className="text-[#11181C] dark:text-[#ECEDEE]"
											htmlFor="employee-surname"
										>
											Apellido <span className="text-red-500">*</span>
										</Label>
										<employeeForm.Field
											name="surname"
											validators={{
												onChange: ({ value }) =>
													value.trim().length > 0 ? undefined : "Requerido",
											}}
										>
											{(field) => (
												<>
													<Input
														className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
														disabled={isCreatingEmployee}
														id="employee-surname"
														name={field.name}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														placeholder="González"
														value={field.state.value}
													/>
													{!field.state.meta.isValid && (
														<em className="mt-1 text-red-500 text-xs">
															{field.state.meta.errors.join(",")}
														</em>
													)}
												</>
											)}
										</employeeForm.Field>
									</div>

									{/* Warehouse Field */}
									<div className="space-y-2">
										<Label className="text-[#11181C] dark:text-[#ECEDEE]">
											Bodega <span className="text-red-500">*</span>
										</Label>
										<employeeForm.Field
											name="warehouseId"
											validators={{
												onChange: ({ value }) =>
													value.trim().length > 0 ? undefined : "Requerido",
											}}
										>
											{(field) => (
												<>
													<Popover
														onOpenChange={(open) => {
															if (isEmployeeWarehouseLocked) {
																setEmployeeWarehouseComboboxOpen(false);
																return;
															}
															setEmployeeWarehouseComboboxOpen(open);
														}}
														open={employeeWarehouseComboboxOpen}
													>
														<PopoverTrigger asChild>
															<Button
																aria-expanded={employeeWarehouseComboboxOpen}
																className="input-transition h-10 w-full justify-between border-[#E5E7EB] bg-white text-[#11181C] hover:bg-white hover:text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:hover:bg-[#151718] dark:hover:text-[#ECEDEE]"
																disabled={
																	isCreatingEmployee ||
																	isEmployeeWarehouseLocked
																}
																type="button"
																variant="outline"
															>
																{field.state.value
																	? (warehouses.find(
																			(w) => w.id === field.state.value,
																		)?.name ?? "Seleccionar bodega")
																	: "Seleccionar bodega"}
																<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
															</Button>
														</PopoverTrigger>
														<PopoverContent className="w-full p-0">
															<Command>
																<CommandInput placeholder="Buscar bodega..." />
																<CommandList>
																	<CommandEmpty>
																		No se encontraron bodegas.
																	</CommandEmpty>
																	<CommandGroup>
																		{warehouses.map((warehouse) => (
																			<CommandItem
																				key={warehouse.id}
																				onSelect={() => {
																					field.handleChange(warehouse.id);
																					setEmployeeWarehouseComboboxOpen(
																						false,
																					);
																				}}
																				value={warehouse.name}
																			>
																				<Check
																					className={cn(
																						"mr-2 h-4 w-4",
																						field.state.value === warehouse.id
																							? "opacity-100"
																							: "opacity-0",
																					)}
																				/>
																				<div className="flex flex-col">
																					<span className="font-medium">
																						{warehouse.name}
																					</span>
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
													{!field.state.meta.isValid && (
														<em className="mt-1 text-red-500 text-xs">
															{field.state.meta.errors.join(",")}
														</em>
													)}
												</>
											)}
										</employeeForm.Field>
									</div>

									{/* Passcode Field (Optional) */}
									<div className="space-y-2">
										<Label
											className="text-[#11181C] dark:text-[#ECEDEE]"
											htmlFor="employee-passcode"
										>
											Código de acceso (4 dígitos)
										</Label>
										<employeeForm.Field name="passcode">
											{(field) => (
												<Input
													className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
													disabled={isCreatingEmployee}
													id="employee-passcode"
													maxLength={4}
													name={field.name}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder="1234"
													type="number"
													value={field.state.value}
												/>
											)}
										</employeeForm.Field>
										<p className="text-xs text-[#687076] dark:text-[#9BA1A6]">
											Opcional: número de 4 dígitos (1000-9999)
										</p>
									</div>

									{/* User ID Field (Optional) */}
									<div className="space-y-2">
										<Label className="text-[#11181C] dark:text-[#ECEDEE]">
											Usuario vinculado
										</Label>
										<employeeForm.Field name="userId">
											{(field) => (
												<Popover
													onOpenChange={setEmployeeUserComboboxOpen}
													open={employeeUserComboboxOpen}
												>
													<PopoverTrigger asChild>
														<Button
															aria-expanded={employeeUserComboboxOpen}
															className="input-transition h-10 w-full justify-between border-[#E5E7EB] bg-white text-[#11181C] hover:bg-white hover:text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:hover:bg-[#151718] dark:hover:text-[#ECEDEE]"
															disabled={isCreatingEmployee}
															type="button"
															variant="outline"
														>
															{field.state.value
																? (users.find((u) => u.id === field.state.value)
																		?.name ?? "Seleccionar usuario")
																: "Seleccionar usuario (opcional)"}
															<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
														</Button>
													</PopoverTrigger>
													<PopoverContent className="w-full p-0">
														<Command>
															<CommandInput placeholder="Buscar usuario..." />
															<CommandList>
																<CommandEmpty>
																	No se encontraron usuarios.
																</CommandEmpty>
																<CommandGroup>
																	{users.map((user) => (
																		<CommandItem
																			key={user.id}
																			onSelect={() => {
																				field.handleChange(user.id);
																				setEmployeeUserComboboxOpen(false);
																			}}
																			value={user.name}
																		>
																			<Check
																				className={cn(
																					"mr-2 h-4 w-4",
																					field.state.value === user.id
																						? "opacity-100"
																						: "opacity-0",
																				)}
																			/>
																			<div className="flex flex-col">
																				<span className="font-medium">
																					{user.name}
																				</span>
																				<span className="text-muted-foreground text-xs">
																					{user.email}
																				</span>
																			</div>
																		</CommandItem>
																	))}
																</CommandGroup>
															</CommandList>
														</Command>
													</PopoverContent>
												</Popover>
											)}
										</employeeForm.Field>
										<p className="text-xs text-[#687076] dark:text-[#9BA1A6]">
											Opcional: asocia esta emplead@ con una cuenta de usuario
										</p>
									</div>

									{/* Permissions Field (Optional) */}
									<div className="space-y-2">
										<Label className="text-[#11181C] dark:text-[#ECEDEE]">
											Permisos
										</Label>
										<employeeForm.Field name="permissions">
											{(field) => (
												<Popover
													onOpenChange={setPermissionComboboxOpen}
													open={permissionComboboxOpen}
												>
													<PopoverTrigger asChild>
														<Button
															aria-expanded={permissionComboboxOpen}
															className="input-transition h-10 w-full justify-between border-[#E5E7EB] bg-white text-[#11181C] hover:bg-white hover:text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:hover:bg-[#151718] dark:hover:text-[#ECEDEE]"
															disabled={isCreatingEmployee}
															type="button"
															variant="outline"
														>
															{field.state.value
																? (permissions.find(
																		(p) => p.id === field.state.value,
																	)?.name ?? "Seleccionar permisos")
																: "Seleccionar permisos (opcional)"}
															<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
														</Button>
													</PopoverTrigger>
													<PopoverContent className="w-full p-0">
														<Command>
															<CommandInput placeholder="Buscar permisos..." />
															<CommandList>
																<CommandEmpty>
																	No se encontraron permisos.
																</CommandEmpty>
																<CommandGroup>
																	{permissions.map((permission) => (
																		<CommandItem
																			key={permission.id}
																			onSelect={() => {
																				field.handleChange(permission.id);
																				setPermissionComboboxOpen(false);
																			}}
																			value={permission.name}
																		>
																			<Check
																				className={cn(
																					"mr-2 h-4 w-4",
																					field.state.value === permission.id
																						? "opacity-100"
																						: "opacity-0",
																				)}
																			/>
																			<div className="flex flex-col">
																				<span className="font-medium">
																					{permission.name}
																				</span>
																			</div>
																		</CommandItem>
																	))}
																</CommandGroup>
															</CommandList>
														</Command>
													</PopoverContent>
												</Popover>
											)}
										</employeeForm.Field>
										<p className="text-xs text-[#687076] dark:text-[#9BA1A6]">
											Opcional: asigna permisos específicos a esta emplead@
										</p>
									</div>

									{/* Submit Button */}
									<div className="pt-2">
										<Button
											className="theme-transition h-11 w-full bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90"
											disabled={isCreatingEmployee}
											type="submit"
										>
											{isCreatingEmployee ? "Creando..." : "Crear emplead@"}
										</Button>
									</div>
								</form>
							</CardContent>
						</Card>

						{/* Existing Employees Info */}
						<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
							<CardHeader>
								<CardTitle className="text-[#11181C] dark:text-[#ECEDEE]">
									Empleadas registradas
								</CardTitle>
								<CardDescription className="text-[#687076] dark:text-[#9BA1A6]">
									Total: {scopedEmployees.length} emplead@(s) en el sistema
									{!isEncargado &&
										` (bodega actual: ${scopedEmployees.length})`}
								</CardDescription>
							</CardHeader>
							<CardContent>
								{scopedEmployees.length > 0 ? (
									<div className="space-y-2">
										{scopedEmployees.map((emp) => (
											<div
												className="flex items-center justify-between rounded-lg border border-[#E5E7EB] p-3 dark:border-[#2D3033]"
												key={emp.id}
											>
												<div className="flex flex-col">
													<span className="font-medium text-[#11181C] dark:text-[#ECEDEE]">
														{emp.name} {emp.surname}
													</span>
													<span className="text-xs text-[#687076] dark:text-[#9BA1A6]">
														{warehouses.find((w) => w.id === emp.warehouseId)
															?.name || "Bodega no asignada"}
													</span>
												</div>
												{emp.passcode && (
													<span className="font-mono text-xs text-[#687076] dark:text-[#9BA1A6]">
														Código: {emp.passcode}
													</span>
												)}
											</div>
										))}
									</div>
								) : (
									<p className="text-center text-sm text-[#687076] dark:text-[#9BA1A6]">
										No hay emplead@s registradas
									</p>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
