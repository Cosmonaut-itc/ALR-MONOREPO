"use client"

import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { ProductCatalogTable } from '@/components/inventory/ProductCatalogTable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAllProducts, getInventory } from '@/lib/fetch-functions/inventory'
import { queryKeys } from '@/lib/query-keys'
import { useTransferStore } from '@/stores/transfer-store'
import type { ProductCatalogResponse, ProductStockWithEmployee } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'

export function TransferenciasClient() {
	const { data: inventory } = useSuspenseQuery<
		ProductStockWithEmployee | null,
		Error,
		ProductStockWithEmployee | null
	>({
		queryKey: queryKeys.inventory,
		queryFn: getInventory,
	})

	const { data: productCatalog } = useSuspenseQuery<
		ProductCatalogResponse | null,
		Error,
		ProductCatalogResponse | null
	>({
		queryKey: queryKeys.productCatalog,
		queryFn: getAllProducts,
	})

	const { addToTransfer, transferList, removeFromTransfer, approveTransfer } = useTransferStore()

	// Transform product catalog
	const transformedProducts = useMemo(() => {
		if (!productCatalog?.success || !productCatalog.data) return []
		return productCatalog.data.map((product: unknown) => {
			const productData = product as {
				title?: string
				good_id?: string
				category?: string
				description?: string
			}
			return {
				barcode: Number.parseInt(productData.good_id || '0', 10),
				name: productData.title || 'Producto sin nombre',
				category: productData.category || 'Sin categoría',
				description: productData.description || 'Sin descripción',
			}
		})
	}, [productCatalog])

	// Helpers to pull details from inventory data
	const getItemWarehouse = (item: unknown): number => {
		if (item && typeof item === 'object' && 'product_stock' in item) {
			const stock = (item as { product_stock: unknown }).product_stock
			if (stock && typeof stock === 'object' && 'currentWarehouse' in stock) {
				return (stock as { currentWarehouse: number }).currentWarehouse
			}
		}
		return 1
	}

	const getItemBarcode = (item: unknown): number => {
		if (item && typeof item === 'object' && 'product_stock' in item) {
			const stock = (item as { product_stock: unknown }).product_stock
			if (stock && typeof stock === 'object' && 'barcode' in stock) {
				return (stock as { barcode: number }).barcode
			}
		}
		return 0
	}

	// Build products for Almacén General only
	const generalProducts = useMemo(() => {
		if (!transformedProducts.length) return []
		if (!inventory?.success || !inventory.data) return []
		return transformedProducts.map((product) => {
			const inventoryItems = inventory.data.filter((item) => {
				return getItemBarcode(item) === product.barcode && getItemWarehouse(item) === 1
			})
			return {
				...product,
				inventoryItems,
				stockCount: inventoryItems.length,
			}
		})
	}, [transformedProducts, inventory])

	// Handler: add selected expanded-row items to transfer list
	const handleAddToTransfer = ({ product, items }: { product: { name: string, barcode: number, category: string }, items: { uuid: string }[] }) => {
		if (items.length === 0) return
		addToTransfer(items.map((it) => ({
			uuid: it.uuid,
			barcode: product.barcode,
			productName: product.name,
			category: product.category,
		})))
		toast.success('Agregado a la lista de transferencia', { duration: 2000 })
	}

	return (
		<div className="theme-transition flex-1 space-y-6 bg-white p-4 md:p-6 dark:bg-[#151718]">
			{/* Header */}
			<div className="space-y-2">
				<h1 className="font-bold text-2xl text-[#11181C] text-transition md:text-3xl dark:text-[#ECEDEE]">
					Transferencias
				</h1>
				<p className="text-[#687076] text-transition dark:text-[#9BA1A6]">
					Selecciona artículos del Almacén General para transferir al Gabinete
				</p>
			</div>

			{/* Only one tab, Almacén General */}
			<Tabs className="space-y-6" defaultValue="general">
				<TabsList className="theme-transition grid w-full max-w-md grid-cols-1 bg-[#F9FAFB] dark:bg-[#2D3033]">
					<TabsTrigger
						className="theme-transition text-[#687076] data-[state=active]:bg-white data-[state=active]:text-[#11181C] dark:text-[#9BA1A6] dark:data-[state=active]:bg-[#1E1F20] dark:data-[state=active]:text-[#ECEDEE]"
						value="general"
					>
						Almacén General
					</TabsTrigger>
				</TabsList>

				<TabsContent className="space-y-4" value="general">
					<ProductCatalogTable
						products={generalProducts}
						enableSelection
						onAddToTransfer={handleAddToTransfer}
					/>
				</TabsContent>
			</Tabs>

			{/* Transfer List Preview */}
			<Card className="border-[#E5E7EB] dark:border-[#2D3033] bg-white dark:bg-[#1E1F20]">
				<CardHeader>
					<CardTitle className="flex items-center justify-between text-[#11181C] dark:text-[#ECEDEE]">
						<span>Lista de transferencia ({transferList.length})</span>
						<div className="flex gap-2">
							<Button
								variant="outline"
								disabled={transferList.length === 0}
								onClick={() => {
									toast.success('Transferencia aprobada', { duration: 2000 })
									approveTransfer()
								}}
							>
								Aprobar y transferir
							</Button>
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					{transferList.length === 0 ? (
						<div className="p-6 text-sm text-[#687076] dark:text-[#9BA1A6]">No hay items en la lista de transferencia.</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="text-[#687076] dark:text-[#9BA1A6]">UUID</TableHead>
									<TableHead className="text-[#687076] dark:text-[#9BA1A6]">Código</TableHead>
									<TableHead className="text-[#687076] dark:text-[#9BA1A6]">Producto</TableHead>
									<TableHead className="text-[#687076] dark:text-[#9BA1A6]">Categoría</TableHead>
									<TableHead className="text-right text-[#687076] dark:text-[#9BA1A6]">Acciones</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{transferList.map((it) => (
									<TableRow key={it.uuid}>
										<TableCell className="font-mono text-xs text-[#687076] dark:text-[#9BA1A6]">{it.uuid.slice(0,8)}...</TableCell>
										<TableCell>{it.barcode}</TableCell>
										<TableCell>{it.productName}</TableCell>
										<TableCell>
											<Badge variant="secondary" className="bg-[#F3F4F6] text-[#374151] dark:bg-[#374151] dark:text-[#D1D5DB]">{it.category}</Badge>
										</TableCell>
										<TableCell className="text-right">
											<Button variant="ghost" size="sm" onClick={() => removeFromTransfer(it.uuid)}>Quitar</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
