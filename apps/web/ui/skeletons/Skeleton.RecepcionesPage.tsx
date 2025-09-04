/** biome-ignore-all lint/suspicious/noArrayIndexKey: for skeleton loading */

import { Calendar, CheckCircle, Clock, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

export function SkeletonRecepcionesPage() {
	return (
		<div className="theme-transition flex-1 space-y-6 bg-white p-4 md:p-6 dark:bg-[#151718]">
			{/* Header */}
			<div className="space-y-2">
				<h1 className="font-bold text-2xl text-[#11181C] text-transition md:text-3xl dark:text-[#ECEDEE]">
					Recepciones pendientes
				</h1>
				<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
					Gestiona las recepciones desde el centro de distribución
				</p>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="p-6">
						<div className="flex items-center space-x-4">
							<div className="rounded-lg bg-orange-500/10 p-2">
								<Clock className="h-6 w-6 text-orange-600" />
							</div>
							<div className="flex-1 space-y-1">
								<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
									Pendientes
								</p>
								<p className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
									<Skeleton className="h-7 w-10" />
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="p-6">
						<div className="flex items-center space-x-4">
							<div className="rounded-lg bg-green-500/10 p-2">
								<CheckCircle className="h-6 w-6 text-green-600" />
							</div>
							<div className="flex-1 space-y-1">
								<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
									Completadas
								</p>
								<p className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
									<Skeleton className="h-7 w-10" />
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="p-6">
						<div className="flex items-center space-x-4">
							<div className="rounded-lg bg-[#0a7ea4]/10 p-2">
								<Package className="h-6 w-6 text-[#0a7ea4]" />
							</div>
							<div className="flex-1 space-y-1">
								<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
									Total items
								</p>
								<p className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
									<Skeleton className="h-7 w-16" />
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="p-6">
						<div className="flex items-center space-x-4">
							<div className="rounded-lg bg-blue-500/10 p-2">
								<Calendar className="h-6 w-6 text-blue-600" />
							</div>
							<div className="flex-1 space-y-1">
								<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
									Hoy
								</p>
								<p className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
									<Skeleton className="h-7 w-10" />
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Receptions Table */}
			<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<CardHeader>
					<CardTitle className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
						Lista de recepciones
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="theme-transition rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
						<Table>
							<TableHeader>
								<TableRow className="border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]">
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Nº de envío
									</TableHead>
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Fecha de llegada
									</TableHead>
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Total de ítems
									</TableHead>
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Estado
									</TableHead>
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Acción
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{Array.from({ length: 5 }).map((_, index) => (
									<TableRow
										className="theme-transition border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]"
										key={index}
									>
										<TableCell className="font-mono text-[#11181C] text-sm text-transition dark:text-[#ECEDEE]">
											<Skeleton className="h-4 w-28" />
										</TableCell>
										<TableCell className="text-[#687076] text-transition dark:text-[#9BA1A6]">
											<Skeleton className="h-4 w-24" />
										</TableCell>
										<TableCell className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
											<Skeleton className="h-4 w-10" />
										</TableCell>
										<TableCell>
											<div className="inline-flex">
												<Skeleton className="h-6 w-20 rounded-full" />
											</div>
										</TableCell>
										<TableCell>
											<div className="inline-flex">
												<Skeleton className="h-8 w-24" />
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default SkeletonRecepcionesPage;
