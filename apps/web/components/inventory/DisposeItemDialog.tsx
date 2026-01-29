'use memo';
'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useDeleteInventoryItem } from '@/lib/mutations/inventory';
import { type DisposalReason, useDisposalStore } from '@/stores/disposal-store';

export function DisposeItemDialog() {
	const { current, reason, open, isLoading, hide, setReason, confirm } = useDisposalStore();
	const { mutateAsync } = useDeleteInventoryItem();

	const handleConfirm = async () => {
		if (!reason) {
			toast.error('Por favor selecciona un motivo para la baja');
			return;
		}

		try {
			if (!current) {
				toast.warning('No se encontró el artículo a dar de baja');
				return;
			}
			await mutateAsync({ id: current.id });
			hide();
			confirm();
			toast.success('Artículo dado de baja exitosamente');
		} catch (error) {
			toast.error('Error al dar de baja el artículo');
			console.error(error);
		}
	};

	// Reset reason when dialog opens
	useEffect(() => {
		if (open && !reason) {
			setReason(undefined);
		}
	}, [open, reason, setReason]);

	if (!current) {
		return null;
	}

	return (
		<Dialog onOpenChange={(isOpen) => !isOpen && hide()} open={open}>
			<DialogContent className="border-[#E5E7EB] bg-white sm:max-w-[425px] dark:border-[#2D3033] dark:bg-[#151718]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-[#11181C] dark:text-[#ECEDEE]">
						<AlertTriangle className="h-5 w-5 text-red-600" />
						Dar de baja artículo
					</DialogTitle>
					<DialogDescription className="text-[#687076] dark:text-[#9BA1A6]">
						Esta acción es permanente y no se puede deshacer. El artículo será removido
						del inventario.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label
							className="text-[#11181C] dark:text-[#ECEDEE]"
							htmlFor="product-name"
						>
							Producto
						</Label>
						<Input
							className="border-[#E5E7EB] bg-[#F9FAFB] text-[#687076] dark:border-[#2D3033] dark:bg-[#1E1F20] dark:text-[#9BA1A6]"
							id="product-name"
							readOnly
							value={current.productInfo?.name || 'Producto desconocido'}
						/>
					</div>

					<div className="grid gap-2">
						<Label className="text-[#11181C] dark:text-[#ECEDEE]" htmlFor="barcode">
							Código de barras
						</Label>
						<Input
							className="border-[#E5E7EB] bg-[#F9FAFB] font-mono text-[#687076] text-sm dark:border-[#2D3033] dark:bg-[#1E1F20] dark:text-[#9BA1A6]"
							id="barcode"
							readOnly
							value={current.barcode || 'N/A'}
						/>
					</div>

					<div className="grid gap-2">
						<Label className="text-[#11181C] dark:text-[#ECEDEE]" htmlFor="uuid">
							UUID
						</Label>
						<Input
							className="border-[#E5E7EB] bg-[#F9FAFB] font-mono text-[#687076] text-xs dark:border-[#2D3033] dark:bg-[#1E1F20] dark:text-[#9BA1A6]"
							id="uuid"
							readOnly
							value={current.uuid || 'N/A'}
						/>
					</div>

					<div className="grid gap-2">
						<Label className="text-[#11181C] dark:text-[#ECEDEE]" htmlFor="reason">
							Motivo de baja *
						</Label>
						<Select
							onValueChange={(v) => setReason(v as DisposalReason)}
							value={reason}
						>
							<SelectTrigger className="border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
								<SelectValue placeholder="Selecciona un motivo" />
							</SelectTrigger>
							<SelectContent className="border-[#E5E7EB] bg-white dark:border-[#2D3033] dark:bg-[#1E1F20]">
								<SelectItem
									className="text-[#11181C] dark:text-[#ECEDEE]"
									value="consumido"
								>
									Consumido
								</SelectItem>
								<SelectItem
									className="text-[#11181C] dark:text-[#ECEDEE]"
									value="dañado"
								>
									Dañado
								</SelectItem>
								<SelectItem
									className="text-[#11181C] dark:text-[#ECEDEE]"
									value="otro"
								>
									Otro
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<DialogFooter>
					<Button
						className="border-[#E5E7EB] text-[#11181C] hover:bg-[#F9FAFB] dark:border-[#2D3033] dark:text-[#ECEDEE] dark:hover:bg-[#2D3033]"
						disabled={isLoading}
						onClick={hide}
						variant="outline"
					>
						Cancelar
					</Button>
					<Button
						className="bg-red-600 text-white hover:bg-red-700"
						disabled={!reason || isLoading}
						onClick={handleConfirm}
					>
						{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Dar de baja
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
