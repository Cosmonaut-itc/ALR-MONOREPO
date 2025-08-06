"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Package, User, Calendar } from 'lucide-react'

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

import { useKitsStore } from "@/stores/kits-store"
import type { Kit } from "@/lib/schemas"

interface KitCardProps {
  kit: Kit
}

export function KitCard({ kit }: KitCardProps) {
  const { getEmployeeById, getProductById } = useKitsStore()
  
  const employee = getEmployeeById(kit.employeeId)
  const totalProducts = kit.items.reduce((sum, item) => sum + item.qty, 0)
  
  if (!employee) return null

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={employee.avatar || "/placeholder.svg"} />
            <AvatarFallback>
              {employee.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{employee.name}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {employee.specialty}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>Kit ID:</span>
          </div>
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {kit.id.split('-')[0]}...
          </code>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Productos:</span>
          </div>
          <Badge variant="secondary">
            {totalProducts} {totalProducts === 1 ? 'producto' : 'productos'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Fecha:</span>
          </div>
          <span className="font-medium">
            {format(new Date(kit.date), "dd MMM yyyy", { locale: es })}
          </span>
        </div>

        {kit.items.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-2">Productos asignados:</div>
            <div className="space-y-1">
              {kit.items.slice(0, 3).map((item) => {
                const product = getProductById(item.productId)
                if (!product) return null
                
                return (
                  <div key={item.productId} className="flex justify-between text-xs">
                    <span className="truncate flex-1 mr-2">{product.name}</span>
                    <span className="text-muted-foreground">×{item.qty}</span>
                  </div>
                )
              })}
              {kit.items.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{kit.items.length - 3} más...
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
