'use client';
'use memo';

import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Type for product catalog items in combobox
type ProductCatalogItem = {
	barcode: number;
	name: string;
	category: string;
	description: string;
};

interface ProductComboboxProps {
	products: ProductCatalogItem[];
	value: string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	onSelectProduct?: (product: {
		barcode: number;
		name: string;
		category: string;
	}) => void;
}

export function ProductCombobox({
	products,
	value,
	onValueChange,
	placeholder = 'Buscar producto...',
	onSelectProduct,
}: ProductComboboxProps) {
	const [open, setOpen] = useState(false);

	const searchOptions = useMemo(() => {
		const options: Array<{
			value: string;
			label: string;
			barcode: number;
			category: string;
			productName: string;
		}> = [];

		for (const product of products) {
			// Add option for product name
			options.push({
				value: product.name.toLowerCase(),
				label: product.name,
				barcode: product.barcode,
				category: product.category,
				productName: product.name,
			});

			// Add option for barcode
			options.push({
				value: product.barcode.toString(),
				label: `${product.barcode} - ${product.name}`,
				barcode: product.barcode,
				category: product.category,
				productName: product.name,
			});
		}

		return options;
	}, [products]);

	const selectedOption = searchOptions.find(
		(option) => option.value === value.toLowerCase() || option.value === value,
	);

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					aria-expanded={open}
					className="input-transition w-full justify-between border-[#E5E7EB] bg-white text-[#11181C] hover:bg-[#F9FAFB] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
					variant="outline"
				>
					<div className="flex items-center gap-2">
						<Search className="h-4 w-4 text-[#687076] dark:text-[#9BA1A6]" />
						<span className="truncate">
							{value ? selectedOption?.label || value : placeholder}
						</span>
					</div>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-full border-[#E5E7EB] bg-white p-0 dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<Command className="bg-white dark:bg-[#1E1F20]">
					<CommandInput
						className="border-0 text-[#11181C] placeholder:text-[#687076] focus:ring-0 dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
						placeholder="Buscar por nombre o código de barras..."
					/>
					<CommandList>
						<CommandEmpty className="py-6 text-center text-[#687076] text-sm dark:text-[#9BA1A6]">
							No se encontraron productos.
						</CommandEmpty>
						<CommandGroup>
							{searchOptions.map((option) => (
								<CommandItem
									className="cursor-pointer text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
									key={`${option.barcode}-${option.value}`}
									onSelect={() => {
										if (onSelectProduct) {
											onSelectProduct({
												barcode: option.barcode,
												name: option.productName,
												category: option.category,
											});
											onValueChange('');
											setOpen(false);
											return;
										}
										const normalizedValue = value.toLowerCase();
										const newValue =
											option.value === normalizedValue || option.value === value
												? ''
												: option.value;
										onValueChange(newValue);
										setOpen(false);
									}}
									value={option.value}
								>
									<div className="flex w-full items-center justify-between">
										<div className="flex flex-col">
											<span className="font-medium">{option.label}</span>
											<span className="text-[#687076] text-xs dark:text-[#9BA1A6]">
												{option.category}
											</span>
										</div>
										<Check
											className={cn(
												'ml-2 h-4 w-4',
												value.toLowerCase() === option.value ||
													value === option.value
													? 'opacity-100'
													: 'opacity-0',
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
	);
}
