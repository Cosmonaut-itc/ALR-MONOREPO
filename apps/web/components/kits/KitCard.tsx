"use memo"
"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, Calendar, Eye } from 'lucide-react'
import { useKitsStore } from "@/stores/kits-store"
import Link from 'next/link'
import type { Kit } from "@/lib/schemas"

interface KitCardProps {
  kit: Kit
}

export function KitCard({ kit }: KitCardProps) {
  const { employees, products } = useKitsStore()
  
  const employee = employees.find(emp => emp.id === kit.employeeId)
  const totalProducts = kit.items.reduce((sum, item) => sum + item.qty, 0)
  
  const formatDate = (dateValue: string | Date) => {
    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    return date.toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  const getProductNames = () => {
    const names = kit.items.map(item => {
      const product = products.find(p => p.id === item.productId)
      return product?.name || 'Producto desconocido'
    })
    
    if (names.length <= 2) {
      return names.join(', ')
    }
    
    return `${names.slice(0, 2).join(', ')} y ${names.length - 2} más`
  }

  if (!employee) {
    return null
  }

  return (
    <Card className="card-transition hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={employee.avatar || "/placeholder.svg"} alt={employee.name} />
            <AvatarFallback className="bg-[#0a7ea4] text-white">
              {employee.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate text-[#11181C] dark:text-[#ECEDEE]">
              {employee.name}
            </h3>
            <Badge variant="secondary" className="text-xs mt-1">
              {employee.specialty}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#687076] dark:text-[#9BA1A6]">Kit ID:</span>
          <span className="font-mono text-xs text-[#11181C] dark:text-[#ECEDEE]">
            {kit.id.slice(-8)}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-[#687076] dark:text-[#9BA1A6]">
            <Package className="h-3 w-3" />
            <span>Productos:</span>
          </div>
          <span className="font-medium text-[#11181C] dark:text-[#ECEDEE]">
            {totalProducts}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-[#687076] dark:text-[#9BA1A6]">
            <Calendar className="h-3 w-3" />
            <span>Fecha:</span>
          </div>
          <span className="text-[#11181C] dark:text-[#ECEDEE]">
            {formatDate(kit.date)}
          </span>
        </div>
        
        <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#2D3033]">
          <p className="text-xs text-[#687076] dark:text-[#9BA1A6] truncate">
            {getProductNames()}
          </p>
        </div>
        
        <div className="pt-3">
          <Button asChild size="sm" className="w-full">
            <Link href={`/kits/${kit.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              Inspeccionar Kit
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
