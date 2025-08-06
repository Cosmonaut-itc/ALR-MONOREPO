"use client"

import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useStatisticsStore } from "@/stores/statistics-store"
import { SkeletonProductStats } from "@/ui/skeletons/Skeleton.ProductStats"
import { SkeletonEmployeeStats } from "@/ui/skeletons/Skeleton.EmployeeStats"
import { SkeletonEfficiency } from "@/ui/skeletons/Skeleton.Efficiency"

export default function EstadisticasPage() {
  const {
    productStats,
    employeeUses,
    userName,
    branchName,
    isLoadingProducts,
    isLoadingEmployees,
    isLoadingEfficiency,
    setProductStats,
    setEmployeeUses,
    setUserInfo,
    setLoadingProducts,
    setLoadingEmployees,
    setLoadingEfficiency,
  } = useStatisticsStore()

  // Simular carga de datos
  useEffect(() => {
    // Simular datos del usuario y sucursal
    setUserInfo("María González", "Sucursal Centro")

    // Simular carga de productos más utilizados
    setTimeout(() => {
      setProductStats([
        { id: "1", name: "Martillo Profesional", uses: 45 },
        { id: "2", name: "Taladro Inalámbrico", uses: 38 },
        { id: "3", name: "Sierra Circular", uses: 32 },
        { id: "4", name: "Destornillador Eléctrico", uses: 28 },
        { id: "5", name: "Nivel Láser", uses: 24 },
      ])
      setLoadingProducts(false)
    }, 1500)

    // Simular carga de empleados activos
    setTimeout(() => {
      setEmployeeUses([
        {
          id: "1",
          fullname: "Carlos Rodríguez",
          avatarUrl: "/placeholder-user.jpg",
          productName: "Martillo Profesional",
        },
        {
          id: "2",
          fullname: "Ana Martínez",
          avatarUrl: "/placeholder-user.jpg",
          productName: "Taladro Inalámbrico",
        },
        {
          id: "3",
          fullname: "Luis Fernández",
          avatarUrl: "/placeholder-user.jpg",
          productName: "Sierra Circular",
        },
        {
          id: "4",
          fullname: "Sofia López",
          avatarUrl: "/placeholder-user.jpg",
          productName: "Nivel Láser",
        },
      ])
      setLoadingEmployees(false)
    }, 2000)

    // Simular carga de eficiencia
    setTimeout(() => {
      setLoadingEfficiency(false)
    }, 2500)
  }, [setProductStats, setEmployeeUses, setUserInfo, setLoadingProducts, setLoadingEmployees, setLoadingEfficiency])

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 bg-white dark:bg-[#151718] theme-transition">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
          Visión general de la sucursal
        </h1>
        <p className="text-[#687076] dark:text-[#9BA1A6] text-transition">
          Hola, {userName} – {branchName}
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Productos más utilizados */}
        {isLoadingProducts ? (
          <SkeletonProductStats />
        ) : (
          <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
            <CardHeader>
              <CardTitle className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
                Productos más utilizados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {productStats.map((product, index) => (
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
                    {product.uses}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Card 2: Empleados activos */}
        {isLoadingEmployees ? (
          <SkeletonEmployeeStats />
        ) : (
          <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
            <CardHeader>
              <CardTitle className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
                Empleados activos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {employeeUses.map((employee) => (
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

        {/* Card 3: Eficiencia promedio */}
        {isLoadingEfficiency ? (
          <SkeletonEfficiency />
        ) : (
          <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
            <CardHeader>
              <CardTitle className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
                Eficiencia promedio
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-8">
              <div className="aspect-square w-48 rounded-full bg-gradient-to-br from-[#0a7ea4]/20 to-[#0a7ea4]/5 border-4 border-[#0a7ea4]/30 flex items-center justify-center theme-transition">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#0a7ea4] theme-transition">
                    87%
                  </div>
                  <div className="text-sm text-[#687076] dark:text-[#9BA1A6] text-transition">
                    Eficiencia
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
