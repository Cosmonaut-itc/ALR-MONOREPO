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

  // Create search options from products
  const searchOptions = React.useMemo(() => {
    const options: Array<{ value: string; label: string; barcode: number; category: string }> = []
    
    products.forEach((product) => {
      // Add option for product name
      options.push({
        value: product.name.toLowerCase(),
        label: product.name,
        barcode: product.barcode,
        category: product.category
      })
      
      // Add option for barcode
      options.push({
        value: product.barcode.toString(),
        label: `${product.barcode} - ${product.name}`,
        barcode: product.barcode,
        category: product.category
      })
    })
    
    return options
  }, [products])

  const selectedOption = searchOptions.find((option) => 
    option.value === value.toLowerCase() || option.value === value
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#151718] text-[#11181C] dark:text-[#ECEDEE] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] focus:ring-[#0a7ea4] focus:border-[#0a7ea4] input-transition"
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[#687076] dark:text-[#9BA1A6]" />
            <span className="truncate">
              {value ? (selectedOption?.label || value) : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-white dark:bg-[#1E1F20] border-[#E5E7EB] dark:border-[#2D3033]">
        <Command className="bg-white dark:bg-[#1E1F20]">
          <CommandInput 
            placeholder="Buscar por nombre o código de barras..." 
            className="border-0 focus:ring-0 text-[#11181C] dark:text-[#ECEDEE] placeholder:text-[#687076] dark:placeholder:text-[#9BA1A6]"
          />
          <CommandList>
            <CommandEmpty className="text-[#687076] dark:text-[#9BA1A6] py-6 text-center text-sm">
              No se encontraron productos.
            </CommandEmpty>
            <CommandGroup>
              {searchOptions.map((option) => (
                <CommandItem
                  key={`${option.barcode}-${option.value}`}
                  value={option.value}
                  onSelect={(currentValue) => {
                    const newValue = currentValue === value.toLowerCase() ? "" : currentValue
                    onValueChange(newValue)
                    setOpen(false)
                  }}
                  className="text-[#11181C] dark:text-[#ECEDEE] hover:bg-[#F9FAFB] dark:hover:bg-[#2D3033] cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-[#687076] dark:text-[#9BA1A6]">
                        {option.category}
                      </span>
                    </div>
                    <Check
                      className={cn(
                        "ml-2 h-4 w-4",
                        (value.toLowerCase() === option.value || value === option.value) 
                          ? "opacity-100" 
                          : "opacity-0"
                      )}
                    />
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
