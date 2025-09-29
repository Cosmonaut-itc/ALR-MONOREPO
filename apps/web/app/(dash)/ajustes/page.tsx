"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSignUpMutation, useUpdateUserMutation } from "@/lib/mutations/auth";
import { useCreateWarehouseMutation } from "@/lib/mutations/warehouses";

/**
 * Settings page component that renders tabbed forms for managing users and warehouses.
 *
 * This component provides two main tabs:
 * 1. Users Tab - Contains forms to create and update users
 * 2. Warehouses Tab - Contains form to create warehouses
 *
 * Each form uses TanStack Form for client-side validation and React Query mutations
 * for server communication. Success/error states are communicated via toast notifications.
 *
 * UI notes:
 * - All inputs are disabled while their respective mutation is pending.
 * - Buttons display loading text when creating/updating.
 * - Router refresh is called after successful mutations to update the UI.
 *
 * @returns The SettingsPage JSX element.
 */
export default function SettingsPage() {
	const router = useRouter();

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
			role: "",
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
			const { userId, role, warehouseId } = updateUserForm.state.values;

			// Validate that userId is provided
			if (!userId.trim()) {
				toast.error("El ID de usuario es obligatorio");
				return;
			}

			// Validate that at least one field is being updated
			if (!role && !warehouseId) {
				toast.error(
					"Debes proporcionar al menos un campo para actualizar (rol o bodega)",
				);
				return;
			}

			// Build payload with only provided fields
			const payload: {
				userId: string;
				role: "employee" | "encargado";
				warehouseId?: string;
			} = {
				userId: userId.trim(),
				role: "employee",
			};

			if (role) {
				payload.role = role as "employee" | "encargado";
			}

			if (warehouseId.trim()) {
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

						{/* Update User Card */}
						<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
							<CardHeader>
								<CardTitle className="text-[#11181C] dark:text-[#ECEDEE]">
									Actualizar usuario
								</CardTitle>
								<CardDescription className="text-[#687076] dark:text-[#9BA1A6]">
									Modifica el rol y/o la bodega asignada a un usuario existente
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form className="space-y-4" onSubmit={handleUpdateUserSubmit}>
									<div className="space-y-2">
										<Label
											className="text-[#11181C] dark:text-[#ECEDEE]"
											htmlFor="update-user-id"
										>
											ID de Usuario
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
													<Input
														className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
														disabled={isUpdatingUser}
														id="update-user-id"
														name={field.name}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														placeholder="user_abc123"
														value={field.state.value}
													/>
													{!field.state.meta.isValid && (
														<em className="mt-1 text-red-500 text-xs">
															{field.state.meta.errors.join(",")}
														</em>
													)}
												</>
											)}
										</updateUserForm.Field>
									</div>

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
													onValueChange={field.handleChange}
													value={field.state.value}
												>
													<SelectTrigger
														className="input-transition border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
														id="update-user-role"
													>
														<SelectValue placeholder="Seleccionar rol" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="encargado">Encargado</SelectItem>
														<SelectItem value="admin">Admin</SelectItem>
													</SelectContent>
												</Select>
											)}
										</updateUserForm.Field>
									</div>

									<div className="space-y-2">
										<Label
											className="text-[#11181C] dark:text-[#ECEDEE]"
											htmlFor="update-user-warehouse"
										>
											ID de Bodega (opcional)
										</Label>
										<updateUserForm.Field name="warehouseId">
											{(field) => (
												<Input
													className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
													disabled={isUpdatingUser}
													id="update-user-warehouse"
													name={field.name}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder="123e4567-e89b-12d3-a456-426614174000"
													value={field.state.value}
												/>
											)}
										</updateUserForm.Field>
									</div>

									<div className="rounded-md border border-amber-500/20 bg-amber-50 p-3 dark:bg-amber-950/20">
										<p className="text-amber-800 text-xs dark:text-amber-300">
											<strong>Nota:</strong> Debes proporcionar al menos el rol
											o el ID de bodega para actualizar el usuario.
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
