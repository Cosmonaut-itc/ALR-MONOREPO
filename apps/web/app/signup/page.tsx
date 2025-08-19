'use client';

import { useForm } from '@tanstack/react-form';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLoginMutation, useSignUpMutation } from '@/lib/mutations/auth';
import { useAuthStore } from '@/stores/auth-store';

export default function SignUpPage() {
	const router = useRouter();
	const form = useForm({
		defaultValues: {
			name: '',
			email: '',
			password: '',
		},
	});

	const { mutateAsync: signUp, isPending: isSigningUp } = useSignUpMutation();
	const { mutateAsync: login, isPending: isLoggingIn, isSuccess } = useLoginMutation();
	const { login: saveSession } = useAuthStore();

	const isPending = isSigningUp || isLoggingIn;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const { name, email, password } = form.state.values;
		try {
			await signUp({ name, email, password });
			const success = await login({ email, password });
			if (isSuccess) {
				toast.success('Cuenta creada y sesión iniciada');
				saveSession(
					success?.data?.user?.id || '',
					success?.data?.user?.email || '',
					success?.data?.user?.name || '',
					'encargado',
				);
				router.push('/dashboard');
			}
		} catch (error) {
			toast.error('No se pudo crear la cuenta');
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
						<div className="space-y-2">
							<CardTitle className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
								Crear Cuenta
							</CardTitle>
							<CardDescription className="text-[#687076] text-transition dark:text-[#9BA1A6]">
								Registra un usuario temporal para acceder al sistema
							</CardDescription>
						</div>
					</CardHeader>

					<CardContent className="space-y-6">
						<form className="space-y-4" onSubmit={handleSubmit}>
							<div className="space-y-2">
								<Label
									className="font-medium text-[#11181C] text-sm text-transition dark:text-[#ECEDEE]"
									htmlFor="name"
								>
									Nombre
								</Label>
								<form.Field
									name="name"
									validators={{
										onChange: ({ value }) =>
											value.trim().length > 0
												? undefined
												: 'El campo es requerido',
									}}
								>
									{(field) => (
										<>
											<Input
												className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:placeholder:text-[#9BA1A6]"
												disabled={isPending}
												id="name"
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
								</form.Field>
							</div>

							<div className="space-y-2">
								<Label
									className="font-medium text-[#11181C] text-sm text-transition dark:text-[#ECEDEE]"
									htmlFor="email"
								>
									Correo Electrónico
								</Label>
								<form.Field
									name="email"
									validators={{
										onChange: ({ value }) =>
											value.trim().length > 0
												? undefined
												: 'El campo es requerido',
									}}
								>
									{(field) => (
										<>
											<Input
												className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
												disabled={isPending}
												id="email"
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
								</form.Field>
							</div>

							<div className="space-y-2">
								<Label
									className="font-medium text-[#11181C] text-sm text-transition dark:text-[#ECEDEE]"
									htmlFor="password"
								>
									Contraseña
								</Label>
								<form.Field
									name="password"
									validators={{
										onChange: ({ value }) =>
											value.trim().length >= 8
												? undefined
												: 'El campo es requerido (mínimo 8 caracteres)',
									}}
								>
									{(field) => (
										<>
											<Input
												className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
												disabled={isPending}
												id="password"
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
								</form.Field>
							</div>

							<div className="space-y-2 pt-2">
								<Button
									className="theme-transition h-11 w-full bg-[#0a7ea4] font-medium text-white hover:bg-[#0a7ea4]/90"
									disabled={isPending}
									type="submit"
								>
									{isPending ? 'Creando cuenta...' : 'Crear Cuenta'}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
