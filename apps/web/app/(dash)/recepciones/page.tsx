"use client"

import { useState, useEffect } from "react"
import { ArrowRight, Package, Calendar, CheckCircle, Clock } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SkeletonReceptionRow } from "@/ui/skeletons/Skeleton.ReceptionRow"
import type { ReceptionHeader } from "@/lib/schemas"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"

export default function RecepcionesPage() {
  const [receptions, setReceptions] = useState<ReceptionHeader[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Mock data loading
  useEffect(() => {
    setTimeout(() => {
      const mockReceptions: ReceptionHeader[] = [
        {
          shipmentId: "ship-001",
          arrivalDate: "2024-01-15T10:30:00Z",
          totalItems: 25,
          status: "pendiente"
        },
        {
          shipmentId: "ship-002",
          arrivalDate: "2024-01-14T14:20:00Z",
          totalItems: 18,
          status: "pendiente"
        },
        {
          shipmentId: "ship-003",
          arrivalDate: "2024-01-13T09:15:00Z",
          totalItems: 32,
          status: "completada"
        },
        {
          shipmentId: "ship-004",
          arrivalDate: "2024-01-12T16:45:00Z",
          totalItems: 12,
          status: "completada"
        },
        {
          shipmentId: "ship-005",
          arrivalDate: "2024-01-11T11:30:00Z",
          totalItems: 8,
          status: "pendiente"
        }
      ]
      setReceptions(mockReceptions)
      setIsLoading(false)
    }, 1500)
  }, [])

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: es })
    } catch {
      return "N/A"
    }
  }

  const handleReceiveClick = (shipmentId: string) => {
    router.push(`/recepciones/${shipmentId}`)
  }

  const pendingReceptions = receptions.filter(r => r.status === "pendiente")
  const completedReceptions = receptions.filter(r => r.status === "completada")

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 bg-white dark:bg-[#151718] theme-transition">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
          Recepciones pendientes
        </h1>
        <p className="text-[#687076] dark:text-[#9BA1A6] text-transition">
          Gestiona las recepciones desde el centro de distribución
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-[#687076] dark:text-[#9BA1A6] text-transition">
                  Pendientes
                </p>
                <p className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
                  {isLoading ? "..." : pendingReceptions.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-[#687076] dark:text-[#9BA1A6] text-transition">
                  Completadas
                </p>
                <p className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
                  {isLoading ? "..." : completedReceptions.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-[#0a7ea4]/10 rounded-lg">
                <Package className="h-6 w-6 text-[#0a7ea4]" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-[#687076] dark:text-[#9BA1A6] text-transition">
                  Total items
                </p>
                <p className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
                  {isLoading ? "..." : receptions.reduce((sum, rec) => sum + rec.totalItems, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-[#687076] dark:text-[#9BA1A6] text-transition">
                  Hoy
                </p>
                <p className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
                  {isLoading ? "..." : receptions.filter(rec => {
                    const recDate = new Date(rec.arrivalDate)
                    const today = new Date()
                    return recDate.toDateString() === today.toDateString()
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receptions Table */}
      <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#1E1F20] card-transition">
        <CardHeader>
          <CardTitle className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
            Lista de recepciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#E5E7EB] dark:border-[#2D3033] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033]">
                  <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                    Nº de envío
                  </TableHead>
                  <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                    Fecha de llegada
                  </TableHead>
                  <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                    Total de ítems
                  </TableHead>
                  <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                    Estado
                  </TableHead>
                  <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                    Acción
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <SkeletonReceptionRow key={index} />
                  ))
                ) : receptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <Package className="h-12 w-12 text-[#687076] dark:text-[#9BA1A6] mx-auto mb-4" />
                      <p className="text-[#687076] dark:text-[#9BA1A6] text-transition">
                        No hay recepciones disponibles
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  receptions.map((reception) => (
                    <TableRow 
                      key={reception.shipmentId} 
                      className="border-b border-[#E5E7EB] dark:border-[#2D3033] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition"
                    >
                      <TableCell className="font-mono text-sm text-[#11181C] dark:text-[#ECEDEE] text-transition">
                        {reception.shipmentId}
                      </TableCell>
                      <TableCell className="text-[#687076] dark:text-[#9BA1A6] text-transition">
                        {formatDate(reception.arrivalDate)}
                      </TableCell>
                      <TableCell className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
                        {reception.totalItems}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={reception.status === "pendiente" ? "secondary" : "default"}
                          className={
                            reception.status === "pendiente" 
                              ? "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400 theme-transition"
                              : "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 theme-transition"
                          }
                        >
                          {reception.status === "pendiente" ? "Pendiente" : "Completada"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {reception.status === "pendiente" ? (
                          <Button
                            size="sm"
                            onClick={() => handleReceiveClick(reception.shipmentId)}
                            className="bg-[#0a7ea4] hover:bg-[#0a7ea4]/90 text-white theme-transition"
                          >
                            <ArrowRight className="h-4 w-4 mr-1" />
                            Recibir
                          </Button>
                        ) : (
                          <span className="text-[#687076] dark:text-[#9BA1A6] text-sm text-transition">
                            Completada
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
