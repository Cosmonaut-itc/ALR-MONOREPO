"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Plus, Package, Users, TrendingUp } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { useKitsStore } from "@/stores/kits-store"
import { AssignKitModal } from "@/components/kits/AssignKitModal"
import { KitCard } from "@/components/kits/KitCard"
import { SkeletonKitCard } from "@/ui/skeletons/Skeleton.KitCard"
import { cn } from "@/lib/utils"

export default function KitsPage() {
  const { kits, setDraft } = useKitsStore()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const selectedDateString = format(selectedDate, "yyyy-MM-dd")
  const filteredKits = kits.filter(kit => kit.date === selectedDateString)
  
  const totalKits = filteredKits.length
  const totalProducts = filteredKits.reduce((sum, kit) => 
    sum + kit.items.reduce((kitSum, item) => kitSum + item.qty, 0), 0
  )
  const uniqueEmployees = new Set(filteredKits.map(kit => kit.employeeId)).size

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      setDraft({ date: format(date, "yyyy-MM-dd") })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kits Diarios</h1>
          <p className="text-muted-foreground">
            Gestiona las asignaciones diarias de productos para el equipo
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "PPP", { locale: es })
                ) : (
                  <span>Seleccionar fecha</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>
          
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Asignación
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kits Asignados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalKits}</div>
            <p className="text-xs text-muted-foreground">
              para {format(selectedDate, "dd 'de' MMMM", { locale: es })}
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
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              productos distribuidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Kits Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Asignaciones del {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: es })}
        </h2>
        
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
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay kits asignados</h3>
              <p className="text-muted-foreground text-center mb-4">
                No se encontraron asignaciones para la fecha seleccionada.
              </p>
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primera Asignación
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal */}
      <AssignKitModal 
        open={modalOpen} 
        onOpenChange={setModalOpen}
      />
    </div>
  )
}
