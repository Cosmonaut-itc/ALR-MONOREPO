"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, PackageCheck, Package } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { SkeletonKitInspectionGroup } from "@/ui/skeletons/Skeleton.KitInspectionGroup"
import { useKitsStore } from "@/stores/kits-store"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface PageProps {
  params: {
    kitId: string
  }
}

// Helper function to generate UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export default function KitInspectionPage({ params }: PageProps) {
  const router = useRouter()
  const { toast } = useToast()
  
  const {
    inspectionItems,
    inspectionLoading,
    loadInspection,
    toggleInspectionItem,
    toggleInspectionGroup,
    markAllReturned,
    getInspectionProgress
  } = useKitsStore()

  // Mock data loading - TODO: Replace mock with GET /api/kits/{kitId}
  useEffect(() => {
    const mockItems = [
      // Group 1: Barcode 123456 - Esmalte Base Coat
      {
        id: "kit-item-001",
        uuid: generateUUID(),
        barcode: "123456",
        productName: "Esmalte Base Coat",
        returned: false
      },
      {
        id: "kit-item-002",
        uuid: generateUUID(),
        barcode: "123456",
        productName: "Esmalte Base Coat",
        returned: false
      },
      {
        id: "kit-item-003",
        uuid: generateUUID(),
        barcode: "123456",
        productName: "Esmalte Base Coat",
        returned: true
      },
      // Group 2: Barcode 789012 - Lima de Uñas
      {
        id: "kit-item-004",
        uuid: generateUUID(),
        barcode: "789012",
        productName: "Lima de Uñas 180/240",
        returned: false
      },
      {
        id: "kit-item-005",
        uuid: generateUUID(),
        barcode: "789012",
        productName: "Lima de Uñas 180/240",
        returned: false
      },
      {
        id: "kit-item-006",
        uuid: generateUUID(),
        barcode: "789012",
        productName: "Lima de Uñas 180/240",
        returned: false
      },
      {
        id: "kit-item-007",
        uuid: generateUUID(),
        barcode: "789012",
        productName: "Lima de Uñas 180/240",
        returned: false
      },
      {
        id: "kit-item-008",
        uuid: generateUUID(),
        barcode: "789012",
        productName: "Lima de Uñas 180/240",
        returned: true
      },
      // Group 3: Barcode 345678 - Aceite de Cutícula
      {
        id: "kit-item-009",
        uuid: generateUUID(),
        barcode: "345678",
        productName: "Aceite de Cutícula",
        returned: false
      },
      {
        id: "kit-item-010",
        uuid: generateUUID(),
        barcode: "345678",
        productName: "Aceite de Cutícula",
        returned: false
      }
    ]
    
    loadInspection(params.kitId, mockItems)
  }, [params.kitId, loadInspection])

  // Group items by barcode
  const groupedItems = inspectionItems.reduce((groups, item) => {
    const key = item.barcode
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
    return groups
  }, {} as Record<string, typeof inspectionItems>)

  const handleMarkAllReturned = () => {
    markAllReturned(params.kitId)
    toast({
      title: "Kit devuelto",
      description: "Todos los artículos han sido marcados como devueltos",
    })
    
    // Navigate back to kits list
    setTimeout(() => {
      router.push("/kits")
    }, 1500)
  }

  const handleToggleItem = (itemId: string) => {
    toggleInspectionItem(itemId)
  }

  const handleGroupToggle = (barcode: string) => {
    toggleInspectionGroup(barcode)
  }

  const getGroupSelectionState = (barcode: string) => {
    const groupItems = groupedItems[barcode] || []
    const returnedCount = groupItems.filter(item => item.returned).length
    
    if (returnedCount === 0) return "unchecked"
    if (returnedCount === groupItems.length) return "checked"
    return "indeterminate"
  }

  const progress = getInspectionProgress()
  const isAllReturned = progress.total > 0 && progress.returned === progress.total

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 bg-white dark:bg-[#151718] theme-transition">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink 
              href="/kits"
              className="flex items-center text-[#0a7ea4] hover:text-[#0a7ea4]/80 theme-transition"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver a kits
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
              {params.kitId}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
            Inspeccionar Kit {params.kitId}
          </h1>
          <p className="text-[#687076] dark:text-[#9BA1A6] text-transition">
            Marca los artículos como devueltos
          </p>
        </div>
        
        <Button
          onClick={handleMarkAllReturned}
          disabled={inspectionLoading || isAllReturned}
          className="bg-[#0a7ea4] hover:bg-[#0a7ea4]/90 text-white disabled:opacity-50 theme-transition"
        >
          <PackageCheck className="h-4 w-4 mr-2" />
          Marcar todo como devuelto
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
                  Progreso de devolución
                </p>
                <p className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
                  {inspectionLoading ? "..." : `${progress.returned} / ${progress.total}`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#687076] dark:text-[#9BA1A6] text-transition">
                Completado
              </p>
              <p className="text-lg font-semibold text-[#0a7ea4]">
                {inspectionLoading ? "0%" : `${progress.percentage}%`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#1E1F20] card-transition">
        <CardHeader>
          <CardTitle className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
            Artículos del kit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#E5E7EB] dark:border-[#2D3033] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033]">
                  <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                    UUID
                  </TableHead>
                  <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                    Código de barras
                  </TableHead>
                  <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                    Nombre de producto
                  </TableHead>
                  <TableHead className="text-[#11181C] dark:text-[#ECEDEE] text-transition font-medium">
                    Devuelto
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspectionLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <SkeletonKitInspectionGroup key={index} />
                  ))
                ) : Object.entries(groupedItems).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <Package className="h-12 w-12 text-[#687076] dark:text-[#9BA1A6] mx-auto mb-4" />
                      <p className="text-[#687076] dark:text-[#9BA1A6] text-transition">
                        No hay artículos en este kit
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.entries(groupedItems).map(([barcode, groupItems]) => {
                    const selectionState = getGroupSelectionState(barcode)
                    
                    return (
                      <React.Fragment key={barcode}>
                        {/* Group header */}
                        <TableRow className="bg-[#F9FAFB]/60 dark:bg-[#1E1F20]/60 theme-transition">
                          <TableCell colSpan={4} className="py-3 font-medium text-[#687076] dark:text-[#9BA1A6] text-transition">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={selectionState === "checked"}
                                ref={(el) => {
                                  if (el) {
                                    el.indeterminate = selectionState === "indeterminate"
                                  }
                                }}
                                onCheckedChange={() => handleGroupToggle(barcode)}
                                className="h-4 w-4"
                              />
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
                              item.returned && "opacity-75"
                            )}
                          >
                            <TableCell className="pl-8 font-mono text-sm text-[#11181C] dark:text-[#ECEDEE] text-transition">
                              {item.uuid.split('-')[0]}...
                            </TableCell>
                            <TableCell className="font-mono text-sm text-[#687076] dark:text-[#9BA1A6] text-transition">
                              {item.barcode}
                            </TableCell>
                            <TableCell className={cn(
                              "text-[#11181C] dark:text-[#ECEDEE] text-transition",
                              item.returned && "line-through"
                            )}>
                              {item.productName}
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={item.returned}
                                onCheckedChange={() => handleToggleItem(item.id)}
                                className="h-5 w-5 data-[state=checked]:bg-[#0a7ea4] data-[state=checked]:border-[#0a7ea4]"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
