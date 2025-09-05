/** biome-ignore-all lint/suspicious/noArrayIndexKey: for skeleton loading */
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonCreateTransferPage() {
	return (
		<div className="space-y-4 p-4">
			{/* Header skeleton */}
			<div className="space-y-2">
				<Skeleton className="h-8 w-72 bg-[#F9FAFB] dark:bg-[#2D3033]" />
				<Skeleton className="h-4 w-96 bg-[#F9FAFB] dark:bg-[#2D3033]" />
			</div>

			{/* Action bar skeleton */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-4 w-64 bg-[#F9FAFB] dark:bg-[#2D3033]" />
				<Skeleton className="h-10 w-40 bg-[#F9FAFB] dark:bg-[#2D3033]" />
			</div>

			{/* Table Skeleton reused shape */}
			<Card className="border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<CardHeader className="pb-3">
					<div className="flex space-x-4">
						<Skeleton className="h-4 w-32 bg-[#F9FAFB] dark:bg-[#2D3033]" />
						<Skeleton className="h-4 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
						<Skeleton className="h-4 w-16 bg-[#F9FAFB] dark:bg-[#2D3033]" />
						<Skeleton className="h-4 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
						<Skeleton className="h-4 w-20 bg-[#F9FAFB] dark:bg-[#2D3033]" />
						<Skeleton className="h-4 w-16 bg-[#F9FAFB] dark:bg-[#2D3033]" />
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<div className="flex items-center space-x-4" key={i}>
							<Skeleton className="h-4 w-32 bg-[#F9FAFB] dark:bg-[#2D3033]" />
							<div className="space-y-1">
								<Skeleton className="h-4 w-40 bg-[#F9FAFB] dark:bg-[#2D3033]" />
								<Skeleton className="h-3 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
							</div>
							<Skeleton className="h-4 w-8 bg-[#F9FAFB] dark:bg-[#2D3033]" />
							<Skeleton className="h-4 w-20 bg-[#F9FAFB] dark:bg-[#2D3033]" />
							<Skeleton className="h-4 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
							<Skeleton className="h-6 w-12 rounded-full bg-[#F9FAFB] dark:bg-[#2D3033]" />
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
