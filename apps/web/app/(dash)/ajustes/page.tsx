'use client';

import { useForm } from '@tanstack/react-form';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSignUpMutation } from '@/lib/mutations/auth';
import { useCreateWarehouseMutation } from '@/lib/mutations/warehouses';

/**
 * Settings page component that renders forms to create users and warehouses.
 *
 * Renders two independent forms (Create User and Create Warehouse) with client-side
 * validation using react-form. Submitting the user form calls the sign-up mutation;
 * on success it shows a success toast, resets the form, and refreshes the router.
 * If the user response lacks an ID it shows an informational toast; on failure it
 * shows an error toast and logs the error. Submitting the warehouse form trims input,
 * validates that name and code are present, and calls the create-warehouse mutation;
 * on success it resets the form and refreshes the router. The warehouse mutation is
 * responsible for its own error/toast handling.
 *
 * UI notes:
 * - Inputs are disabled while their respective mutation is pending.
 * - Buttons display loading text when creating.
 *
 * @returns The SettingsPage JSX element.
 */
export default function SettingsPage() {
	const router = useRouter();
	const userForm = useForm({
		defaultValues: {
			name: '',
			email: '',
			password: '',
		},
	});
	const warehouseForm = useForm({
		defaultValues: {
			name: '',
			code: '',
			description: '',
		},
	});

	const { mutateAsync: createUser, isPending: isCreatingUser } = useSignUpMutation();
	const { mutateAsync: createWarehouse, isPending: isCreatingWarehouse } =
		useCreateWarehouseMutation();

	const handleUserSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const { name, email, password } = userForm.state.values;
			const response = await createUser({ name, email, password });
			if (response?.data?.user?.id) {
				toast.success('Usuario creado correctamente');
				userForm.reset();
				router.refresh();
			} else {
				toast.info('Solicitud enviada. Revisa el correo de verificación si aplica.');
			}
		} catch (error) {
			toast.error('No se pudo crear el usuario');
			// biome-ignore lint/suspicious/noConsole: logging
			console.error(error);
		}
	};

	const handleWarehouseSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const { name, code, description } = warehouseForm.state.values;
		const payload = {
			name: name.trim(),
			code: code.trim(),
			...(description.trim() ? { description: description.trim() } : {}),
		};
		if (!payload.name || !payload.code) {
			toast.error('Nombre y código son obligatorios');
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
			<div className="mx-auto w-full max-w-3xl space-y-8">
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
											value.trim().length > 0 ? undefined : 'Requerido',
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
													{field.state.meta.errors.join(',')}
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
											value.trim().length > 0 ? undefined : 'Requerido',
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
													{field.state.meta.errors.join(',')}
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
												: 'Mínimo 8 caracteres',
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
													{field.state.meta.errors.join(',')}
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
									{isCreatingUser ? 'Creando usuario...' : 'Crear Usuario'}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>

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
											value.trim().length > 0 ? undefined : 'Requerido',
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
													{field.state.meta.errors.join(',')}
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
											value.trim().length > 0 ? undefined : 'Requerido',
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
													{field.state.meta.errors.join(',')}
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
									{isCreatingWarehouse ? 'Creando bodega...' : 'Crear Bodega'}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
