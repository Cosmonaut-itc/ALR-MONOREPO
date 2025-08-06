"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthStore } from "@/stores/auth-store"

export default function DashboardPage() {
  const { user } = useAuthStore()

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 bg-white dark:bg-[#151718] theme-transition">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
          Dashboard
        </h1>
        <p className="text-[#687076] dark:text-[#9BA1A6] text-transition">
          Bienvenido de vuelta, {user?.name || 'Usuario'}
        </p>
      </div>
      
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
          <CardHeader>
            <CardTitle className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
              Inventario Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0a7ea4]">1,234</div>
            <p className="text-xs text-[#687076] dark:text-[#9BA1A6] text-transition">
              productos en stock
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
          <CardHeader>
            <CardTitle className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
              Transferencias Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0a7ea4]">23</div>
            <p className="text-xs text-[#687076] dark:text-[#9BA1A6] text-transition">
              movimientos registrados
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
          <CardHeader>
            <CardTitle className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
              Empleados Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0a7ea4]">12</div>
            <p className="text-xs text-[#687076] dark:text-[#9BA1A6] text-transition">
              usuarios conectados
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="min-h-[100vh] flex-1 rounded-xl bg-[#F9FAFB] dark:bg-[#1E1F20] border border-[#E5E7EB] dark:border-[#2D3033] md:min-h-min theme-transition p-6">
        <h2 className="text-xl font-semibold text-[#11181C] dark:text-[#ECEDEE] text-transition mb-4">
          Actividad Reciente
        </h2>
        <div className="space-y-4">
          {[
            "Transferencia de Martillo Profesional a Almacén B",
            "Recepción de 50 Destornilladores Eléctricos",
            "Kit de Herramientas #123 asignado a Carlos Rodríguez",
            "Inventario actualizado: +25 Taladros Inalámbricos"
          ].map((activity, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-white dark:bg-[#151718] rounded-lg border border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
              <div className="h-2 w-2 rounded-full bg-[#0a7ea4]"></div>
              <span className="text-sm text-[#11181C] dark:text-[#ECEDEE] text-transition">
                {activity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
