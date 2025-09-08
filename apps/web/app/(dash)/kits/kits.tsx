'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AssignKitModal } from '@/components/kits/AssignKitModal';
import { KitCard } from '@/components/kits/KitCard';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getAllKits } from '@/lib/fetch-functions/kits';
import { createQueryKey } from '@/lib/helpers';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { useKitsStore } from '@/stores/kits-store';

// Infer API response type from fetcher
type APIResponse = Awaited<ReturnType<typeof getAllKits>> | null;

export default function KitsPageClient() {
	const { setDraft } = useKitsStore();
	const [date, setDate] = useState<Date>(new Date());
	const [modalOpen, setModalOpen] = useState(false);

	const { data: kitsResponse } = useSuspenseQuery<APIResponse, Error, APIResponse>({
		queryKey: createQueryKey(queryKeys.kits, []),
		queryFn: () => getAllKits(),
	});

	// Normalize the API response into the shape the UI expects
	const kits = useMemo(() => {
		const root = kitsResponse ?? { data: [] };
		const list: unknown = (root as { data?: unknown }).data ?? [];
		return Array.isArray(list)
			? (list as Array<{
					id: string;
					employeeId: string;
					date: string;
					items: Array<{ productId: string; qty: number }>;
				}>)
			: [];
	}, [kitsResponse]);

	const handleDateSelect = (selectedDate: Date | undefined) => {
		if (selectedDate) {
			setDate(selectedDate);
			// Store as Date in draft to satisfy kit schema type
			setDraft({ date: selectedDate as unknown as Date });
		}
	};

	const todayKits = kits.filter((kit) => {
		const kitDate = new Date(kit.date).toDateString();
		const selectedDate = date.toDateString();
		return kitDate === selectedDate;
	});

	const totalKits = todayKits.length;
	const totalProducts = todayKits.reduce(
		(sum, kit) =>
			sum +
			kit.items.reduce(
				(kitSum, item) => kitSum + (typeof item.qty === 'number' ? item.qty : 0),
				0,
			),
		0,
	);
	const activeEmployees = new Set(todayKits.map((kit) => kit.employeeId)).size;

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-[#11181C] dark:text-[#ECEDEE]">
						Kits Diarios
					</h1>
					<p className="text-[#687076] dark:text-[#9BA1A6]">
						Gestiona las asignaciones diarias de productos para el equipo
					</p>
				</div>
				<Button className="gap-2" onClick={() => setModalOpen(true)}>
					<Plus className="h-4 w-4" />
					Crear Asignación
				</Button>
			</div>

			{/* Top Bar */}
			<div className="flex items-center gap-4">
				<Popover>
					<PopoverTrigger asChild>
						<Button
							className={cn(
								'w-[240px] justify-start text-left font-normal',
								!date && 'text-muted-foreground',
							)}
							variant="outline"
						>
							<CalendarIcon className="mr-2 h-4 w-4" />
							{date ? format(date, 'PPP', { locale: es }) : 'Seleccionar fecha'}
						</Button>
					</PopoverTrigger>
					<PopoverContent align="start" className="w-auto p-0">
						<Calendar
							initialFocus
							locale={es}
							mode="single"
							onSelect={handleDateSelect}
							selected={date}
						/>
					</PopoverContent>
				</Popover>
			</div>

			{/* Statistics Cards */}
			<div className="grid gap-4 md:grid-cols-3">
				<Card className="card-transition">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-[#687076] text-sm dark:text-[#9BA1A6]">
							Kits Asignados
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl text-[#11181C] dark:text-[#ECEDEE]">
							{totalKits}
						</div>
						<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
							para {format(date, "d 'de' MMMM", { locale: es })}
						</p>
					</CardContent>
				</Card>

				<Card className="card-transition">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-[#687076] text-sm dark:text-[#9BA1A6]">
							Total Productos
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl text-[#11181C] dark:text-[#ECEDEE]">
							{totalProducts}
						</div>
						<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
							productos asignados
						</p>
					</CardContent>
				</Card>

				<Card className="card-transition">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-[#687076] text-sm dark:text-[#9BA1A6]">
							Empleadas Activas
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl text-[#11181C] dark:text-[#ECEDEE]">
							{activeEmployees}
						</div>
						<p className="text-[#687076] text-xs dark:text-[#9BA1A6]">
							con kits asignados
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Kits Grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{todayKits.map((kit) => (
					<KitCard
						key={kit.id}
						kit={{
							id: kit.id,
							employeeId: kit.employeeId,
							date: new Date(kit.date).toISOString() as unknown as Date,
							items: kit.items,
						}}
					/>
				))}
			</div>

			{/* Assign Kit Modal */}
			<AssignKitModal onOpenChange={setModalOpen} open={modalOpen} />
		</div>
	);
}
