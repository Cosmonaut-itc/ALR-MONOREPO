"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { ProductCatalog } from "@/lib/schemas"

interface ProductComboboxProps {
  products: ProductCatalog[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}

export function ProductCombobox({ 
  products, 
  value, 
  onValueChange, 
  placeholder = "Buscar producto..." 
}: ProductComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedProduct = products.find(
    (product) => product.barcode.toString() === value || product.name.toLowerCase() === value.toLowerCase()
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033]"
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[#687076] dark:text-[#9BA1A6]" />
            <span className="truncate">
              {selectedProduct
                ? `${selectedProduct.name} (${selectedProduct.barcode})`
                : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033]">
        <Command className="bg-transparent">
          <CommandInput 
            placeholder="Buscar por nombre o código..." 
            className="text-[#11181C] dark:text-[#ECEDEE]"
          />
          <CommandList>
            <CommandEmpty className="text-[#687076] dark:text-[#9BA1A6] py-6 text-center text-sm">
              No se encontraron productos.
            </CommandEmpty>
            <CommandGroup>
              {/* Clear selection option */}
              <CommandItem
                value=""
                onSelect={() => {
                  onValueChange("")
                  setOpen(false)
                }}
                className="text-[#687076] dark:text-[#9BA1A6] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033]"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === "" ? "opacity-100" : "opacity-0"
                  )}
                />
                Todos los productos
              </CommandItem>
              
              {products.map((product) => (
                <CommandItem
                  key={product.barcode}
                  value={`${product.name} ${product.barcode}`}
                  onSelect={() => {
                    onValueChange(product.barcode.toString())
                    setOpen(false)
                  }}
                  className="text-[#11181C] dark:text-[#ECEDEE] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033]"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedProduct?.barcode === product.barcode ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{product.name}</span>
                    <span className="text-xs text-[#687076] dark:text-[#9BA1A6]">
                      {product.barcode} • {product.category}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
