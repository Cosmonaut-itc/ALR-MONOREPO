'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Minus, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getInventoryByWarehouse } from '@/lib/fetch-functions/inventory';
import { getAllEmployees } from '@/lib/fetch-functions/kits';
import { createQueryKey } from '@/lib/helpers';
import { useCreateKit } from '@/lib/mutations/kits';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useKitsStore } from '@/stores/kits-store';

interface AssignKitModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	warehouseId: string;
}

type EmployeesResponse = Awaited<ReturnType<typeof getAllEmployees>> | null;
type InventoryResponse = Awaited<ReturnType<typeof getInventoryByWarehouse>> | null;

export function AssignKitModal({ open, onOpenChange, warehouseId }: AssignKitModalProps) {
	const { draft, setDraft, clearDraft, addKit } = useKitsStore();
	const [employeeOpen, setEmployeeOpen] = useState(false);
	const [kitId, setKitId] = useState('');
	const [selectedProducts, setSelectedProducts] = useState<
		Array<{ productId: string; qty: number }>
	>([]);

	const user = useAuthStore((s) => s.user);
	const userId = user?.id ?? '';

	const { data: employeesRes } = useSuspenseQuery<EmployeesResponse, Error, EmployeesResponse>({
		queryKey: createQueryKey(['employees'], [userId]),
		queryFn: () =>
			userId
				? getAllEmployees(userId)
				: Promise.resolve({ data: [] } as unknown as EmployeesResponse),
	});

	const { data: inventoryRes } = useSuspenseQuery<InventoryResponse, Error, InventoryResponse>({
		queryKey: createQueryKey(queryKeys.inventory, [warehouseId as string]),
		queryFn: () => getInventoryByWarehouse(warehouseId as string),
	});

	const employees = useMemo(() => {
		const root = employeesRes ?? { data: [] };
		const list: unknown = (root as { data?: unknown }).data ?? [];
		return Array.isArray(list)
			? (list as Array<{
					id?: string;
					name?: string;
					surname?: string;
					specialty?: string;
					avatar?: string;
					active?: boolean;
				}>)
			: [];
	}, [employeesRes]);

	const products = useMemo(() => {
		const root = inventoryRes ?? { data: { warehouse: [] as unknown[] } };
		const wh = (root as { data?: { warehouse?: unknown } }).data?.warehouse as
			| Array<{ productStock?: { id?: string }; productName?: string; productBrand?: string }>
			| undefined;
		return Array.isArray(wh)
			? wh.map((row) => ({
					id: String((row.productStock as { id?: string })?.id ?? ''),
					name: String((row as { productName?: string }).productName ?? 'Producto'),
					brand: String((row as { productBrand?: string }).productBrand ?? ''),
					stock: 1,
				}))
			: [];
	}, [inventoryRes]);

	// Generate new kit ID when modal opens
	useEffect(() => {
		if (open) {
			setKitId(uuidv4());
			setSelectedProducts([]);
		}
	}, [open]);

	const selectedEmployee = employees.find((emp) => emp.id === draft.employeeId);

	const handleEmployeeSelect = (employeeId: string) => {
		setDraft({ employeeId });
		setEmployeeOpen(false);
	};

	const handleAddProduct = (productId: string) => {
		const existing = selectedProducts.find((p) => p.productId === productId);
		if (existing) {
			setSelectedProducts((prev) =>
				prev.map((p) => (p.productId === productId ? { ...p, qty: p.qty + 1 } : p)),
			);
		} else {
			setSelectedProducts((prev) => [...prev, { productId, qty: 1 }]);
		}
	};

	const handleUpdateQuantity = (productId: string, qty: number) => {
		if (qty <= 0) {
			setSelectedProducts((prev) => prev.filter((p) => p.productId !== productId));
		} else {
			setSelectedProducts((prev) =>
				prev.map((p) => (p.productId === productId ? { ...p, qty } : p)),
			);
		}
	};

	const { mutateAsync: createKit, isPending } = useCreateKit();

	const handleAssign = async () => {
		if (!draft.employeeId || selectedProducts.length === 0) {
			toast.error('Por favor completa todos los campos requeridos');
			return;
		}
		try {
			await createKit({
				assignedEmployee: draft.employeeId as string,
				observations: 'Kit diario',
				kitItems: selectedProducts.map((p) => ({
					productId: p.productId,
					observations: '',
				})),
			});
			addKit({
				id: kitId,
				employeeId: draft.employeeId as string,
				date: ((draft.date as unknown as Date) || new Date()) as Date,
				items: selectedProducts,
			});
			toast.success('Kit asignado exitosamente');
			onOpenChange(false);
			handleCancel();
		} catch {
			toast.error('Error al crear el kit');
		}
	};

	const handleCancel = () => {
		clearDraft();
		setSelectedProducts([]);
		setKitId('');
		onOpenChange(false);
	};

	const totalProducts = selectedProducts.reduce((sum, item) => sum + item.qty, 0);

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Asignar Kit Diario</DialogTitle>
					<DialogDescription>
						Crea una nueva asignación de kit para una empleada
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Kit ID */}
					<div className="space-y-2">
						<Label htmlFor="kitId">ID del Kit</Label>
						<Input
							className="bg-muted font-mono text-sm"
							id="kitId"
							readOnly
							value={kitId}
						/>
					</div>

					{/* Employee Selection */}
					<div className="space-y-2">
						<Label>Empleada</Label>
						<Popover onOpenChange={setEmployeeOpen} open={employeeOpen}>
							<PopoverTrigger asChild>
								<Button
									aria-expanded={employeeOpen}
									className="w-full justify-between"
									variant="outline"
								>
									{selectedEmployee ? (
										<div className="flex items-center gap-2">
											<Avatar className="h-6 w-6">
												<AvatarImage
													src={
														selectedEmployee.avatar ||
														'/placeholder.svg'
													}
												/>
												<AvatarFallback>
													{(selectedEmployee.name || 'U')
														.split(' ')
														.map((n) => n[0])
														.join('')}
												</AvatarFallback>
											</Avatar>
											<span>{selectedEmployee.name}</span>
											<Badge className="text-xs" variant="secondary">
												{selectedEmployee.specialty}
											</Badge>
										</div>
									) : (
										'Seleccionar empleada...'
									)}
									<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-full p-0">
								<Command>
									<CommandInput placeholder="Buscar empleada..." />
									<CommandList>
										<CommandEmpty>No se encontraron empleadas.</CommandEmpty>
										<CommandGroup>
											{employees
												.filter((emp) => emp.active !== false)
												.map((employee) => (
													<CommandItem
														key={employee.id}
														onSelect={() =>
															handleEmployeeSelect(employee.id || '')
														}
														value={employee.name || ''}
													>
														<div className="flex flex-1 items-center gap-2">
															<Avatar className="h-6 w-6">
																<AvatarImage
																	src={
																		employee.avatar ||
																		'/placeholder.svg'
																	}
																/>
																<AvatarFallback>
																	{(employee.name || 'U')[0]}
																</AvatarFallback>
															</Avatar>
															<div className="flex flex-col">
																<span className="font-medium">
																	{employee.name}
																</span>
																<span className="text-muted-foreground text-xs">
																	{employee.specialty}
																</span>
															</div>
														</div>
														<Check
															className={cn(
																'ml-auto h-4 w-4',
																draft.employeeId === employee.id
																	? 'opacity-100'
																	: 'opacity-0',
															)}
														/>
													</CommandItem>
												))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>

					{/* Products Selection */}
					<div className="space-y-3">
						<Label>Productos Disponibles</Label>
						<div className="grid max-h-48 gap-2 overflow-y-auto">
							{products.map((product) => {
								const selectedProduct = selectedProducts.find(
									(p) => p.productId === product.id,
								);
								return (
									<Card className="p-3" key={product.id}>
										<div className="flex items-center justify-between">
											<div className="flex-1">
												<div className="font-medium">{product.name}</div>
												<div className="text-muted-foreground text-sm">
													{product.brand} • Stock: {product.stock}
												</div>
											</div>
											<div className="flex items-center gap-2">
												{selectedProduct ? (
													<div className="flex items-center gap-2">
														<Button
															onClick={() =>
																handleUpdateQuantity(
																	product.id,
																	selectedProduct.qty - 1,
																)
															}
															size="sm"
															variant="outline"
														>
															<Minus className="h-3 w-3" />
														</Button>
														<span className="w-8 text-center font-medium">
															{selectedProduct.qty}
														</span>
														<Button
															onClick={() =>
																handleUpdateQuantity(
																	product.id,
																	selectedProduct.qty + 1,
																)
															}
															size="sm"
															variant="outline"
														>
															<Plus className="h-3 w-3" />
														</Button>
													</div>
												) : (
													<Button
														onClick={() => handleAddProduct(product.id)}
														size="sm"
														variant="outline"
													>
														<Plus className="mr-1 h-3 w-3" />
														Agregar
													</Button>
												)}
											</div>
										</div>
									</Card>
								);
							})}
						</div>
					</div>

					{/* Selected Products Summary */}
					{selectedProducts.length > 0 && (
						<div className="space-y-2">
							<Label>Resumen del Kit ({totalProducts} productos)</Label>
							<Card className="p-3">
								<div className="space-y-2">
									{selectedProducts.map((item) => {
										const product = products.find(
											(p) => p.id === item.productId,
										);
										return (
											<div
												className="flex justify-between text-sm"
												key={item.productId}
											>
												<span>{product?.name}</span>
												<span className="font-medium">x{item.qty}</span>
											</div>
										);
									})}
								</div>
							</Card>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button onClick={handleCancel} variant="outline">
						Cancelar
					</Button>
					<Button
						disabled={!draft.employeeId || selectedProducts.length === 0 || isPending}
						onClick={handleAssign}
					>
						Asignar Kit
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
