/** biome-ignore-all lint/suspicious/noArrayIndexKey: used of index for skeleton cards */
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';

export default function DashboardPage() {
	const { user } = useAuthStore();

	return (
		<div className="theme-transition flex-1 space-y-6 bg-white p-4 md:p-6 dark:bg-[#151718]">
			<div className="space-y-2">
				<h1 className="font-bold text-2xl text-[#11181C] text-transition md:text-3xl dark:text-[#ECEDEE]">
					Dashboard
				</h1>
				<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
					Bienvenido de vuelta, {user?.name || 'Usuario'}
				</p>
			</div>

			<div className="grid auto-rows-min gap-4 md:grid-cols-3">
				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardHeader>
						<CardTitle className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
							Inventario Total
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl text-[#0a7ea4]">1,234</div>
						<p className="text-[#687076] text-transition text-xs dark:text-[#9BA1A6]">
							productos en stock
						</p>
					</CardContent>
				</Card>

				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardHeader>
						<CardTitle className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
							Transferencias Hoy
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl text-[#0a7ea4]">23</div>
						<p className="text-[#687076] text-transition text-xs dark:text-[#9BA1A6]">
							movimientos registrados
						</p>
					</CardContent>
				</Card>

				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardHeader>
						<CardTitle className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
							Empleados Activos
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl text-[#0a7ea4]">12</div>
						<p className="text-[#687076] text-transition text-xs dark:text-[#9BA1A6]">
							usuarios conectados
						</p>
					</CardContent>
				</Card>
			</div>

			<div className="theme-transition min-h-[100vh] flex-1 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-6 md:min-h-min dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<h2 className="mb-4 font-semibold text-[#11181C] text-transition text-xl dark:text-[#ECEDEE]">
					Actividad Reciente
				</h2>
				<div className="space-y-4">
					{[
						'Transferencia de Martillo Profesional a Almacén B',
						'Recepción de 50 Destornilladores Eléctricos',
						'Kit de Herramientas #123 asignado a Carlos Rodríguez',
						'Inventario actualizado: +25 Taladros Inalámbricos',
					].map((activity, index) => (
						<div
							className="theme-transition flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-white p-3 dark:border-[#2D3033] dark:bg-[#151718]"
							key={index}
						>
							<div className="h-2 w-2 rounded-full bg-[#0a7ea4]" />
							<span className="text-[#11181C] text-sm text-transition dark:text-[#ECEDEE]">
								{activity}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
