'use memo';
'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SkeletonReceiveForm } from '@/ui/skeletons/Skeleton.ReceiveForm';

interface ReceiveItemsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

interface ReceptionLine {
	id: string;
	barcode: string;
	quantity: string;
}

export function ReceiveItemsModal({ open, onOpenChange }: ReceiveItemsModalProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [formData, setFormData] = useState({
		shipmentNumber: '',
		arrivalDate: '',
	});
	const [lines, setLines] = useState<ReceptionLine[]>([{ id: '1', barcode: '', quantity: '' }]);

	const addLine = () => {
		const newLine: ReceptionLine = {
			id: Date.now().toString(),
			barcode: '',
			quantity: '',
		};
		setLines([...lines, newLine]);
	};

	const removeLine = (id: string) => {
		if (lines.length > 1) {
			setLines(lines.filter((line) => line.id !== id));
		}
	};

	const updateLine = (id: string, field: keyof Omit<ReceptionLine, 'id'>, value: string) => {
		setLines(lines.map((line) => (line.id === id ? { ...line, [field]: value } : line)));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate form
		if (!formData.shipmentNumber) {
			toast('Por favor completa el número de envío');
			return;
		}
		if (!formData.arrivalDate) {
			toast('Por favor completa la fecha de llegada');
			return;
		}

		// Validate lines
		const validLines = lines.filter((line) => line.barcode && line.quantity);
		if (validLines.length === 0) {
			toast('Agrega al menos una línea con código de barras y cantidad');
			return;
		}

		setIsLoading(true);

		try {
			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 1500));

			// Prepare data (simulate submit)
			const _data = {
				shipmentNumber: formData.shipmentNumber,
				arrivalDate: new Date(formData.arrivalDate).toISOString(),
				lines: validLines.map((line) => ({
					barcode: Number.parseInt(line.barcode, 10),
					quantity: Number.parseInt(line.quantity, 10),
				})),
			};

			toast('¡Éxito! Recepción guardada correctamente');

			// Reset form
			setFormData({ shipmentNumber: '', arrivalDate: '' });
			setLines([{ id: '1', barcode: '', quantity: '' }]);
			onOpenChange(false);
		} catch {
			toast('Ocurrió un error al guardar la recepción');
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancel = () => {
		setFormData({ shipmentNumber: '', arrivalDate: '' });
		setLines([{ id: '1', barcode: '', quantity: '' }]);
		onOpenChange(false);
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[80vh] overflow-y-auto border-[#E5E7EB] bg-white sm:max-w-[600px] dark:border-[#2D3033] dark:bg-[#1E1F20]">
				<DialogHeader>
					<DialogTitle className="text-[#11181C] dark:text-[#ECEDEE]">
						Registrar Recepción
					</DialogTitle>
					<DialogDescription className="text-[#687076] dark:text-[#9BA1A6]">
						Registra la llegada de productos al almacén
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<SkeletonReceiveForm />
				) : (
					<form className="space-y-6" onSubmit={handleSubmit}>
						{/* Shipment Number */}
						<div className="space-y-2">
							<Label
								className="text-[#11181C] dark:text-[#ECEDEE]"
								htmlFor="shipmentNumber"
							>
								Número de envío *
							</Label>
							<Input
								className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
								id="shipmentNumber"
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										shipmentNumber: e.target.value,
									}))
								}
								placeholder="Ej: ENV-2024-001"
								required
								type="text"
								value={formData.shipmentNumber}
							/>
						</div>

						{/* Arrival Date */}
						<div className="space-y-2">
							<Label
								className="text-[#11181C] dark:text-[#ECEDEE]"
								htmlFor="arrivalDate"
							>
								Fecha de llegada *
							</Label>
							<Input
								className="input-transition border-[#E5E7EB] bg-white text-[#11181C] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE]"
								id="arrivalDate"
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										arrivalDate: e.target.value,
									}))
								}
								required
								type="date"
								value={formData.arrivalDate}
							/>
						</div>

						{/* Lines Section */}
						<div className="space-y-4">
							<Label className="font-medium text-[#11181C] dark:text-[#ECEDEE]">
								Líneas de productos
							</Label>

							{lines.map((line) => (
								<Card
									className="card-transition border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#2D3033] dark:bg-[#1E1F20]"
									key={line.id}
								>
									<CardContent className="p-4">
										<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
											<div className="space-y-2">
												<Label className="text-[#11181C] text-sm dark:text-[#ECEDEE]">
													Código de barras
												</Label>
												<Input
													className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
													onChange={(e) =>
														updateLine(
															line.id,
															'barcode',
															e.target.value,
														)
													}
													placeholder="7501234567890"
													type="number"
													value={line.barcode}
												/>
											</div>

											<div className="space-y-2">
												<Label className="text-[#11181C] text-sm dark:text-[#ECEDEE]">
													Cantidad
												</Label>
												<Input
													className="input-transition border-[#E5E7EB] bg-white text-[#11181C] placeholder:text-[#687076] focus:border-[#0a7ea4] focus:ring-[#0a7ea4] dark:border-[#2D3033] dark:bg-[#151718] dark:text-[#ECEDEE] dark:placeholder:text-[#9BA1A6]"
													min="1"
													onChange={(e) =>
														updateLine(
															line.id,
															'quantity',
															e.target.value,
														)
													}
													placeholder="1"
													type="number"
													value={line.quantity}
												/>
											</div>

											<div className="flex items-end">
												<Button
													className="theme-transition border-[#E5E7EB] text-[#687076] hover:bg-[#F9FAFB] hover:text-red-600 disabled:opacity-50 dark:border-[#2D3033] dark:text-[#9BA1A6] dark:hover:bg-[#2D3033] dark:hover:text-red-400"
													disabled={lines.length === 1}
													onClick={() => removeLine(line.id)}
													size="icon"
													type="button"
													variant="outline"
												>
													<Trash2 className="h-4 w-4" />
													<span className="sr-only">Eliminar línea</span>
												</Button>
											</div>
										</div>
									</CardContent>
								</Card>
							))}

							<Button
								className="theme-transition border-[#0a7ea4] text-[#0a7ea4] hover:bg-[#0a7ea4]/10 dark:hover:bg-[#0a7ea4]/10"
								onClick={addLine}
								type="button"
								variant="outline"
							>
								<Plus className="mr-2 h-4 w-4" />
								Añadir línea
							</Button>
						</div>

						{/* Submit Buttons */}
						<div className="flex justify-end space-x-2 pt-4">
							<Button
								className="theme-transition border-[#E5E7EB] text-[#687076] hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:text-[#9BA1A6] dark:hover:bg-[#2D3033]"
								onClick={handleCancel}
								type="button"
								variant="outline"
							>
								Cancelar
							</Button>
							<Button
								className="theme-transition bg-[#0a7ea4] text-white hover:bg-[#0a7ea4]/90"
								type="submit"
							>
								Guardar Recepción
							</Button>
						</div>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
