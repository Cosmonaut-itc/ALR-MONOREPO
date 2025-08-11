import { AppSidebar } from '@/components/app-sidebar';
import { AuthGuard } from '@/components/auth-guard';
import { ThemeToggle } from '@/components/theme-toggle';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export default function DashLayout({ children }: { children: React.ReactNode }) {
	return (
		<AuthGuard>
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset>
					<header className="theme-transition flex h-16 shrink-0 items-center gap-2 border-[#E5E7EB] border-b px-4 dark:border-[#2D3033]">
						<SidebarTrigger className="-ml-1 theme-transition text-[#687076] hover:text-[#0a7ea4] dark:text-[#9BA1A6] dark:hover:text-[#0a7ea4]" />
						<Separator
							className="mr-2 h-4 bg-[#E5E7EB] dark:bg-[#2D3033]"
							orientation="vertical"
						/>
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem className="hidden md:block">
									<BreadcrumbLink
										className="theme-transition text-[#687076] hover:text-[#0a7ea4] dark:text-[#9BA1A6] dark:hover:text-[#0a7ea4]"
										href="#"
									>
										ALR Manager
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator className="hidden text-[#687076] md:block dark:text-[#9BA1A6]" />
								<BreadcrumbItem>
									<BreadcrumbPage className="theme-transition text-[#11181C] dark:text-[#ECEDEE]">
										Dashboard
									</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
						<div className="ml-auto">
							<ThemeToggle />
						</div>
					</header>
					{children}
				</SidebarInset>
			</SidebarProvider>
		</AuthGuard>
	);
}
