/** biome-ignore-all lint/suspicious/noArrayIndexKey: for skeleton loading */
'use memo';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SkeletonReceptionGroup } from '@/ui/skeletons/Skeleton.ReceptionGroup';

export function SkeletonReceptionDetailsPage() {
	return (
		<div className="theme-transition flex-1 space-y-6 bg-white p-4 md:p-6 dark:bg-[#151718]">
			{/* Breadcrumb skeleton */}
			<div className="h-5">
				<Skeleton className="theme-transition h-5 w-64" />
			</div>

			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-2">
					<Skeleton className="theme-transition h-7 w-72" />
					<Skeleton className="theme-transition h-4 w-80" />
					<Skeleton className="theme-transition h-3 w-56" />
				</div>
				<div className="inline-flex">
					<Skeleton className="theme-transition h-10 w-56" />
				</div>
			</div>

			{/* Progress Card */}
			<Card className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<CardContent className="p-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<Skeleton className="theme-transition h-10 w-10 rounded-lg" />
							<div className="space-y-2">
								<Skeleton className="theme-transition h-4 w-32" />
								<Skeleton className="theme-transition h-6 w-20" />
							</div>
						</div>
						<div className="space-y-2 text-right">
							<Skeleton className="theme-transition ml-auto h-4 w-24" />
							<Skeleton className="theme-transition ml-auto h-6 w-12" />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Items Table */}
			<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<CardHeader>
					<CardTitle className="text-[#11181C] text-transition dark:text-[#ECEDEE]">
						Artículos del envío
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="theme-transition rounded-md border border-[#E5E7EB] dark:border-[#2D3033]">
						<Table>
							<TableHeader>
								<TableRow className="border-[#E5E7EB] border-b hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:hover:bg-[#2D3033]">
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Identificador
									</TableHead>
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Código de barras
									</TableHead>
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Nombre de producto
									</TableHead>
									<TableHead className="font-medium text-[#11181C] text-transition dark:text-[#ECEDEE]">
										Recibido
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{Array.from({ length: 3 }).map((_, i) => (
									<SkeletonReceptionGroup key={i} />
								))}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default SkeletonReceptionDetailsPage;
