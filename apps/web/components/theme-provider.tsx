"use memo"
"use client"

import type React from "react"
import { useEffect } from "react"
import { useThemeStore } from "@/stores/theme-store"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isDark, initializeTheme } = useThemeStore()

  useEffect(() => {
    initializeTheme()
    if (isDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDark, initializeTheme])

  return <>{children}</>
}
