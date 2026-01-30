"use client";

import Fuse from "fuse.js";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Type for product catalog items in combobox
type ProductCatalogItem = {
	barcode: number;
	name: string;
	category: string;
	description: string;
};

type BivariantCallback<T> = {
	// Enables consumers to pass wider/narrower callbacks without type errors
	bivarianceHack(product: T): void;
}["bivarianceHack"];

type SearchableProduct<T extends ProductCatalogItem> = {
	barcode: number;
	barcodeText: string;
	name: string;
	category: string;
	description: string;
	keywords: string[];
	raw: T;
};

interface ProductComboboxProps<T extends ProductCatalogItem = ProductCatalogItem> {
	products: T[];
	value: string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	onSelectProduct?: BivariantCallback<T>;
	getKeywords?: (product: T) => string[];
}

export function ProductCombobox<T extends ProductCatalogItem = ProductCatalogItem>({
	products,
	value,
	onValueChange,
	placeholder = "Buscar producto...",
	onSelectProduct,
	getKeywords,
}: ProductComboboxProps<T>) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) {
			setQuery("");
		}
	};

	const searchableProducts = useMemo(() => {
		return products
			.map<SearchableProduct<T>>((product) => {
				const safeName =
					typeof product.name === "string" && product.name.trim().length > 0
						? product.name.trim()
						: `Producto ${product.barcode}`;
				const safeCategory =
					typeof product.category === "string" &&
					product.category.trim().length > 0
						? product.category.trim()
						: "Sin categoría";
				const safeDescription =
					typeof product.description === "string" &&
					product.description.trim().length > 0
						? product.description.trim()
						: "Sin descripción";
				const extraKeywords = (getKeywords?.(product) ?? [])
					.map((keyword) => keyword?.toString()?.trim())
					.filter(Boolean) as string[];

				return {
					barcode: product.barcode,
					barcodeText: product.barcode.toString(),
					name: safeName,
					category: safeCategory,
					description: safeDescription,
					keywords: [
						safeName,
						safeCategory,
						safeDescription,
						...extraKeywords,
					],
					raw: product,
				};
			})
			.sort((a, b) =>
				a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
			);
	}, [getKeywords, products]);

	const fuse = useMemo(() => {
		return new Fuse(searchableProducts, {
			keys: [
				{ name: "name", weight: 0.5 },
				{ name: "barcodeText", weight: 0.25 },
				{ name: "category", weight: 0.15 },
				{ name: "description", weight: 0.05 },
				{ name: "keywords", weight: 0.05 },
			],
			threshold: 0.35,
			ignoreLocation: true,
			includeScore: true,
			minMatchCharLength: 1,
		});
	}, [searchableProducts]);

	const filteredResults = useMemo(() => {
		const trimmedQuery = query.trim();
		const limit = 80;
		if (!trimmedQuery) {
			return searchableProducts.slice(0, limit);
		}
		return fuse.search(trimmedQuery, { limit }).map((result) => result.item);
	}, [fuse, query, searchableProducts]);

	const selectedOption = searchableProducts.find((option) => {
		const normalizedValue = value.trim().toLowerCase();
		return (
			option.barcodeText === value ||
			option.barcodeText === normalizedValue ||
			option.name.toLowerCase() === normalizedValue
		);
	});

	return (
		<Popover onOpenChange={handleOpenChange} open={open}>
			<PopoverTrigger asChild>
				<Button
					aria-expanded={open}
					className="input-transition w-full justify-between border-[#E5E7EB] bg-white text-[#11181C] hover:bg-[#F9FAFB] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
					variant="outline"
				>
					<div className="flex items-center gap-2">
						<Search className="h-4 w-4 text-[#687076] dark:text-[#9BA1A6]" />
						<span className="truncate">
							{value ? selectedOption?.name || value : placeholder}
						</span>
					</div>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-full border-[#E5E7EB] bg-white p-0 dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<Command
					className="bg-white dark:bg-[#1E1F20]"
					shouldFilter={false}
				>
					<CommandInput
						className="border-0 text-[#11181C] placeholder:text-[#687076] focus:ring-0 dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
						onValueChange={setQuery}
						placeholder="Buscar por nombre o código de barras..."
						value={query}
					/>
					<CommandList className="max-h-80">
						<CommandEmpty className="py-6 text-center text-[#687076] text-sm dark:text-[#9BA1A6]">
							No se encontraron productos.
						</CommandEmpty>
						<CommandGroup>
							{filteredResults.map((option) => (
								<CommandItem
									className="cursor-pointer text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
									key={`${option.barcodeText}-${option.name}-${option.category}`}
									onSelect={() => {
										if (onSelectProduct) {
											onSelectProduct(option.raw);
											onValueChange("");
											setQuery("");
											setOpen(false);
											return;
										}
										const nextValue =
											value === option.barcodeText ? "" : option.barcodeText;
										onValueChange(nextValue);
										setQuery("");
										setOpen(false);
									}}
									value={option.barcodeText}
								>
									<div className="flex w-full items-center justify-between">
										<div className="flex flex-col">
											<span className="font-medium">
												{option.name}
											</span>
											<span className="text-[#687076] text-xs dark:text-[#9BA1A6]">
												{option.category} • {option.barcodeText}
											</span>
										</div>
										<Check
											className={cn(
												"ml-2 h-4 w-4",
												value === option.barcodeText
													? "opacity-100"
													: "opacity-0",
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
