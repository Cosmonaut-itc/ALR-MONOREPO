/** biome-ignore-all lint/suspicious/noArrayIndexKey: skeleton only */
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function SkeletonKitDetailsPage() {
	return (
		<div className="space-y-6 p-4 md:p-6">
			{/* Breadcrumb + Header */}
			<div className="space-y-2">
				<Skeleton className="h-4 w-40 bg-[#F9FAFB] dark:bg-[#2D3033]" />
				<Skeleton className="h-8 w-72 bg-[#F9FAFB] dark:bg-[#2D3033]" />
				<Skeleton className="h-4 w-56 bg-[#F9FAFB] dark:bg-[#2D3033]" />
			</div>

			{/* Progress Card */}
			<Card className="border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<CardContent className="p-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<Skeleton className="h-10 w-10 rounded-lg bg-[#F9FAFB] dark:bg-[#2D3033]" />
							<div className="space-y-2">
								<Skeleton className="h-3 w-40 bg-[#F9FAFB] dark:bg-[#2D3033]" />
								<Skeleton className="h-6 w-28 bg-[#F9FAFB] dark:bg-[#2D3033]" />
							</div>
						</div>
						<div className="space-y-2">
							<Skeleton className="h-3 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
							<Skeleton className="h-6 w-16 bg-[#F9FAFB] dark:bg-[#2D3033]" />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Table Skeleton */}
			<Card className="border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<CardHeader>
					<Skeleton className="h-5 w-40 bg-[#F9FAFB] dark:bg-[#2D3033]" />
				</CardHeader>
				<CardContent className="space-y-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<div className="flex items-center justify-between" key={`row-${i}`}>
							<Skeleton className="h-4 w-40 bg-[#F9FAFB] dark:bg-[#2D3033]" />
							<Skeleton className="h-4 w-24 bg-[#F9FAFB] dark:bg-[#2D3033]" />
							<Skeleton className="h-4 w-56 bg-[#F9FAFB] dark:bg-[#2D3033]" />
							<Skeleton className="h-5 w-5 rounded bg-[#F9FAFB] dark:bg-[#2D3033]" />
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
