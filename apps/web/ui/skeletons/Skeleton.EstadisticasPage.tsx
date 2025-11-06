/** biome-ignore-all lint/suspicious/noArrayIndexKey: skeleton placeholders */
"use memo";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonEstadisticasPage() {
	return (
		<div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
			<header className="space-y-2">
				<Skeleton className="h-8 w-64 bg-[#F3F4F6] dark:bg-[#2D3033]" />
				<Skeleton className="h-4 w-80 bg-[#F3F4F6] dark:bg-[#2D3033]" />
			</header>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				<Skeleton className="h-10 w-full bg-[#F3F4F6] dark:bg-[#2D3033]" />
				<Skeleton className="h-10 w-full bg-[#F3F4F6] dark:bg-[#2D3033]" />
				<Skeleton className="h-10 w-full bg-[#F3F4F6] dark:bg-[#2D3033]" />
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<Card className="card-transition" key={index}>
						<CardContent className="space-y-3 p-6">
							<Skeleton className="h-4 w-24 bg-[#F3F4F6] dark:bg-[#2D3033]" />
							<Skeleton className="h-8 w-16 bg-[#F3F4F6] dark:bg-[#2D3033]" />
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid gap-4 xl:grid-cols-2">
				<Card className="card-transition">
					<CardHeader>
						<CardTitle>
							<Skeleton className="h-5 w-48 bg-[#F3F4F6] dark:bg-[#2D3033]" />
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{Array.from({ length: 4 }).map((_, index) => (
							<div className="flex items-center justify-between" key={index}>
								<Skeleton className="h-4 w-40 bg-[#F3F4F6] dark:bg-[#2D3033]" />
								<Skeleton className="h-4 w-12 bg-[#F3F4F6] dark:bg-[#2D3033]" />
							</div>
						))}
					</CardContent>
				</Card>
				<Card className="card-transition">
					<CardHeader>
						<CardTitle>
							<Skeleton className="h-5 w-44 bg-[#F3F4F6] dark:bg-[#2D3033]" />
						</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-3">
						{Array.from({ length: 3 }).map((_, index) => (
							<div className="flex items-center gap-3" key={index}>
								<Skeleton className="h-10 w-10 rounded-full bg-[#F3F4F6] dark:bg-[#2D3033]" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-32 bg-[#F3F4F6] dark:bg-[#2D3033]" />
									<Skeleton className="h-3 w-24 bg-[#F3F4F6] dark:bg-[#2D3033]" />
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 xl:grid-cols-2">
				<Card className="card-transition">
					<CardHeader>
						<CardTitle>
							<Skeleton className="h-5 w-52 bg-[#F3F4F6] dark:bg-[#2D3033]" />
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{Array.from({ length: 5 }).map((_, index) => (
							<div className="flex items-center justify-between" key={index}>
								<Skeleton className="h-4 w-32 bg-[#F3F4F6] dark:bg-[#2D3033]" />
								<Skeleton className="h-4 w-16 bg-[#F3F4F6] dark:bg-[#2D3033]" />
							</div>
						))}
					</CardContent>
				</Card>
				<Card className="card-transition">
					<CardHeader>
						<CardTitle>
							<Skeleton className="h-5 w-40 bg-[#F3F4F6] dark:bg-[#2D3033]" />
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<Skeleton className="h-32 w-full bg-[#F3F4F6] dark:bg-[#2D3033]" />
						<Skeleton className="h-3 w-48 bg-[#F3F4F6] dark:bg-[#2D3033]" />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
