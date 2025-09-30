"use client";

import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { getAllUsers, getAllWarehouses } from "@/lib/fetch-functions/inventory";
import { useSignUpMutation, useUpdateUserMutation } from "@/lib/mutations/auth";
import { useCreateWarehouseMutation } from "@/lib/mutations/warehouses";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

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
	const isEncargado = role === "encargado";

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

	const users =
		usersResponse && "data" in usersResponse ? usersResponse.data : [];
	const warehouses =
		warehousesResponse && "data" in warehousesResponse
			? warehousesResponse.data
			: [];

	// State for comboboxes
	const [userComboboxOpen, setUserComboboxOpen] = useState(false);
	const [warehouseComboboxOpen, setWarehouseComboboxOpen] = useState(false);

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

	// Mutations
	const { mutateAsync: createUser, isPending: isCreatingUser } =
		useSignUpMutation();
	const { mutateAsync: updateUser, isPending: isUpdatingUser } =
		useUpdateUserMutation();
	const { mutateAsync: createWarehouse, isPending: isCreatingWarehouse } =
		useCreateWarehouseMutation();

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
			// biome-ignore lint/suspicious/noConsole: logging
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
			// biome-ignore lint/suspicious/noConsole: logging
			console.error(error);
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
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="users">Usuarios</TabsTrigger>
						<TabsTrigger value="warehouses">Bodegas</TabsTrigger>
					</TabsList>

					{/* Users Tab */}
					<TabsContent className="space-y-6" value="users">
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

						{/* Update User Card - Only visible to encargados */}
						{isEncargado ? (
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
																	role="combobox"
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
																role="combobox"
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
						) : (
							/* Empty state for non-encargado users */
							<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
								<CardContent className="flex flex-col items-center justify-center py-12">
									<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
										<ShieldAlert className="h-8 w-8 text-amber-600 dark:text-amber-400" />
									</div>
									<h3 className="mb-2 font-semibold text-[#11181C] text-lg dark:text-[#ECEDEE]">
										Permisos insuficientes
									</h3>
									<p className="max-w-md text-center text-[#687076] text-sm dark:text-[#9BA1A6]">
										Solo los usuarios con rol de <strong>encargado</strong>{" "}
										pueden actualizar información de usuarios.
									</p>
								</CardContent>
							</Card>
						)}
					</TabsContent>

					{/* Warehouses Tab */}
					<TabsContent className="space-y-6" value="warehouses">
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
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
