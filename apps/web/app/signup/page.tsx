/** biome-ignore-all lint/correctness/noChildrenProp: Needed for form usage */
'use client';

import { useForm } from '@tanstack/react-form';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSignUpMutation } from '@/lib/mutations/auth';

/**
 * Render a development-only user sign-up page with client-side validation and account creation.
 *
 * The component redirects to the login page and displays a toast if accessed in production,
 * and renders a form that validates name, email, password, and confirmation before calling
 * the sign-up mutation in development mode.
 *
 * @returns The sign-up page UI when NODE_ENV is not "production"; `null` in production.
 */
export default function SignUpPage() {
	const router = useRouter();
	const form = useForm({
		defaultValues: {
			name: '',
			email: '',
			password: '',
			confirmPassword: '',
		},
	});
	const { mutateAsync, isPending } = useSignUpMutation();

	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	/**
	 * Redirect to dashboard if attempting to access in production
	 * This page should only be available in development mode
	 */
	useEffect(() => {
		if (process.env.NODE_ENV === 'production') {
			toast.error('Esta página solo está disponible en modo desarrollo');
			router.push('/login');
		}
	}, [router]);

	/**
	 * Handles form submission for user sign-up
	 * Validates password confirmation and creates a new user account
	 * 
	 * @param e - The form submission event
	 */
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate password confirmation
		if (form.state.values.password !== form.state.values.confirmPassword) {
			toast.error('Las contraseñas no coinciden');
			return;
		}

		try {
			await mutateAsync({
				name: form.state.values.name,
				email: form.state.values.email,
				password: form.state.values.password,
			});

			toast.success('¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.');
			router.push('/login');
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: 'Error al crear la cuenta. Intenta de nuevo.';
			toast.error(errorMessage);
			// biome-ignore lint/suspicious/noConsole: Needed for error logging in development
			console.error(error);
		}
	};

	// Don't render anything in production until redirect happens
	if (process.env.NODE_ENV === 'production') {
		return null;
	}

	return (
		<div className="theme-transition flex min-h-screen items-center justify-center bg-white p-4 dark:bg-[#151718]">
			<div className="w-full max-w-md">
				<div className="absolute top-4 right-4">
					<ThemeToggle />
				</div>

				{/* Development mode warning banner */}
				<div className="mb-4 rounded-lg border-2 border-amber-500 bg-amber-50 p-3 dark:bg-amber-950/20">
					<p className="text-center font-semibold text-amber-800 text-sm dark:text-amber-300">
						⚠️ SOLO DESARROLLO - Esta página no está disponible en producción
					</p>
				</div>

				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] shadow-lg dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardHeader className="space-y-4 text-center">
						<div className="flex justify-center">
							<div className="theme-transition flex h-12 w-12 items-center justify-center rounded-full bg-[#0a7ea4]">
								<UserPlus className="icon-transition h-6 w-6 text-white" />
							</div>
						</div>
						<div className="space-y-2">
							<CardTitle className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
								Crear Cuenta
							</CardTitle>
							<CardDescription className="text-[#687076] text-transition dark:text-[#9BA1A6]">
								Crea una nueva cuenta de usuario para acceder al sistema
							</CardDescription>
						</div>
					</CardHeader>

					<CardContent className="space-y-6">
						<form className="space-y-4" onSubmit={handleSubmit}>
							{/* Name field */}
							<div className="space-y-2">
								<Label
									className="font-medium text-[#11181C] text-sm text-transition dark:text-[#ECEDEE]"
									htmlFor="name"
								>
									Nombre Completo
								</Label>
								<div className="relative">
									<form.Field
										children={(field) => (
											<>
												<Input
													className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
													disabled={isPending}
													id="name"
													name={field.name}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder="Juan Pérez"
													required
													type="text"
													value={field.state.value}
												/>
												{!field.state.meta.isValid && (
													<em className="mt-1 text-red-500 text-xs">
														{field.state.meta.errors.join(',')}
													</em>
												)}
											</>
										)}
										name="name"
										validators={{
											onChange: ({ value }) => {
												if (value.length === 0) {
													return 'El nombre es requerido';
												}
												if (value.length < 3) {
													return 'El nombre debe tener al menos 3 caracteres';
												}
												return undefined;
											},
										}}
									/>
								</div>
							</div>

							{/* Email field */}
							<div className="space-y-2">
								<Label
									className="font-medium text-[#11181C] text-sm text-transition dark:text-[#ECEDEE]"
									htmlFor="email"
								>
									Correo Electrónico
								</Label>
								<div className="relative">
									<form.Field
										children={(field) => (
											<>
												<Input
													className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
													disabled={isPending}
													id="email"
													name={field.name}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder="correo@ejemplo.com"
													required
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
										name="email"
										validators={{
											onChange: ({ value }) => {
												if (value.length === 0) {
													return 'El correo electrónico es requerido';
												}
												// Basic email validation
												const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
												if (!emailRegex.test(value)) {
													return 'Correo electrónico inválido';
												}
												return undefined;
											},
										}}
									/>
								</div>
							</div>

							{/* Password field */}
							<div className="space-y-2">
								<Label
									className="font-medium text-[#11181C] text-sm text-transition dark:text-[#ECEDEE]"
									htmlFor="password"
								>
									Contraseña
								</Label>
								<div className="relative">
									<form.Field
										children={(field) => (
											<>
												<Input
													className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
													disabled={isPending}
													id="password"
													name={field.name}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder="********"
													required
													type={showPassword ? 'text' : 'password'}
													value={field.state.value}
												/>
												{!field.state.meta.isValid && (
													<em className="mt-1 text-red-500 text-xs">
														{field.state.meta.errors.join(',')}
													</em>
												)}
											</>
										)}
										name="password"
										validators={{
											onChange: ({ value }) => {
												if (value.length === 0) {
													return 'La contraseña es requerida';
												}
												if (value.length < 8) {
													return 'La contraseña debe tener al menos 8 caracteres';
												}
												return undefined;
											},
										}}
									/>
									<Button
										className="theme-transition absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
										disabled={isPending}
										onClick={() => setShowPassword(!showPassword)}
										size="sm"
										type="button"
										variant="ghost"
									>
										{showPassword ? (
											<EyeOff className="icon-transition h-4 w-4 text-[#687076] dark:text-[#9BA1A6]" />
										) : (
											<Eye className="icon-transition h-4 w-4 text-[#687076] dark:text-[#9BA1A6]" />
										)}
										<span className="sr-only">
											{showPassword
												? 'Ocultar contraseña'
												: 'Mostrar contraseña'}
										</span>
									</Button>
								</div>
							</div>

							{/* Confirm Password field */}
							<div className="space-y-2">
								<Label
									className="font-medium text-[#11181C] text-sm text-transition dark:text-[#ECEDEE]"
									htmlFor="confirmPassword"
								>
									Confirmar Contraseña
								</Label>
								<div className="relative">
									<form.Field
										children={(field) => (
											<>
												<Input
													className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
													disabled={isPending}
													id="confirmPassword"
													name={field.name}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder="********"
													required
													type={showConfirmPassword ? 'text' : 'password'}
													value={field.state.value}
												/>
												{!field.state.meta.isValid && (
													<em className="mt-1 text-red-500 text-xs">
														{field.state.meta.errors.join(',')}
													</em>
												)}
											</>
										)}
										name="confirmPassword"
										validators={{
											onChange: ({ value }) => {
												if (value.length === 0) {
													return 'Debes confirmar la contraseña';
												}
												// Check if passwords match
												if (
													form.state.values.password &&
													value !== form.state.values.password
												) {
													return 'Las contraseñas no coinciden';
												}
												return undefined;
											},
										}}
									/>
									<Button
										className="theme-transition absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
										disabled={isPending}
										onClick={() => setShowConfirmPassword(!showConfirmPassword)}
										size="sm"
										type="button"
										variant="ghost"
									>
										{showConfirmPassword ? (
											<EyeOff className="icon-transition h-4 w-4 text-[#687076] dark:text-[#9BA1A6]" />
										) : (
											<Eye className="icon-transition h-4 w-4 text-[#687076] dark:text-[#9BA1A6]" />
										)}
										<span className="sr-only">
											{showConfirmPassword
												? 'Ocultar contraseña'
												: 'Mostrar contraseña'}
										</span>
									</Button>
								</div>
							</div>

							<div className="space-y-4">
								<Button
									className="theme-transition h-11 w-full bg-[#0a7ea4] font-medium text-white hover:bg-[#0a7ea4]/90"
									disabled={isPending}
									type="submit"
								>
									{isPending ? 'Creando cuenta...' : 'Crear Cuenta'}
								</Button>

								<div className="text-center">
									<Button
										className="theme-transition h-auto p-0 font-normal text-[#0a7ea4] text-sm hover:text-[#0a7ea4]/90"
										disabled={isPending}
										onClick={() => router.push('/login')}
										type="button"
										variant="link"
									>
										¿Ya tienes una cuenta? Inicia sesión
									</Button>
								</div>
							</div>
						</form>

						{/* Development info */}
						<div className="mt-6 rounded-md border border-[#0a7ea4]/20 bg-[#0a7ea4]/5 p-4">
							<p className="text-center text-[#687076] text-xs dark:text-[#9BA1A6]">
								<strong>Nota:</strong> Esta página es solo para crear cuentas de
								desarrollo. En producción, los usuarios deben ser creados por un
								administrador.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
