"use client"

import { Calendar, Package, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import * as t from 'io-ts'
import { kitSchema } from "@/lib/schemas"

type Kit = t.TypeOf<typeof kitSchema>

// Mock data for employees (same as in modal)
const mockEmployees = [
  { id: "emp-001", name: "María González", role: "Manicurista Senior" },
  { id: "emp-002", name: "Ana Rodríguez", role: "Especialista en Uñas" },
  { id: "emp-003", name: "Carmen López", role: "Técnica en Manicure" },
  { id: "emp-004", name: "Sofia Martínez", role: "Estilista de Uñas" },
  { id: "emp-005", name: "Isabella Torres", role: "Manicurista" }
]

interface KitCardProps {
  kit: Kit
}

export function KitCard({ kit }: KitCardProps) {
  const employee = mockEmployees.find(e => e.id === kit.employeeId)
  const totalProducts = kit.items.reduce((sum, item) => sum + item.qty, 0)
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-MX', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Kit #{kit.id.slice(-6)}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate(kit.date)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Employee Info */}
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {employee ? getInitials(employee.name) : 'NN'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {employee?.name || 'Empleada no encontrada'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {employee?.role || 'Sin rol asignado'}
            </p>
          </div>
        </div>

        {/* Kit Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>{kit.items.length} productos únicos</span>
          </div>
          <Badge variant="secondary" className="font-medium">
            {totalProducts} total
          </Badge>
        </div>

        {/* Products Preview */}
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Productos: </span>
          {kit.items.slice(0, 2).map((item, index) => (
            <span key={item.productId}>
              {index > 0 && ', '}
              {item.qty}x Producto
            </span>
          ))}
          {kit.items.length > 2 && (
            <span> y {kit.items.length - 2} más...</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
