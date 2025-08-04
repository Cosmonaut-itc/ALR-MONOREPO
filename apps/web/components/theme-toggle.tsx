"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useThemeStore } from "@/stores/theme-store"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9 theme-transition">
        <Sun className="h-4 w-4 icon-transition" />
        <span className="sr-only">Alternar tema</span>
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9 text-[#687076] dark:text-[#9BA1A6] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] theme-transition relative overflow-hidden"
    >
      <div className="relative w-4 h-4">
        <Sun
          className={`h-4 w-4 absolute inset-0 transition-all duration-300 ease-in-out ${
            isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          }`}
        />
        <Moon
          className={`h-4 w-4 absolute inset-0 transition-all duration-300 ease-in-out ${
            isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
          }`}
        />
      </div>
      <span className="sr-only">Alternar tema</span>
    </Button>
  )
}
