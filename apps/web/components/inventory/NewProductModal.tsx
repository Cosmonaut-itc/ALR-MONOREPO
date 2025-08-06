// Create the new product modal component

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface NewProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewProductModal({ open, onOpenChange }: NewProductModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033] theme-transition">
        <DialogHeader>
          <DialogTitle className="text-[#11181C] dark:text-[#ECEDEE] text-transition">
            Nuevo Artículo
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center py-8">
          <p className="text-[#687076] dark:text-[#9BA1A6] text-transition">
            Formulario en desarrollo...
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
