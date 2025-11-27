"use client";

import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export type SelectFilterOption<TValue> = {
	label: string;
	value: TValue;
};

type SelectFilterProps<TValue> = {
	label: string;
	placeholder?: string;
	options: Array<SelectFilterOption<TValue>>;
	value?: TValue | null;
	onChange: (value: TValue | null) => void;
};

const CLEAR_VALUE = "__ALL__";

export function SelectFilter<TValue>({
	label,
	placeholder = "Selecciona una opción",
	options,
	value,
	onChange,
}: SelectFilterProps<TValue>) {
	return (
		<div className="space-y-2">
			<Label className="text-[#11181C] dark:text-[#ECEDEE]">{label}</Label>
			<Select
				onValueChange={(newValue) => {
					if (newValue === CLEAR_VALUE) {
						onChange(null);
						return;
					}
					const match = options.find(
						(option) => String(option.value) === newValue,
					);
					onChange(match ? match.value : null);
				}}
				value={value == null ? CLEAR_VALUE : String(value)}
			>
				<SelectTrigger className="w-full">
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={CLEAR_VALUE}>Todas</SelectItem>
					{options.map((option) => (
						<SelectItem key={String(option.value)} value={String(option.value)}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
