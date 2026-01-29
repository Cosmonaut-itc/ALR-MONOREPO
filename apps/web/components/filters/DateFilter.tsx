"use client";

import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export type DateFilterValue = {
	mode: "before" | "after" | "between" | "on";
	from?: string; // ISO yyyy-MM-dd
	to?: string; // ISO yyyy-MM-dd
};

type DateFilterProps = {
	label: string;
	value?: DateFilterValue | null;
	onChange: (value: DateFilterValue | null) => void;
};

const toISO = (date: Date | undefined | null): string | undefined =>
	date ? date.toISOString().slice(0, 10) : undefined;

export function DateFilter({ label, value, onChange }: DateFilterProps) {
	const [mode, setMode] = useState<DateFilterValue["mode"]>(
		value?.mode ?? "on",
	);
	const [singleDate, setSingleDate] = useState<Date | undefined>(
		value?.from ? new Date(`${value.from}T00:00:00Z`) : undefined,
	);
	const [range, setRange] = useState<DateRange | undefined>(
		value?.mode === "between"
			? {
				from: value?.from ? new Date(`${value.from}T00:00:00Z`) : undefined,
				to: value?.to ? new Date(`${value.to}T00:00:00Z`) : undefined,
			}
			: undefined,
	);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		setMode(value?.mode ?? "on");
		setSingleDate(value?.from ? new Date(`${value.from}T00:00:00Z`) : undefined);
		setRange(
			value?.mode === "between"
				? {
					from: value?.from ? new Date(`${value.from}T00:00:00Z`) : undefined,
					to: value?.to ? new Date(`${value.to}T00:00:00Z`) : undefined,
				}
				: undefined,
		);
	}, [value?.mode, value?.from, value?.to]);

	useEffect(() => {
		// Emit only when we have the minimal data required per mode
		if (!mode) {
			onChange(null);
			return;
		}
		if (mode === "between") {
			if (range?.from && range?.to) {
				onChange({ mode, from: toISO(range.from), to: toISO(range.to) });
			} else {
				onChange(null);
			}
			return;
		}
		if (singleDate) {
			onChange({ mode, from: toISO(singleDate) });
		} else {
			onChange(null);
		}
	}, [mode, range?.from, range?.to, singleDate, onChange]);

	const summary = useMemo(() => {
		if (mode === "between") {
			const from = range?.from ? toISO(range.from) : "";
			const to = range?.to ? toISO(range.to) : "";
			if (from && to) return `Entre ${from} y ${to}`;
			return "Selecciona rango";
		}
		if (singleDate) return `${toISO(singleDate)}`;
		return "Selecciona fecha";
	}, [mode, range?.from, range?.to, singleDate]);

	return (
		<div className="space-y-2">
			<Label className="text-[#11181C] dark:text-[#ECEDEE]">{label}</Label>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
				<Select
					onValueChange={(newMode) => setMode(newMode as DateFilterValue["mode"])}
					value={mode}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Selecciona un modo" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="on">Exacta</SelectItem>
						<SelectItem value="before">Antes de</SelectItem>
						<SelectItem value="after">Después de</SelectItem>
						<SelectItem value="between">Entre</SelectItem>
					</SelectContent>
				</Select>
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogTrigger asChild>
						<Button variant="outline" className="w-full sm:w-auto sm:flex-shrink-0">
							{summary}
						</Button>
					</DialogTrigger>
					<DialogContent className="w-fit max-w-[calc(100%-2rem)] sm:max-w-[650px]">
						<DialogHeader>
							<DialogTitle>Selecciona fecha</DialogTitle>
						</DialogHeader>
						<div className="flex justify-center">
							{mode === "between" ? (
								<Calendar
									mode="range"
									numberOfMonths={2}
									selected={range}
									onSelect={(date: DateRange | undefined) => {
										setRange(date);
										if (date?.from && date?.to) {
											setOpen(false);
										}
									}}
									captionLayout="dropdown"
									className="rounded-md border"
								/>
							) : (
								<Calendar
									mode="single"
									numberOfMonths={1}
									selected={singleDate}
									onSelect={(date: Date | undefined) => {
										setSingleDate(date ?? undefined);
										if (date) {
											setOpen(false);
										}
									}}
									captionLayout="dropdown"
									className="rounded-md border"
								/>
							)}
						</div>
						<div className="text-xs text-[#687076] dark:text-[#9BA1A6]">
							Las comparaciones son inclusivas y usan el día completo (zona UTC).
						</div>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}
