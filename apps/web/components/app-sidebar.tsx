"use memo";
"use client";

import {
	BarChart3,
	Box,
	Home,
	LogOut,
	Package,
	Settings,
	TrendingUp,
	Truck,
	User,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import { useLogoutMutation } from "@/lib/mutations/auth";
import { useAuthStore } from "@/stores/auth-store";

// Datos de navegación del sistema ALR
const navigationItems = [
	{
		title: "Dashboard",
		url: "/dashboard",
		icon: Home,
	},
	{
		title: "Inventario",
		url: "/inventario",
		icon: Package,
	},
	{
		title: "Pedidos",
		url: "/pedidos",
		icon: Box,
	},

	{
		title: "Traspasos",
		url: "/recepciones",
		icon: Truck,
	},
	{
		title: "Emplead@s",
		url: "/kits",
		icon: Users,
	},
	{
		title: "Estadísticas",
		url: "/estadisticas",
		icon: BarChart3,
	},
	{
		title: "Ajustes",
		url: "/ajustes",
		icon: Settings,
	},
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const router = useRouter();
	const { user, logout } = useAuthStore();
	const normalizedRole =
		typeof user?.role === "string" ? user.role.toLowerCase() : "";
	const isEmployee = normalizedRole === "employee";
	const visibleNavigationItems = isEmployee
		? navigationItems.filter((item) => item.url !== "/estadisticas")
		: navigationItems;

	const { mutateAsync } = useLogoutMutation();

	const handleLogout = async () => {
		try {
			const response = await mutateAsync();
			logout();
			if (response.data?.success) {
				toast.success("Sesión cerrada correctamente");
				router.push("/login");
			}
		} catch (error) {
			toast.error("Error al cerrar sesión");
			console.error(error);
		}
	};

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<div className="flex items-center gap-2 px-2 py-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0a7ea4] text-white">
						<TrendingUp className="h-4 w-4" />
					</div>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-semibold text-[#11181C] dark:text-[#ECEDEE]">
							ALR Manager
						</span>
						<span className="truncate text-[#687076] text-xs dark:text-[#9BA1A6]">
							Sistema de Inventario
						</span>
					</div>
				</div>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel className="text-[#687076] dark:text-[#9BA1A6]">
						Navegación Principal
						</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{visibleNavigationItems.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton
										asChild
										className="theme-transition text-[#11181C] hover:bg-[#F9FAFB] hover:text-[#0a7ea4] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033] dark:hover:text-[#0a7ea4]"
										tooltip={item.title}
									>
										<Link className="flex items-center gap-2" href={item.url}>
											<item.icon className="icon-transition h-4 w-4" />
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
									size="lg"
								>
									<Avatar className="h-8 w-8 rounded-lg">
										<AvatarImage alt={user?.name ?? "Usuario"} src="/placeholder-user.jpg" />
										<AvatarFallback className="rounded-lg bg-[#0a7ea4] text-white">
											{user?.name
											?.split(" ")
											.map((n: string) => n[0])
											.join("") || "U"}
										</AvatarFallback>
									</Avatar>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-semibold">
											{user?.name || "Usuario"}
										</span>
										<span className="truncate text-xs">
											{user?.email || "usuario@ejemplo.com"}
										</span>
									</div>
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
								side="bottom"
								sideOffset={4}
							>
								<DropdownMenuItem className="gap-2">
									<User className="h-4 w-4" />
									<span>Perfil</span>
								</DropdownMenuItem>
								<DropdownMenuItem className="gap-2" onClick={handleLogout}>
									<LogOut className="h-4 w-4" />
									<span>Cerrar Sesión</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
