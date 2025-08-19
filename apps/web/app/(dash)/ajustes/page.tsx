'use client';

import { useForm } from '@tanstack/react-form';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSignUpMutation } from '@/lib/mutations/auth';

export default function SettingsPage() {
	const router = useRouter();
	const form = useForm({
		defaultValues: {
			name: '',
			email: '',
			password: '',
		},
	});

	const { mutateAsync, isPending } = useSignUpMutation();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const { name, email, password } = form.state.values;
			const response = await mutateAsync({ name, email, password });
			if (response?.data?.user?.id) {
				toast.success('Usuario creado correctamente');
				form.reset();
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

	return (
		<div className="theme-transition p-4 md:p-8">
			<div className="mx-auto w-full max-w-3xl">
				<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardHeader>
						<CardTitle className="text-[#11181C] dark:text-[#ECEDEE]">
							Ajustes
						</CardTitle>
						<CardDescription className="text-[#687076] dark:text-[#9BA1A6]">
							Crear usuario nuevo
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form className="space-y-4" onSubmit={handleSubmit}>
							<div className="space-y-2">
								<Label
									className="text-[#11181C] dark:text-[#ECEDEE]"
									htmlFor="name"
								>
									Nombre
								</Label>
								<form.Field
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
									className="text-[#11181C] dark:text-[#ECEDEE]"
									htmlFor="email"
								>
									Correo
								</Label>
								<form.Field
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
									className="text-[#11181C] dark:text-[#ECEDEE]"
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
												: 'Mínimo 8 caracteres',
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

							<div className="pt-2">
								<Button
									className="theme-transition h-11 bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90"
									disabled={isPending}
									type="submit"
								>
									{isPending ? 'Creando usuario...' : 'Crear Usuario'}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
