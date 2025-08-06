"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Download, MoveRight, ClipboardList } from 'lucide-react'
import { DashboardMetricCard } from "@/components/DashboardMetricCard"
import { useDashboardStore } from "@/stores/dashboard-store"
import { useAuthStore } from "@/stores/auth-store"
import { SkeletonMetricCard } from "@/ui/skeletons/Skeleton.MetricCard"
import { SkeletonTopProducts } from "@/ui/skeletons/Skeleton.TopProducts"
import { SkeletonActiveEmployees } from "@/ui/skeletons/Skeleton.ActiveEmployees"
import { SkeletonEfficiencyDonut } from "@/ui/skeletons/Skeleton.EfficiencyDonut"

export default function DashboardHomePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  
  const {
    userName,
    branchName,
    metrics,
    topProducts,
    activeEmployees,
    efficiencyData,
    isLoadingMetrics,
    isLoadingTopProducts,
    isLoadingActiveEmployees,
    isLoadingEfficiency,
    setUserInfo,
    setMetrics,
    setTopProducts,
    setActiveEmployees,
    setEfficiencyData,
    setLoadingMetrics,
    setLoadingTopProducts,
    setLoadingActiveEmployees,
    setLoadingEfficiency,
  } = useDashboardStore()

  // TODO: branchId and user data come from session (better-auth)
  // TODO: replace mock data with RPC calls (see AppType api.* endpoints)
  useEffect(() => {
    // Set user info from auth store
    if (user) {
      setUserInfo(user.name, "Sucursal Centro")
    }

    // Mock metrics data
    setTimeout(() => {
      setMetrics([
        { id: "1", label: "Stock general", value: 2340, icon: "package" },
        { id: "2", label: "Stock gabinete", value: 875, icon: "archive" },
        { id: "3", label: "Kits pendientes de entregar", value: 6, icon: "clock" },
        { id: "4", label: "Productos con stock bajo", value: 12, icon: "alert" },
      ])
      setLoadingMetrics(false)
    }, 1000)

    // Mock top products data
    setTimeout(() => {
      setTopProducts([
        { id: "1", name: "Acrílico Rosa", uses: 421 },
        { id: "2", name: "Lima 80/100", uses: 364 },
        { id: "3", name: "Gel Constructor", uses: 298 },
        { id: "4", name: "Base Coat", uses: 245 },
        { id: "5", name: "Top Coat", uses: 189 },
      ])
      setLoadingTopProducts(false)
    }, 1500)

    // Mock active employees data
    setTimeout(() => {
      setActiveEmployees([
        {
          id: "1",
          fullname: "Ana P.",
          avatarUrl: "/placeholder-user.jpg",
          productName: "Acrílico Rosa",
        },
        {
          id: "2",
          fullname: "Fernanda R.",
          avatarUrl: "/placeholder-user.jpg",
          productName: "Lima 80/100",
        },
        {
          id: "3",
          fullname: "María G.",
          avatarUrl: "/placeholder-user.jpg",
          productName: "Gel Constructor",
        },
        {
          id: "4",
          fullname: "Carmen L.",
          avatarUrl: "/placeholder-user.jpg",
          productName: "Base Coat",
        },
      ])
      setLoadingActiveEmployees(false)
    }, 2000)

    // Mock efficiency data
    setTimeout(() => {
      setEfficiencyData(87)
      setLoadingEfficiency(false)
    }, 2500)
  }, [user, setUserInfo, setMetrics, setTopProducts, setActiveEmployees, setEfficiencyData, setLoadingMetrics, setLoadingTopProducts, setLoadingActiveEmployees, setLoadingEfficiency])

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 bg-white dark:bg-[#151718] theme-transition">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
          Hola, {userName} – {branchName}
        </h1>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingMetrics
          ? Array.from({ length: 4 }).map((_, index) => (
              <SkeletonMetricCard key={index} />
            ))
          : metrics.map((metric) => (
              <DashboardMetricCard key={metric.id} metric={metric} />
            ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        {isLoadingTopProducts ? (
          <SkeletonTopProducts />
        ) : (
          <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#11181C] dark:text-[#ECEDEE] text-transition">
                <span>🔥</span>
                Productos más usados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-[#0a7ea4] theme-transition" />
                    </div>
                    <span className="text-sm font-medium text-[#11181C] dark:text-[#ECEDEE] text-transition">
                      {product.name}
                    </span>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="bg-[#0a7ea4]/10 text-[#0a7ea4] hover:bg-[#0a7ea4]/20 theme-transition"
                  >
                    {product.uses} usos
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Active Employees */}
        {isLoadingActiveEmployees ? (
          <SkeletonActiveEmployees />
        ) : (
          <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#11181C] dark:text-[#ECEDEE] text-transition">
                <span>👥</span>
                Empleados activos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={employee.avatarUrl || "/placeholder.svg"} alt={employee.fullname} />
                    <AvatarFallback className="bg-[#0a7ea4] text-white text-sm">
                      {employee.fullname.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-[#11181C] dark:text-[#ECEDEE] text-transition">
                      {employee.fullname}
                    </p>
                    <p className="text-xs text-[#687076] dark:text-[#9BA1A6] text-transition">
                      Usando: {employee.productName}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Efficiency Donut Chart */}
      {isLoadingEfficiency ? (
        <SkeletonEfficiencyDonut />
      ) : (
        <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#11181C] dark:text-[#ECEDEE] text-transition">
              <span>📈</span>
              Eficiencia de producto
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <div className="aspect-square w-64 rounded-full bg-gradient-to-br from-[#0a7ea4]/20 to-[#0a7ea4]/5 border-4 border-[#0a7ea4]/30 flex items-center justify-center theme-transition">
              <div className="text-center">
                <div className="text-4xl font-bold text-[#0a7ea4] theme-transition">
                  {efficiencyData}%
                </div>
                <div className="text-sm text-[#687076] dark:text-[#9BA1A6] text-transition">
                  Eficiencia promedio
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Action Buttons */}
      <div className="fixed bottom-6 right-6 lg:absolute lg:bottom-0 lg:right-0 flex flex-col gap-3 z-10">
        <Button
          asChild
          variant="outline"
          className="bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033] text-[#11181C] dark:text-[#ECEDEE] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] shadow-lg theme-transition"
        >
          <Link href="/recepciones" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Registrar recepción</span>
          </Link>
        </Button>
        
        <Button
          asChild
          variant="outline"
          className="bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033] text-[#11181C] dark:text-[#ECEDEE] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] shadow-lg theme-transition"
        >
          <Link href="/transferencias" className="flex items-center gap-2">
            <MoveRight className="h-4 w-4" />
            <span className="hidden sm:inline">Transferir productos</span>
          </Link>
        </Button>
        
        <Button
          asChild
          variant="outline"
          className="bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033] text-[#11181C] dark:text-[#ECEDEE] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] shadow-lg theme-transition"
        >
          <Link href="/kits" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Asignar kits</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
