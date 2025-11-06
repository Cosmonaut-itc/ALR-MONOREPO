/** biome-ignore-all lint/suspicious/noArrayIndexKey: skeleton placeholders */

'use memo';
import { Building2, Package, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

/**
 * Skeleton loading UI for the Pedidos (replenishment orders) list page.
 *
 * Displays a header, quick stats cards, action bar placeholders, and a table shell
 * while the actual data loads.
 */
export function SkeletonPedidosPage() {
	return (
		<div className="theme-transition flex-1 space-y-6 bg-white p-4 md:p-6 dark:bg-[#151718]">
			{/* Header */}
			<div className="space-y-2">
				<h1 className="font-bold text-2xl text-[#11181C] text-transition md:text-3xl dark:text-[#ECEDEE]">
					Pedidos
				</h1>
				<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
					Gestiona las solicitudes de reabastecimiento para las sucursales.
				</p>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="p-6">
						<div className="flex items-center gap-4">
							<div className="rounded-lg bg-[#0a7ea4]/10 p-2">
								<Package className="h-6 w-6 text-[#0a7ea4]" />
							</div>
							<div className="space-y-1">
								<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
									Pedidos abiertos
								</p>
								<Skeleton className="h-7 w-12" />
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="p-6">
						<div className="flex items-center gap-4">
							<div className="rounded-lg bg-emerald-500/10 p-2">
								<Building2 className="h-6 w-6 text-emerald-600" />
							</div>
							<div className="space-y-1">
								<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
									En tránsito
								</p>
								<Skeleton className="h-7 w-12" />
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="p-6">
						<div className="flex items-center gap-4">
							<div className="rounded-lg bg-blue-500/10 p-2">
								<Plus className="h-6 w-6 text-blue-600" />
							</div>
							<div className="space-y-1">
								<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
									Nuevos hoy
								</p>
								<Skeleton className="h-7 w-16" />
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters & Actions */}
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<Skeleton className="h-10 w-full rounded-md bg-[#E5E7EB] dark:bg-[#2D3033] md:max-w-xs" />
				<div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
					<Skeleton className="h-10 w-full rounded-md bg-[#E5E7EB] dark:bg-[#2D3033] sm:w-40" />
					<Skeleton className="h-10 w-full rounded-md bg-[#E5E7EB] dark:bg-[#2D3033] sm:w-36" />
					<Skeleton className="h-10 w-full rounded-md bg-[#0a7ea4]/80 dark:bg-[#0a7ea4] sm:w-40" />
				</div>
			</div>

			{/* Table */}
			<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<CardHeader>
					<CardTitle className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
						Lista de pedidos
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="theme-transition rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
						<Table>
							<TableHeader>
								<TableRow className="border-[#E5E7EB] border-b dark:border-[#2D3033]">
									<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Pedido
									</TableHead>
									<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Bodega
									</TableHead>
									<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Artículos
									</TableHead>
									<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Creado
									</TableHead>
									<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Estado
									</TableHead>
									<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Acciones
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{Array.from({ length: 5 }).map((_, index) => (
									<TableRow
										className="theme-transition border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]"
										key={index}
									>
										<TableCell>
											<Skeleton className="h-4 w-32" />
										</TableCell>
										<TableCell>
											<Skeleton className="h-4 w-40" />
										</TableCell>
										<TableCell>
											<Skeleton className="h-4 w-16" />
										</TableCell>
										<TableCell>
											<Skeleton className="h-4 w-24" />
										</TableCell>
										<TableCell>
											<Skeleton className="h-6 w-24 rounded-full" />
										</TableCell>
										<TableCell>
											<Skeleton className="h-8 w-24 rounded-md" />
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

export default SkeletonPedidosPage;
