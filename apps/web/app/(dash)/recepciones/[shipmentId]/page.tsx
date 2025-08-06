"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Package, CheckCircle2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { SkeletonReceptionGroup } from "@/ui/skeletons/Skeleton.ReceptionGroup"
import { useReceptionStore } from "@/stores/reception-store"
import type { ReceptionItem } from "@/lib/schemas"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface PageProps {
  params: {
    shipmentId: string
  }
}

export default function ReceptionDetailPage({ params }: PageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  
  const {
    items,
    setItems,
    toggleReceived,
    markAllReceived,
    getReceivedCount,
    getTotalCount,
    isAllReceived
  } = useReceptionStore()

  // Mock data loading - TODO: Replace mock with GET /api/recepciones/{shipmentId}
  useEffect(() => {
    setTimeout(() => {
      const mockItems: ReceptionItem[] = [
        // Group 1: Barcode 123456
        {
          id: "item-001",
          barcode: 123456,
          productName: "Esmalte Gel Rosa Pastel",
          received: false
        },
        {
          id: "item-002",
          barcode: 123456,
          productName: "Esmalte Gel Rosa Pastel",
          received: false
        },
        {
          id: "item-003",
          barcode: 123456,
          productName: "Esmalte Gel Rosa Pastel",
          received: true
        },
        // Group 2: Barcode 789012
        {
          id: "item-004",
          barcode: 789012,
          productName: "Base Coat Profesional",
          received: false
        },
        {
          id: "item-005",
          barcode: 789012,
          productName: "Base Coat Profesional",
          received: false
        },
        // Group 3: Barcode 345678
        {
          id: "item-006",
          barcode: 345678,
          productName: "Top Coat Brillante",
          received: false
        },
        {
          id: "item-007",
          barcode: 345678,
          productName: "Top Coat Brillante",
          received: true
        },
        {
          id: "item-008",
          barcode: 345678,
          productName: "Top Coat Brillante",
          received: false
        }
      ]
      setItems(mockItems)
      setIsLoading(false)
    }, 1500)
  }, [setItems])

  // Group items by barcode
  const groupedItems = items.reduce((groups, item) => {
    const key = item.barcode
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
    return groups
  }, {} as Record<number, ReceptionItem[]>)

  const handleMarkAllReceived = () => {
    markAllReceived()
    toast({
      title: "Recepción completada",
      description: "Todos los artículos han sido marcados como recibidos",
    })
    
    // Navigate back to receptions list
    setTimeout(() => {
      router.push("/recepciones")
    }, 1500)
  }

  const handleToggleItem = (itemId: string) => {
    toggleReceived(itemId)
  }

  const receivedCount = getReceivedCount()
  const totalCount = getTotalCount()

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 bg-white dark:bg-[#151718] theme-transition">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink 
              href="/recepciones"
              className="flex items-center text-[#0a7ea4] hover:text-[#0a7ea4]/80 theme-transition"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver a recepciones
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
              {params.shipmentId}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
            Recepción de envío {params.shipmentId}
          </h1>
          <p className="text-[#687076] dark:text-[#9BA1A6] text-transition">
            Marca los artículos como recibidos
          </p>
        </div>
        
        <Button
          onClick={handleMarkAllReceived}
          disabled={isLoading || isAllReceived()}
          className="bg-[#0a7ea4] hover:bg-[#0a7ea4]/90 text-white disabled:opacity-50 theme-transition"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Marcar todo como recibido
        </Button>
      </div>

      {/* Progress Card */}
      <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-[#0a7ea4]/10 rounded-lg">
                <Package className="h-6 w-6 text-[#0a7ea4]" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-[#687076] dark:text-[#9BA1A6] text-transition">
                  Progreso de recepción
                </p>
                <p className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
                  {isLoading ? "..." : `${receivedCount} / ${totalCount}`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#687076] dark:text-[#9BA1A6] text-transition">
                Completado
              </p>
              <p className="text-lg font-semibold text-[#0a7ea4]">
                {isLoading ? "0%" : `${totalCount > 0 ? Math.round((receivedCount / totalCount) * 100) : 0}%`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#1E1F20] card-transition">
        <CardHeader>
          <CardTitle className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
            Artículos del envío
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#E5E7EB] dark:border-[#2D3033] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033]">
                  <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                    Identificador
                  </TableHead>
                  <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                    Código de barras
                  </TableHead>
                  <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                    Nombre de producto
                  </TableHead>
                  <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                    Recibido
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <SkeletonReceptionGroup key={index} />
                  ))
                ) : Object.entries(groupedItems).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <Package className="h-12 w-12 text-[#687076] dark:text-[#9BA1A6] mx-auto mb-4" />
                      <p className="text-[#687076] dark:text-[#9BA1A6] text-transition">
                        No hay artículos en este envío
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.entries(groupedItems).map(([barcode, groupItems]) => (
                    <React.Fragment key={barcode}>
                      {/* Group header */}
                      <TableRow className="bg-[#F9FAFB]/60 dark:bg-[#1E1F20]/60 theme-transition">
                        <TableCell colSpan={4} className="py-3 font-medium text-[#687076] dark:text-[#9BA1A6] text-transition">
                          <div className="flex items-center space-x-3">
                            <span className="font-mono text-sm">Código: {barcode}</span>
                            <span className="text-sm">• {groupItems[0].productName}</span>
                            <span className="text-xs bg-[#0a7ea4]/10 text-[#0a7ea4] px-2 py-1 rounded-full">
                              {groupItems.length} items
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Group items */}
                      {groupItems.map((item) => (
                        <TableRow 
                          key={item.id}
                          className={cn(
                            "border-b border-[#E5E7EB] dark:border-[#2D3033] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition",
                            item.received && "opacity-75"
                          )}
                        >
                          <TableCell className="pl-8 font-mono text-sm text-[#11181C] dark:text-[#ECEDEE] text-transition">
                            {item.id}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-[#687076] dark:text-[#9BA1A6] text-transition">
                            {item.barcode}
                          </TableCell>
                          <TableCell className={cn(
                            "text-[#11181C] dark:text-[#ECEDEE] text-transition",
                            item.received && "line-through"
                          )}>
                            {item.productName}
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={item.received}
                              onCheckedChange={() => handleToggleItem(item.id)}
                              className="h-5 w-5 data-[state=checked]:bg-[#0a7ea4] data-[state=checked]:border-[#0a7ea4]"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
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
