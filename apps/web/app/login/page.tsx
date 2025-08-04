"use client"

import type React from "react"

import { useState } from "react"
import { Eye, EyeOff, Lock, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    emailOrUsername: "",
    password: "",
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Datos de inicio de sesión:", formData)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#151718] theme-transition flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] shadow-lg card-transition">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="h-12 w-12 bg-[#0a7ea4] rounded-full flex items-center justify-center theme-transition">
                <Lock className="h-6 w-6 text-white icon-transition" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
                Iniciar Sesión
              </CardTitle>
              <CardDescription className="text-[#687076] dark:text-[#9BA1A6] text-transition">
                Ingresa tus credenciales para acceder al sistema de inventario
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="emailOrUsername"
                  className="text-sm font-medium text-[#11181C] dark:text-[#ECEDEE] text-transition"
                >
                  Correo Electrónico / Usuario
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#687076] dark:text-[#9BA1A6] icon-transition" />
                  <Input
                    id="emailOrUsername"
                    type="text"
                    placeholder="correo@ejemplo.com o usuario123"
                    value={formData.emailOrUsername}
                    onChange={(e) => handleInputChange("emailOrUsername", e.target.value)}
                    className="pl-10 border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] placeholder:text-[#687076] dark:placeholder:text-[#9BA1A6] focus:ring-[#0a7ea4] focus:border-[#0a7ea4] input-transition"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-[#11181C] dark:text-[#ECEDEE] text-transition"
                >
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#687076] dark:text-[#9BA1A6] icon-transition" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="pl-10 pr-10 border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] placeholder:text-[#687076] dark:placeholder:text-[#9BA1A6] focus:ring-[#0a7ea4] focus:border-[#0a7ea4] input-transition"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent theme-transition"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-[#687076] dark:text-[#9BA1A6] icon-transition" />
                    ) : (
                      <Eye className="h-4 w-4 text-[#687076] dark:text-[#9BA1A6] icon-transition" />
                    )}
                    <span className="sr-only">{showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <Button
                  type="submit"
                  className="w-full bg-[#0a7ea4] hover:bg-[#0a7ea4]/90 text-white font-medium h-11 theme-transition"
                >
                  Iniciar Sesión
                </Button>

                <div className="text-center">
                  <Button
                    variant="link"
                    className="text-sm text-[#0a7ea4] hover:text-[#0a7ea4]/90 p-0 h-auto font-normal theme-transition"
                  >
                    ¿Olvidaste tu contraseña?
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
