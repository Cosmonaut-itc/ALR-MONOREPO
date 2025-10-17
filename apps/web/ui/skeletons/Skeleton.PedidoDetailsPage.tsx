/** biome-ignore-all lint/suspicious/noArrayIndexKey: skeleton placeholders */

import { ArrowLeft, ClipboardList, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
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
 * Skeleton for the replenishment order detail page.
 *
 * Mirrors the header, metadata cards, items table, and fulfillment panel layout.
 */
export function SkeletonPedidoDetailsPage() {
	return (
		<div className="theme-transition flex-1 space-y-6 bg-white p-4 md:p-6 dark:bg-[#151718]">
			{/* Header */}
			<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div className="space-y-2">
					<div className="flex items-center gap-3">
						<Button
							className="h-9 w-9 rounded-lg bg-[#F3F4F6] text-[#11181C] dark:bg-[#1E1F20] dark:text-[#ECEDEE]"
							size="icon"
							variant="ghost"
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<h1 className="font-bold text-2xl text-[#11181C] text-transition dark:text-[#ECEDEE]">
							Detalles del pedido
						</h1>
					</div>
					<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
						Revisa el estado y los artículos solicitados antes de cumplir el pedido.
					</p>
				</div>
				<div className="flex gap-3">
					<Skeleton className="h-10 w-32 rounded-md bg-[#E5E7EB] dark:bg-[#2D3033]" />
					<Skeleton className="h-10 w-32 rounded-md bg-[#E5E7EB] dark:bg-[#2D3033]" />
				</div>
			</div>

			{/* Metadata cards */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="flex items-center gap-4 p-6">
						<div className="rounded-lg bg-[#0a7ea4]/10 p-2">
							<Package className="h-6 w-6 text-[#0a7ea4]" />
						</div>
						<div className="space-y-1">
							<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
								Pedido
							</p>
							<Skeleton className="h-6 w-32" />
						</div>
					</CardContent>
				</Card>
				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="flex items-center gap-4 p-6">
						<div className="rounded-lg bg-orange-500/10 p-2">
							<ClipboardList className="h-6 w-6 text-orange-600" />
						</div>
						<div className="space-y-1">
							<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
								Estado
							</p>
							<Skeleton className="h-6 w-24" />
						</div>
					</CardContent>
				</Card>
				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="space-y-1 p-6">
						<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
							Bodega origen
						</p>
						<Skeleton className="h-6 w-full" />
					</CardContent>
				</Card>
				<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardContent className="space-y-1 p-6">
						<p className="font-medium text-[#687076] text-sm text-transition dark:text-[#9BA1A6]">
							Creado el
						</p>
						<Skeleton className="h-6 w-32" />
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
				{/* Items table */}
				<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardHeader>
						<CardTitle className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
							Artículos solicitados
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="theme-transition rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
							<Table>
								<TableHeader>
									<TableRow className="border-[#E5E7EB] border-b dark:border-[#2D3033]">
										<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
											Código
										</TableHead>
										<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
											Cantidad
										</TableHead>
										<TableHead className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
											Notas
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{Array.from({ length: 4 }).map((_, index) => (
										<TableRow
											className="theme-transition border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]"
											key={index}
										>
											<TableCell>
												<Skeleton className="h-4 w-32" />
											</TableCell>
											<TableCell>
												<Skeleton className="h-4 w-12" />
											</TableCell>
											<TableCell>
												<Skeleton className="h-4 w-48" />
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>

				{/* Fulfillment panel */}
				<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
					<CardHeader>
						<CardTitle className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
							Cumplir pedido
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<Skeleton className="h-10 w-full rounded-md bg-[#E5E7EB] dark:bg-[#2D3033]" />
						<Skeleton className="h-32 w-full rounded-md bg-[#E5E7EB] dark:bg-[#2D3033]" />
						<Skeleton className="h-10 w-full rounded-md bg-[#0a7ea4]/80 dark:bg-[#0a7ea4]" />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export default SkeletonPedidoDetailsPage;
