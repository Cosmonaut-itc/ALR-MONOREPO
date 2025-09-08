/** biome-ignore-all lint/suspicious/noArrayIndexKey: skeleton only */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonKitsPage() {
	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<Skeleton className="h-8 w-48 bg-[#F9FAFB] dark:bg-[#2D3033]" />
					<Skeleton className="mt-2 h-4 w-64 bg-[#F9FAFB] dark:bg-[#2D3033]" />
				</div>
				<Skeleton className="h-10 w-40 bg-[#F9FAFB] dark:bg-[#2D3033]" />
			</div>

			{/* Top Bar */}
			<div className="flex items-center gap-4">
				<Skeleton className="h-10 w-[240px] bg-[#F9FAFB] dark:bg-[#2D3033]" />
			</div>

			{/* Statistics Cards */}
			<div className="grid gap-4 md:grid-cols-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<Card className="card-transition" key={`stat-${i}`}>
						<CardHeader className="pb-2">
							<CardTitle>
								<Skeleton className="h-4 w-28 bg-[#F9FAFB] dark:bg-[#2D3033]" />
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Skeleton className="h-7 w-16 bg-[#F9FAFB] dark:bg-[#2D3033]" />
							<Skeleton className="mt-2 h-3 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
						</CardContent>
					</Card>
				))}
			</div>

			{/* Kits Grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<Card className="card-transition" key={`kit-${i}`}>
						<CardHeader>
							<div className="flex items-center gap-3">
								<Skeleton className="h-10 w-10 rounded-full bg-[#F9FAFB] dark:bg-[#2D3033]" />
								<div className="flex-1">
									<Skeleton className="h-4 w-40 bg-[#F9FAFB] dark:bg-[#2D3033]" />
									<Skeleton className="mt-2 h-3 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<Skeleton className="h-4 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
							<Skeleton className="mt-2 h-4 w-20 bg-[#F9FAFB] dark:bg-[#2D3033]" />
							<Skeleton className="mt-2 h-4 w-32 bg-[#F9FAFB] dark:bg-[#2D3033]" />
							<Skeleton className="mt-4 h-8 w-full bg-[#F9FAFB] dark:bg-[#2D3033]" />
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
