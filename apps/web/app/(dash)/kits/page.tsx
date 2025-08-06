"use client"

import { useState } from "react"
import { CalendarIcon, Plus } from 'lucide-react'
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useKitsStore } from "@/stores/kits-store"
import { AssignKitModal } from "@/components/kits/AssignKitModal"
import { KitCard } from "@/components/kits/KitCard"
import { SkeletonKitCard } from "@/ui/skeletons/Skeleton.KitCard"

export default function KitsPage() {
  const { kits, setDraft } = useKitsStore()
  const [date, setDate] = useState<Date>(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate)
      setDraft({ date: selectedDate.toISOString() })
    }
  }

  const todayKits = kits.filter(kit => {
    const kitDate = new Date(kit.date).toDateString()
    const selectedDate = date.toDateString()
    return kitDate === selectedDate
  })

  const totalKits = todayKits.length
  const totalProducts = todayKits.reduce((sum, kit) => 
    sum + kit.items.reduce((kitSum, item) => kitSum + item.qty, 0), 0
  )
  const activeEmployees = new Set(todayKits.map(kit => kit.employeeId)).size

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE]">
            Kits Diarios
          </h1>
          <p className="text-[#687076] dark:text-[#9BA1A6]">
            Gestiona las asignaciones diarias de productos para el equipo
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Crear Asignación
        </Button>
      </div>

      {/* Top Bar */}
      <div className="flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP", { locale: es }) : "Seleccionar fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              initialFocus
              locale={es}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#687076] dark:text-[#9BA1A6]">
              Kits Asignados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE]">
              {totalKits}
            </div>
            <p className="text-xs text-[#687076] dark:text-[#9BA1A6]">
              para {format(date, "d 'de' MMMM", { locale: es })}
            </p>
          </CardContent>
        </Card>

        <Card className="card-transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#687076] dark:text-[#9BA1A6]">
              Total Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE]">
              {totalProducts}
            </div>
            <p className="text-xs text-[#687076] dark:text-[#9BA1A6]">
              productos asignados
            </p>
          </CardContent>
        </Card>

        <Card className="card-transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#687076] dark:text-[#9BA1A6]">
              Empleadas Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE]">
              {activeEmployees}
            </div>
            <p className="text-xs text-[#687076] dark:text-[#9BA1A6]">
              con kits asignados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Kits Grid */}
      <div className="flex-1">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonKitCard key={i} />
            ))}
          </div>
        ) : todayKits.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {todayKits.map((kit) => (
              <KitCard key={kit.id} kit={kit} />
            ))}
          </div>
        ) : (
          <Card className="card-transition">
            <CardHeader className="text-center">
              <CardTitle className="text-[#11181C] dark:text-[#ECEDEE]">
                No hay kits asignados
              </CardTitle>
              <CardDescription className="text-[#687076] dark:text-[#9BA1A6]">
                No se encontraron kits para {format(date, "d 'de' MMMM", { locale: es })}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => setModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Crear Primera Asignación
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Assign Kit Modal */}
      <AssignKitModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  )
}
