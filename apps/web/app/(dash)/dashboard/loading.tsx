'use memo';

import { Skeleton } from "@/components/ui/skeleton";

export function DashboardLoadingSkeleton() {
	return (
		<div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
			<div className="space-y-2">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-4 w-64" />
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<div
						className="rounded-lg border border-[#E5E7EB] bg-white p-4 dark:border-[#2D3033] dark:bg-[#151718]"
						key={index}
					>
						<Skeleton className="mb-2 h-4 w-32" />
						<Skeleton className="h-8 w-16" />
					</div>
				))}
			</div>

			<div className="grid gap-4 xl:grid-cols-2">
				{Array.from({ length: 4 }).map((_, index) => (
					<div
						className="rounded-lg border border-[#E5E7EB] bg-white p-4 dark:border-[#2D3033] dark:bg-[#151718]"
						key={`section-${index}`}
					>
						<Skeleton className="mb-3 h-4 w-40" />
						<div className="space-y-2">
							{Array.from({ length: 3 }).map((__, itemIndex) => (
								<div className="flex items-center gap-3" key={itemIndex}>
									<Skeleton className="h-8 w-8 rounded-full" />
									<div className="flex-1 space-y-1">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-3 w-24" />
									</div>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export default function Loading() {
	return <DashboardLoadingSkeleton />;
}
