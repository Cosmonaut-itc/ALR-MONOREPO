"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Package, Users, TrendingUp } from 'lucide-react';
import { useKitsStore } from "@/stores/kits-store";
import { AssignKitModal } from "@/components/kits/AssignKitModal";
import { KitCard } from "@/components/kits/KitCard";
import { SkeletonKitCard } from "@/ui/skeletons/Skeleton.KitCard";

export default function KitsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { kits, setDraft } = useKitsStore();

  // Filter kits by selected date
  const filteredKits = kits.filter(kit => kit.date === selectedDate);
  
  // Statistics
  const totalKitsToday = filteredKits.length;
  const totalProductsAssigned = filteredKits.reduce((sum, kit) => 
    sum + kit.items.reduce((itemSum, item) => itemSum + item.qty, 0), 0
  );
  const uniqueEmployees = new Set(filteredKits.map(kit => kit.employeeId)).size;

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setDraft({ date });
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asignación de Kits</h1>
          <p className="text-muted-foreground">
            Gestiona los kits diarios para las empleadas del salón
          </p>
        </div>
        <AssignKitModal>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Crear Asignación
          </Button>
        </AssignKitModal>
      </div>

      {/* Top Bar */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-auto"
          />
        </div>
        <Badge variant="outline">
          {new Date(selectedDate).toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Badge>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kits Asignados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalKitsToday}</div>
            <p className="text-xs text-muted-foreground">
              kits para hoy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProductsAssigned}</div>
            <p className="text-xs text-muted-foreground">
              productos asignados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleadas Activas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueEmployees}</div>
            <p className="text-xs text-muted-foreground">
              con kits asignados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Kit</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalKitsToday > 0 ? Math.round(totalProductsAssigned / totalKitsToday) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              productos por kit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Kits Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Kits del {new Date(selectedDate).toLocaleDateString('es-MX')}
          </h2>
          <Badge variant="secondary">
            {filteredKits.length} kits
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonKitCard key={i} />
            ))}
          </div>
        ) : filteredKits.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredKits.map((kit) => (
              <KitCard key={kit.id} kit={kit} />
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">No hay kits asignados</CardTitle>
              <CardDescription className="text-center">
                No se encontraron kits para la fecha seleccionada
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <AssignKitModal>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primer Kit
                </Button>
              </AssignKitModal>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
