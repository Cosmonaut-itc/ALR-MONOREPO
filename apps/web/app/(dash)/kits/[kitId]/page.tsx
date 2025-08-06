"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, PackageCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { useKitsStore } from '@/stores/kits-store'
import { SkeletonKitInspectionGroup } from '@/ui/skeletons/Skeleton.KitInspectionGroup'

export default function KitInspectionPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const kitId = params.kitId as string
  
  const {
    inspectionItems,
    inspectionLoading,
    loadInspection,
    toggleInspectionItem,
    toggleInspectionGroup,
    markAllReturned,
    getInspectionProgress
  } = useKitsStore()

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockItems = [
      {
        id: '1',
        barcode: 'BC001',
        name: 'Esmalte Rojo Pasión',
        returned: false
      },
      {
        id: '2',
        barcode: 'BC001',
        name: 'Base Coat Premium',
        returned: false
      },
      {
        id: '3',
        barcode: 'BC002',
        name: 'Top Coat Brillante',
        returned: true
      },
      {
        id: '4',
        barcode: 'BC002',
        name: 'Removedor de Cutícula',
        returned: false
      }
    ]
    
    loadInspection(kitId, mockItems)
  }, [kitId, loadInspection])

  const handleMarkAllReturned = () => {
    markAllReturned(kitId)
    toast({
      title: "Kit devuelto",
      description: "Todos los productos han sido marcados como devueltos",
    })
    router.push('/kits')
  }

  const progress = getInspectionProgress()
  const groupedItems = inspectionItems.reduce((acc, item) => {
    if (!acc[item.barcode]) {
      acc[item.barcode] = []
    }
    acc[item.barcode].push(item)
    return acc
  }, {} as Record<string, typeof inspectionItems>)

  if (inspectionLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonKitInspectionGroup key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/kits" className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              Volver a kits
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE]">
              Inspeccionar Kit {kitId.slice(-8)}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <Progress value={progress.percentage} className="w-48" />
              <span className="text-sm text-[#687076] dark:text-[#9BA1A6]">
                {progress.returned} de {progress.total} devueltos
              </span>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={handleMarkAllReturned}
          className="bg-[#0a7ea4] hover:bg-[#0a7ea4]/90"
        >
          <PackageCheck className="h-4 w-4 mr-2" />
          Marcar todo como devuelto
        </Button>
      </div>

      {/* Inspection Groups */}
      <div className="space-y-4">
        {Object.entries(groupedItems).map(([barcode, items]) => {
          const allReturned = items.every(item => item.returned)
          const someReturned = items.some(item => item.returned)
          const isIndeterminate = someReturned && !allReturned

          return (
            <Card key={barcode} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={allReturned}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate
                      }}
                      onCheckedChange={() => toggleInspectionGroup(barcode)}
                    />
                    <div>
                      <CardTitle className="text-base text-[#11181C] dark:text-[#ECEDEE]">
                        Código de barras {barcode}
                      </CardTitle>
                      <p className="text-sm text-[#687076] dark:text-[#9BA1A6]">
                        {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-[#11181C] dark:text-[#ECEDEE]">
                    {items.filter(item => item.returned).length}/{items.length}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#F9FAFB] dark:bg-[#1E1F20] transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={item.returned}
                          onCheckedChange={() => toggleInspectionItem(item.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#687076] dark:text-[#9BA1A6] font-mono">
                            {item.id.slice(-8)}
                          </p>
                          <p className="text-sm font-medium text-[#11181C] dark:text-[#ECEDEE] truncate">
                            {item.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-[#687076] dark:text-[#9BA1A6]">
                        {item.returned ? 'Devuelto' : 'Pendiente'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
