"use client";

import Fuse from "fuse.js";
import { useDeferredValue, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
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

type ProductItemOption = {
	productStockId: string;
	productName: string;
	barcode: number;
	description: string;
};

type ProductGroupOption = {
	barcode: number;
	description: string;
	name: string;
	items: ProductItemOption[];
};

type SearchableGroup = ProductGroupOption & {
	barcodeText: string;
};

type BivariantOnSelect = {
	bivarianceHack: (item: ProductItemOption) => void;
}["bivarianceHack"];

interface GroupedProductComboboxProps {
	groups: ProductGroupOption[];
	selectedId: string;
	onSelect: BivariantOnSelect;
	disabled?: boolean;
	draftedIds?: Set<string>;
	placeholder?: string;
	emptyMessage?: string;
}

export function GroupedProductCombobox({
	groups,
	selectedId,
	onSelect,
	disabled = false,
	draftedIds,
	placeholder = "Selecciona un producto",
	emptyMessage = "No hay productos disponibles.",
}: GroupedProductComboboxProps) {
	const ITEM_RENDER_LIMIT = 50;
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) {
			setQuery("");
		}
	};

	const searchableGroups = useMemo<SearchableGroup[]>(() => {
		return groups.map((group) => ({
			...group,
			barcodeText: group.barcode.toString(),
		}));
	}, [groups]);

	const fuse = useMemo(() => {
		return new Fuse(searchableGroups, {
			keys: [
				{ name: "name", weight: 0.6 },
				{ name: "barcodeText", weight: 0.25 },
				{ name: "description", weight: 0.15 },
			],
			threshold: 0.35,
			ignoreLocation: true,
			includeScore: true,
			minMatchCharLength: 1,
		});
	}, [searchableGroups]);

	const filteredGroups = useMemo(() => {
		const normalizedQuery = deferredQuery.trim();
		if (!normalizedQuery) {
			return searchableGroups;
		}
		return fuse.search(normalizedQuery, { limit: 150 }).map((result) => result.item);
	}, [deferredQuery, fuse, searchableGroups]);

	const limitedGroups = useMemo(() => {
		let remaining = ITEM_RENDER_LIMIT;
		const results: ProductGroupOption[] = [];
		for (const group of filteredGroups) {
			if (remaining <= 0) {
				break;
			}
			const items: ProductItemOption[] = [];
			for (const item of group.items) {
				if (remaining <= 0 || items.length >= ITEM_RENDER_LIMIT) {
					break;
				}
				items.push(item);
				remaining -= 1;
			}
			if (items.length > 0) {
				results.push({ ...group, items });
			}
		}
		return results;
	}, [filteredGroups, ITEM_RENDER_LIMIT]);

	const selectedItem = (() => {
		for (const group of groups) {
			const found = group.items.find(
				(item) => item.productStockId === selectedId,
			);
			if (found) {
				return { item: found, group };
			}
		}
		return null;
	})();

	const allItemsDisabled =
		disabled ||
		(groups.length === 0 ||
			groups.every((group) =>
				group.items.every((item) => draftedIds?.has(item.productStockId)),
			));

	return (
		<Popover onOpenChange={handleOpenChange} open={open}>
			<PopoverTrigger asChild>
				<Button
					aria-expanded={open}
					className="input-transition w-full justify-between border-[#E5E7EB] bg-white text-left text-[#11181C] hover:bg-[#F9FAFB] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
					disabled={allItemsDisabled}
					variant="outline"
				>
					<div className="flex min-w-0 items-center gap-2">
						<Search className="h-4 w-4 text-[#687076] dark:text-[#9BA1A6]" />
						<span className="truncate">
							{selectedItem
								? selectedItem.item.productName
								: allItemsDisabled
									? emptyMessage
									: placeholder}
						</span>
					</div>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[360px] border-[#E5E7EB] bg-white p-0 dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<Command className="bg-white dark:bg-[#1E1F20]" shouldFilter={false}>
					<CommandInput
						className="border-0 text-[#11181C] placeholder:text-[#687076] focus:ring-0 dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
						onValueChange={setQuery}
						placeholder="Buscar por nombre o código del grupo..."
						value={query}
					/>
					<div className="max-h-80 overflow-y-auto">
						<CommandList>
						<CommandEmpty className="py-6 text-center text-[#687076] text-sm dark:text-[#9BA1A6]">
							{emptyMessage}
						</CommandEmpty>
						{limitedGroups.map((group) => (
							<CommandGroup
								heading={
									<div className="px-2 py-1 text-sm font-semibold text-[#11181C] dark:text-[#ECEDEE]">
										{group.name}
									</div>
								}
								key={group.barcode}
							>
								{group.description && (
									<p className="px-2 pb-2 text-[#687076] text-xs dark:text-[#9BA1A6]">
										{group.description}
									</p>
								)}
								{group.items.map((item) => {
									const isDisabled = draftedIds?.has(item.productStockId);
									const isSelected = selectedId === item.productStockId;
									return (
										<CommandItem
											className="cursor-pointer text-[#11181C] hover:bg-[#F9FAFB] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
											disabled={isDisabled}
											key={item.productStockId}
											onSelect={() => {
												if (isDisabled) {
													return;
												}
												onSelect(item);
												setOpen(false);
												setQuery("");
											}}
											value={item.productStockId}
										>
											<div className="flex w-full items-center justify-between gap-2">
												<span className="font-mono text-sm">
													{item.productStockId}
												</span>
												{isDisabled ? (
													<span className="text-[#9BA1A6] text-xs dark:text-[#71767B]">
														En traspaso
													</span>
												) : (
													<Check
														className={cn(
															"h-4 w-4 text-[#0a7ea4]",
															isSelected ? "opacity-100" : "opacity-0",
														)}
													/>
												)}
											</div>
										</CommandItem>
									);
								})}
							</CommandGroup>
						))}
						</CommandList>
					</div>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
