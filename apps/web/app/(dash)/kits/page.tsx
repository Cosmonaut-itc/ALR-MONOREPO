"use client"

import { useState } from "react"
import { Plus, Calendar, Package } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useKitsStore } from "@/stores/kits-store"
import { AssignKitModal } from "@/components/kits/AssignKitModal"
import { KitCard } from "@/components/kits/KitCard"
import { SkeletonKitCard } from "@/ui/skeletons/Skeleton.KitCard"

export default function KitsPage() {
  const { kits, isLoading, setDraft } = useKitsStore()
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    setDraft({ date })
  }

  const filteredKits = kits.filter(kit => kit.date === selectedDate)

  const totalKitsToday = filteredKits.length
  const totalProductsAssigned = filteredKits.reduce((sum, kit) => sum + kit.totalProducts, 0)
  const uniqueEmployees = new Set(filteredKits.map(kit => kit.employeeId)).size

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Asignación de Kits</h1>
            <p className="text-muted-foreground">
              Gestiona los kits diarios para las empleadas
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonKitCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asignación de Kits</h1>
          <p className="text-muted-foreground">
            Gestiona los kits diarios para las empleadas del salón
          </p>
        </div>
      </div>

      {/* Top Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros y Acciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="date-picker">Fecha</Label>
              <Input
                id="date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="mt-1"
              />
            </div>
            <AssignKitModal>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Crear Asignación
              </Button>
            </AssignKitModal>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kits Asignados Hoy</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalKitsToday}</div>
            <p className="text-xs text-muted-foreground">
              {selectedDate === new Date().toISOString().split('T')[0] 
                ? 'Para el día de hoy' 
                : `Para ${new Date(selectedDate).toLocaleDateString('es-MX')}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Asignados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProductsAssigned}</div>
            <p className="text-xs text-muted-foreground">
              Total de productos en kits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleadas Activas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueEmployees}</div>
            <p className="text-xs text-muted-foreground">
              Con kits asignados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Kits Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Kits del {new Date(selectedDate).toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h2>
        </div>

        {filteredKits.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay kits asignados</h3>
              <p className="text-muted-foreground text-center mb-4">
                No se han creado kits para la fecha seleccionada.
              </p>
              <AssignKitModal>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Kit
                </Button>
              </AssignKitModal>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredKits.map((kit) => (
              <KitCard key={kit.id} kit={kit} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
