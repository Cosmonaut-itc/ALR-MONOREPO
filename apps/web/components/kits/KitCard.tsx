"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Package, User } from 'lucide-react';
import { useKitsStore } from "@/stores/kits-store";
import type { Kit } from "@/lib/schemas";

interface KitCardProps {
  kit: Kit;
}

export function KitCard({ kit }: KitCardProps) {
  const { employees, products } = useKitsStore();
  
  const employee = employees.find(emp => emp.id === kit.employeeId);
  const totalProducts = kit.items.reduce((sum, item) => sum + item.qty, 0);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage src={employee?.avatar || "/placeholder.svg"} />
            <AvatarFallback>
              {employee?.name?.charAt(0) || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">
              {employee?.name || "Empleada no encontrada"}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {employee?.specialty}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Package className="h-3 w-3" />
            <span>Kit ID:</span>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {kit.id.slice(-8)}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Package className="h-3 w-3" />
            <span>Productos:</span>
          </div>
          <Badge variant="secondary">
            {totalProducts} items
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Fecha:</span>
          </div>
          <span className="font-medium">
            {formatDate(kit.date)}
          </span>
        </div>

        {/* Product details */}
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground mb-2">Productos asignados:</div>
          <div className="space-y-1">
            {kit.items.slice(0, 3).map((item) => {
              const product = products.find(p => p.id === item.productId);
              return (
                <div key={item.productId} className="flex justify-between text-xs">
                  <span className="truncate flex-1 mr-2">
                    {product?.name || "Producto desconocido"}
                  </span>
                  <span className="font-medium">x{item.qty}</span>
                </div>
              );
            })}
            {kit.items.length > 3 && (
              <div className="text-xs text-muted-foreground">
                +{kit.items.length - 3} más...
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
