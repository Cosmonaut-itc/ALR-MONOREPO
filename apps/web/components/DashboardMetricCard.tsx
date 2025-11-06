'use memo';

import { Card, CardContent } from "@/components/ui/card"
import { Package, Archive, Clock, AlertTriangle, type LucideIcon } from 'lucide-react'
import type { DashboardMetric } from "@/lib/schemas"

const iconMap: Record<string, LucideIcon> = {
  package: Package,
  archive: Archive,
  clock: Clock,
  alert: AlertTriangle,
}

interface DashboardMetricCardProps {
  metric: DashboardMetric
}

export function DashboardMetricCard({ metric }: DashboardMetricCardProps) {
  const IconComponent = iconMap[metric.icon] || Package

  return (
    <Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-[#F9FAFB] dark:bg-[#1E1F20] card-transition">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-[#0a7ea4]/10 rounded-lg">
            <IconComponent className="h-6 w-6 text-[#0a7ea4]" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-[#687076] dark:text-[#9BA1A6] text-transition">
              {metric.label}
            </p>
            <p className="text-2xl font-bold text-[#11181C] dark:text-[#ECEDEE] text-transition">
              {metric.value.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
