/** biome-ignore-all lint/correctness/noChildrenProp: Needed for form usage */
'use client';

import { useForm } from '@tanstack/react-form';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLoginMutation } from '@/lib/mutations/auth';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginPage() {
	const router = useRouter();
	const form = useForm({
		defaultValues: {
			emailOrUsername: '',
			password: '',
		},
	});
	const { login } = useAuthStore();
	const { mutateAsync, isSuccess, isPending } = useLoginMutation();

	const [showPassword, setShowPassword] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			const success = await mutateAsync({
				email: form.state.values.emailOrUsername,
				password: form.state.values.password,
			});

			if (isSuccess) {
				toast.success('¡Bienvenido! Inicio de sesión exitoso');
				login(
					success?.data?.user?.id || '',
					success?.data?.user?.email || '',
					success?.data?.user?.name || '',
					'encargado',
				);
				router.push('/dashboard');
			}
		} catch (error) {
			toast.error('Error de autenticación: Credenciales inválidas. Intenta de nuevo.');
			// biome-ignore lint/suspicious/noConsole: Needed for error logging
			console.error(error);
		}
	};

	return (
		<div className="theme-transition flex min-h-screen items-center justify-center bg-white p-4 dark:bg-[#151718]">
			<div className="w-full max-w-md">
				<div className="absolute top-4 right-4">
					<ThemeToggle />
				</div>

				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] shadow-lg dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardHeader className="space-y-4 text-center">
						<div className="flex justify-center">
							<div className="theme-transition flex h-12 w-12 items-center justify-center rounded-full bg-[#0a7ea4]">
								<Lock className="icon-transition h-6 w-6 text-white" />
							</div>
						</div>
						<div className="space-y-2">
							<CardTitle className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
								Iniciar Sesión
							</CardTitle>
							<CardDescription className="text-[#687076] text-transition dark:text-[#9BA1A6]">
								Ingresa tus credenciales para acceder al sistema de inventario
							</CardDescription>
						</div>
					</CardHeader>

					<CardContent className="space-y-6">
						<form className="space-y-4" onSubmit={handleSubmit}>
							<div className="space-y-2">
								<Label
									className="font-medium text-[#11181C] text-sm text-transition dark:text-[#ECEDEE]"
									htmlFor="emailOrUsername"
								>
									Correo Electrónico / Usuario
								</Label>
								<div className="relative">
									<form.Field
										children={(field) => (
											<>
												<Input
													className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
													disabled={isPending}
													id="emailOrUsername"
													name={field.name}
													onBlur={field.handleBlur}
													onChange={(e) =>
														field.handleChange(e.target.value)
													}
													placeholder="correo@ejemplo.com o usuario123"
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
										name="emailOrUsername"
										validators={{
											// We can choose between form-wide and field-specific validators
											onChange: ({ value }) => {
												return value.length > 0
													? undefined
													: 'El campo es requerido';
											},
										}}
									/>
								</div>
							</div>

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
													onChange={(e) =>
														field.handleChange(e.target.value)
													}
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
											// We can choose between form-wide and field-specific validators
											onChange: ({ value }) => {
												return value.length > 0
													? undefined
													: 'El campo es requerido';
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

							<div className="space-y-4">
								<Button
									className="theme-transition h-11 w-full bg-[#0a7ea4] font-medium text-white hover:bg-[#0a7ea4]/90"
									disabled={isPending}
									type="submit"
								>
									{isPending ? 'Iniciando sesión...' : 'Iniciar Sesión'}
								</Button>

								<div className="text-center">
									<Button
										className="theme-transition h-auto p-0 font-normal text-[#0a7ea4] text-sm hover:text-[#0a7ea4]/90"
										disabled={isPending}
										variant="link"
									>
										¿Olvidaste tu contraseña?
									</Button>
								</div>
							</div>
						</form>

						{/* Demo credentials info */}
						<div className="mt-6 rounded-md border border-[#0a7ea4]/20 bg-[#0a7ea4]/5 p-4">
							<p className="text-center text-[#687076] text-xs dark:text-[#9BA1A6]">
								<strong>Demo:</strong> Usa cualquier email y contraseña de 6+
								caracteres
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
