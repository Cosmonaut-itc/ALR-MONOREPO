"use client"

import { CalendarDays, Package, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Kit } from "@/stores/kits-store"

interface KitCardProps {
  kit: Kit
}

export function KitCard({ kit }: KitCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
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
            <CalendarDays className="h-3 w-3 mr-1" />
            {formatDate(kit.date)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Employee Info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(kit.employeeName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{kit.employeeName}</p>
            <p className="text-xs text-muted-foreground">Empleada asignada</p>
          </div>
        </div>

        {/* Products Summary */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {kit.items.length} productos diferentes
            </span>
          </div>
          <Badge variant="secondary" className="font-medium">
            {kit.totalProducts} total
          </Badge>
        </div>

        {/* Products Preview */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Productos:</p>
          <div className="flex flex-wrap gap-1">
            {kit.items.slice(0, 3).map((item, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {item.productName} ({item.qty})
              </Badge>
            ))}
            {kit.items.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{kit.items.length - 3} más
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
