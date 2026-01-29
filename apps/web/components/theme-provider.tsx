"use memo"
"use client"

import type React from "react"
import { useEffect } from "react"
import { useThemeStore } from "@/stores/theme-store"
import { useShallow } from "zustand/shallow"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isDark, initializeTheme } = useThemeStore(
    useShallow((state) => ({
      isDark: state.isDark,
      initializeTheme: state.initializeTheme,
    }))
  )

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
