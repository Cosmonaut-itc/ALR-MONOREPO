"use client"

import { useState } from "react"
import { CalendarDays, Plus, Package } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useKitsStore } from "@/stores/kits-store"
import { KitCard } from "@/components/kits/KitCard"
import { AssignKitModal } from "@/components/kits/AssignKitModal"
import { SkeletonKitCard } from "@/ui/skeletons/Skeleton.KitCard"

export default function KitsPage() {
  const { kits, loading } = useKitsStore()
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  // Filter kits by selected date
  const filteredKits = kits.filter(kit => kit.date === selectedDate)

  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asignación de Kits</h1>
          <p className="text-muted-foreground">
            Gestiona los kits diarios para el personal del salón
          </p>
        </div>
      </div>

      {/* Top Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Seleccionar Fecha
          </CardTitle>
          <CardDescription>
            Elige la fecha para ver y crear asignaciones de kits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-sm">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
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

      {/* Selected Date Display */}
      <div className="flex items-center gap-2 text-lg font-medium">
        <Package className="h-5 w-5" />
        <span>Kits para {formatDateForDisplay(selectedDate)}</span>
        {filteredKits.length > 0 && (
          <span className="text-sm text-muted-foreground font-normal">
            ({filteredKits.length} asignaciones)
          </span>
        )}
      </div>

      {/* Kits Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonKitCard key={i} />
          ))}
        </div>
      ) : filteredKits.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredKits.map((kit) => (
            <KitCard key={kit.id} kit={kit} />
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay kits asignados</h3>
          <p className="text-muted-foreground text-center mb-4">
            No se encontraron asignaciones de kits para la fecha seleccionada.
          </p>
          <AssignKitModal>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Asignación
            </Button>
          </AssignKitModal>
        </Card>
      )}
    </div>
  )
}
