import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AuthGuard } from "@/components/auth-guard"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default function DashLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-[#E5E7EB] dark:border-[#2D3033] px-4 theme-transition">
            <SidebarTrigger className="-ml-1 text-[#687076] dark:text-[#9BA1A6] hover:text-[#0a7ea4] dark:hover:text-[#0a7ea4] theme-transition" />
            <Separator orientation="vertical" className="mr-2 h-4 bg-[#E5E7EB] dark:bg-[#2D3033]" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink 
                    href="#" 
                    className="text-[#687076] dark:text-[#9BA1A6] hover:text-[#0a7ea4] dark:hover:text-[#0a7ea4] theme-transition"
                  >
                    ALR Manager
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block text-[#687076] dark:text-[#9BA1A6]" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-[#11181C] dark:text-[#ECEDEE] theme-transition">
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
  )
}
