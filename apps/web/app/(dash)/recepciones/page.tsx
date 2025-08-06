"use client"

import { useState, useEffect } from "react"
import { Plus, Package, Calendar, User, Hash } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ReceiveItemsModal } from "@/components/recepciones/ReceiveItemsModal"
import { Skeleton } from "@/components/ui/skeleton"
import type { ReceptionHistory } from "@/lib/schemas"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function RecepcionesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [receptions, setReceptions] = useState<ReceptionHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Mock data loading
  useEffect(() => {
    setTimeout(() => {
      const mockReceptions: ReceptionHistory[] = [
        {
          id: "rec-001",
          shipmentNumber: "ENV-2024-001",
          arrivalDate: "2024-01-15T10:30:00Z",
          totalItems: 25,
          receivedBy: "María González",
          createdAt: "2024-01-15T10:35:00Z"
        },
        {
          id: "rec-002",
          shipmentNumber: "ENV-2024-002",
          arrivalDate: "2024-01-14T14:20:00Z",
          totalItems: 18,
          receivedBy: "Ana Martínez",
          createdAt: "2024-01-14T14:25:00Z"
        },
        {
          id: "rec-003",
          shipmentNumber: "ENV-2024-003",
          arrivalDate: "2024-01-13T09:15:00Z",
          totalItems: 32,
          receivedBy: "Carmen López",
          createdAt: "2024-01-13T09:20:00Z"
        },
        {
          id: "rec-004",
          shipmentNumber: "ENV-2024-004",
          arrivalDate: "2024-01-12T16:45:00Z",
          totalItems: 12,
          receivedBy: "Sofía Ruiz",
          createdAt: "2024-01-12T16:50:00Z"
        },
        {
          id: "rec-005",
          shipmentNumber: "ENV-2024-005",
          arrivalDate: "2024-01-11T11:30:00Z",
          totalItems: 8,
          receivedBy: "Elena Vega",
          createdAt: "2024-01-11T11:35:00Z"
        }
      ]
      setReceptions(mockReceptions)
      setIsLoading(false)
    }, 1500)
  }, [])

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es })
    } catch {
      return "N/A"
    }
  }

  const formatDateShort = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: es })
    } catch {
      return "N/A"
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 bg-white dark:bg-[#151718] theme-transition">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
            Recepciones
          </h1>
          <p className="text-[#687076] dark:text-[#9BA1A6] text-transition">
            Registra la llegada de productos al almacén
          </p>
        </div>
        
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0a7ea4] hover:bg-[#0a7ea4]/90 text-white theme-transition"
        >
          <Plus className="h-4 w-4 mr-2" />
          Registrar recepción
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-[#0a7ea4]/10 rounded-lg">
                <Package className="h-6 w-6 text-[#0a7ea4]" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-[#687076] dark:text-[#9BA1A6] text-transition">
                  Total recepciones
                </p>
                <p className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
                  {isLoading ? (
                    <Skeleton className="h-8 w-8 theme-transition" />
                  ) : (
                    receptions.length
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Hash className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-[#687076] dark:text-[#9BA1A6] text-transition">
                  Items recibidos
                </p>
                <p className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
                  {isLoading ? (
                    <Skeleton className="h-8 w-12 theme-transition" />
                  ) : (
                    receptions.reduce((sum, rec) => sum + rec.totalItems, 0)
                  )}
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
                  Esta semana
                </p>
                <p className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
                  {isLoading ? (
                    <Skeleton className="h-8 w-8 theme-transition" />
                  ) : (
                    receptions.filter(rec => {
                      const recDate = new Date(rec.arrivalDate)
                      const weekAgo = new Date()
                      weekAgo.setDate(weekAgo.getDate() - 7)
                      return recDate >= weekAgo
                    }).length
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-[#687076] dark:text-[#9BA1A6] text-transition">
                  Última recepción
                </p>
                <p className="text-sm font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
                  {isLoading ? (
                    <Skeleton className="h-4 w-20 theme-transition" />
                  ) : receptions.length > 0 ? (
                    formatDateShort(receptions[0].arrivalDate)
                  ) : (
                    "N/A"
                  )}
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
            Historial de recepciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-24 theme-transition" />
                  <Skeleton className="h-4 w-32 theme-transition" />
                  <Skeleton className="h-4 w-16 theme-transition" />
                  <Skeleton className="h-4 w-24 theme-transition" />
                  <Skeleton className="h-4 w-32 theme-transition" />
                </div>
              ))}
            </div>
          ) : receptions.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-[#687076] dark:text-[#9BA1A6] mx-auto mb-4" />
              <p className="text-[#687076] dark:text-[#9BA1A6] text-transition">
                No hay recepciones registradas
              </p>
              <Button
                onClick={() => setIsModalOpen(true)}
                variant="outline"
                className="mt-4 border-[#E5E7EB] dark:border-[#2D3033] text-[#0a7ea4] border-[#0a7ea4] hover:bg-[#0a7ea4]/10 dark:hover:bg-[#0a7ea4]/10 theme-transition"
              >
                <Plus className="h-4 w-4 mr-2" />
                Registrar primera recepción
              </Button>
            </div>
          ) : (
            <div className="rounded-md border border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#E5E7EB] dark:border-[#2D3033] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033]">
                    <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                      Número de envío
                    </TableHead>
                    <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                      Fecha de llegada
                    </TableHead>
                    <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                      Items
                    </TableHead>
                    <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                      Recibido por
                    </TableHead>
                    <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                      Registrado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receptions.map((reception) => (
                    <TableRow 
                      key={reception.id} 
                      className="border-b border-[#E5E7EB] dark:border-[#2D3033] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition"
                    >
                      <TableCell className="font-mono text-sm text-[#11181C] dark:text-[#ECEDEE] text-transition">
                        {reception.shipmentNumber}
                      </TableCell>
                      <TableCell className="text-[#687076] dark:text-[#9BA1A6] text-transition">
                        {formatDateShort(reception.arrivalDate)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className="bg-[#0a7ea4]/10 text-[#0a7ea4] hover:bg-[#0a7ea4]/20 theme-transition"
                        >
                          {reception.totalItems} items
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
                        {reception.receivedBy}
                      </TableCell>
                      <TableCell className="text-[#687076] dark:text-[#9BA1A6] text-transition text-sm">
                        {formatDate(reception.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receive Items Modal */}
      <ReceiveItemsModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  )
}
