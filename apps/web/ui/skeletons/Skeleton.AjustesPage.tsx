'use memo';

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Skeleton loader for the Ajustes (Settings) page.
 * Displays placeholder loading states for tabs and forms to prevent layout shift.
 *
 * @returns The skeleton loading component for the settings page
 */
export function SkeletonAjustesPage() {
	return (
		<div className="theme-transition p-4 md:p-8">
			<div className="mx-auto w-full max-w-4xl">
				{/* Page Header Skeleton */}
				<div className="mb-6">
					<Skeleton className="mb-2 h-8 w-32" />
					<Skeleton className="h-4 w-64" />
				</div>

				{/* Tabs Skeleton */}
				<Tabs className="w-full" defaultValue="users">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="users">Usuarios</TabsTrigger>
						<TabsTrigger value="warehouses">Bodegas</TabsTrigger>
					</TabsList>

					{/* Users Tab Skeleton */}
					<TabsContent className="space-y-6" value="users">
						{/* Create User Card Skeleton */}
						<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
							<CardHeader>
								<CardTitle className="text-[#11181C] dark:text-[#ECEDEE]">
									<Skeleton className="h-6 w-32" />
								</CardTitle>
								<CardDescription className="text-[#687076] dark:text-[#9BA1A6]">
									<Skeleton className="h-4 w-64" />
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{/* Name field */}
									<div className="space-y-2">
										<Skeleton className="h-4 w-16" />
										<Skeleton className="h-10 w-full" />
									</div>

									{/* Email field */}
									<div className="space-y-2">
										<Skeleton className="h-4 w-16" />
										<Skeleton className="h-10 w-full" />
									</div>

									{/* Password field */}
									<div className="space-y-2">
										<Skeleton className="h-4 w-20" />
										<Skeleton className="h-10 w-full" />
									</div>

									{/* Button */}
									<div className="pt-2">
										<Skeleton className="h-11 w-32" />
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Update User Card Skeleton */}
						<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
							<CardHeader>
								<CardTitle className="text-[#11181C] dark:text-[#ECEDEE]">
									<Skeleton className="h-6 w-40" />
								</CardTitle>
								<CardDescription className="text-[#687076] dark:text-[#9BA1A6]">
									<Skeleton className="h-4 w-80" />
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{/* User select */}
									<div className="space-y-2">
										<Skeleton className="h-4 w-20" />
										<Skeleton className="h-10 w-full" />
									</div>

									{/* Role select */}
									<div className="space-y-2">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-10 w-full" />
									</div>

									{/* Warehouse select */}
									<div className="space-y-2">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-10 w-full" />
									</div>

									{/* Note */}
									<Skeleton className="h-16 w-full" />

									{/* Button */}
									<div className="pt-2">
										<Skeleton className="h-11 w-40" />
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					{/* Warehouses Tab Skeleton */}
					<TabsContent className="space-y-6" value="warehouses">
						<Card className="card-transition border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
							<CardHeader>
								<CardTitle className="text-[#11181C] dark:text-[#ECEDEE]">
									<Skeleton className="h-6 w-32" />
								</CardTitle>
								<CardDescription className="text-[#687076] dark:text-[#9BA1A6]">
									<Skeleton className="h-4 w-64" />
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{/* Name field */}
									<div className="space-y-2">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-10 w-full" />
									</div>

									{/* Code field */}
									<div className="space-y-2">
										<Skeleton className="h-4 w-28" />
										<Skeleton className="h-10 w-full" />
									</div>

									{/* Description field */}
									<div className="space-y-2">
										<Skeleton className="h-4 w-36" />
										<Skeleton className="h-24 w-full" />
									</div>

									{/* Button */}
									<div className="pt-2">
										<Skeleton className="h-11 w-32" />
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
