"use client"

import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { Alert, ScrollView, StyleSheet } from "react-native"

import { useBaseUserStore, useReturnOrderStore } from "@/app/stores/baseUserStores"
import { Collapsible } from "@/components/Collapsible"
import { ThemedButton } from "@/components/ThemedButton"
import { ThemedHeader } from "@/components/ThemedHeader"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { BarcodeScanner } from "@/components/ui/BarcodeScanner"
import { ProductCard } from "@/components/ui/ProductCard"
import { ScannerComboboxSection } from "@/components/ui/ScannerComboboxSection"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { getWithdrawOrderDetailsProducts } from "@/lib/fetch-functions"
import { useUpdateWithdrawOrderMutation } from "@/lib/mutations"
import { QUERY_KEYS } from "@/lib/query-keys"
import type { ProductStockItem, WithdrawOrderDetailsProduct } from "@/types/types"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { toast } from "sonner-native"


export default function OrderDetailsScreen() {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    const { selectedProducts, currentEmployee } = useBaseUserStore()

    // Get employee ID from store
    const employeeId = currentEmployee?.employee.id

    // Fetch products from withdraw order details endpoint filtered by employee ID
    // The endpoint returns product data directly (inferred from Hono client types)
    const {
        data: apiProductsData = [],
        isFetching,
        refetch: refetchProducts,
    } = useQuery({
        queryKey: [QUERY_KEYS.WITHDRAW_ORDER_DETAILS_PRODUCTS, employeeId],
        queryFn: () => {
            if (!employeeId) {
                throw new Error("Employee ID is not available");
            }
            return getWithdrawOrderDetailsProducts(employeeId);
        },
        enabled: !!employeeId, // Only fetch when employeeId is available
        staleTime: 10 * 60 * 1000, // 10 minutes - products don't change frequently
        gcTime: 30 * 60 * 1000, // 30 minutes - cache garbage collection time
    })

    // Use API products directly - they match the WithdrawOrderDetailsProduct type
    const availableProducts: WithdrawOrderDetailsProduct[] = apiProductsData || []

    /**
     * Transform WithdrawOrderDetailsProduct[] to ProductStockItem[] for use in ScannerComboboxSection
     * Maps API response data to the ProductStockItem structure required by the component
     */
    const transformedProductStock = useMemo<ProductStockItem[]>(() => {
        return availableProducts.map((product: WithdrawOrderDetailsProduct): ProductStockItem => {
            const stockItem: ProductStockItem = {
                id: product.productStockId, // Use productStockId as the stock item ID
                barcode: product.barcode, // Use barcode directly from API response
                numberOfUses: 1, // Default to 1 since we don't have this data
                currentWarehouse: "", // Not available in API response, use empty string
                isBeingUsed: false, // Default to false - these are available for return
            };

            // Conditionally add optional properties only if they have values
            if (product.description) {
                stockItem.description = product.description;
            }
            if (product.dateReturn) {
                stockItem.lastUsed = new Date(product.dateReturn);
            }
            if (product.dateWithdraw) {
                stockItem.firstUsed = new Date(product.dateWithdraw);
            }

            return stockItem;
        });
    }, [availableProducts])

    // Get return order state and actions
    const {
        returnProducts,
        showScanner,
        handleProductStockSelect: handleProductStockSelectReturn,
        handleBarcodeScanned,
        handleRemoveProduct,
        setShowScanner,
        clearReturnProducts,
    } = useReturnOrderStore()

    // Get query client for cache invalidation
    const queryClient = useQueryClient()

    // Initialize mutation hook
    const updateWithdrawOrderMutation = useUpdateWithdrawOrderMutation()

    // Use availableProducts directly as renderedProducts since we're fetching products by employeeId
    const renderedProducts = availableProducts

    /**
     * Groups return products by withdrawOrderId
     * Creates a map where each key is a withdrawOrderId and value is an array of productStockIds
     * @param products - Array of products to group
     * @returns Map of withdrawOrderId to productStockIds array
     */
    const groupProductsByOrderId = (
        products: WithdrawOrderDetailsProduct[]
    ): Map<string, string[]> => {
        const grouped = new Map<string, string[]>();

        for (const product of products) {
            // Skip products without a withdrawOrderId
            if (!product.withdrawOrderId) {
                continue;
            }

            const orderId = product.withdrawOrderId;
            const stockId = product.productStockId;

            if (!grouped.has(orderId)) {
                grouped.set(orderId, []);
            }

            grouped.get(orderId)?.push(stockId);
        }

        return grouped;
    };

    /**
     * Handles the submission of the return order
     * Groups products by withdrawOrderId, builds the payload,
     * calls the mutation with toast feedback, and clears selection on success
     */
    const handleSubmitReturn = () => {
        if (returnProducts.length === 0) {
            Alert.alert("Sin Devoluciones", "Selecciona al menos un producto para devolver")
            return
        }

        // Group products by withdrawOrderId
        const groupedProducts = groupProductsByOrderId(returnProducts);

        // Validate that we have at least one valid order ID
        if (groupedProducts.size === 0) {
            Alert.alert(
                "Error",
                "No se pudo obtener el ID de la orden. Por favor, intenta nuevamente."
            )
            return
        }

        const totalReturning = returnProducts.length
        const totalOrders = groupedProducts.size

        // Create confirmation message
        const confirmationMessage = totalOrders === 1
            ? `¿Deseas procesar la devolución de ${totalReturning} producto(s)?`
            : `¿Deseas procesar la devolución de ${totalReturning} producto(s) de ${totalOrders} orden(es)?`

        Alert.alert("Confirmar Devolución", confirmationMessage, [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Confirmar",
                onPress: () => {
                    // Build the orders array from grouped products
                    const orders = Array.from(groupedProducts.entries()).map(
                        ([withdrawOrderId, productStockIds]) => ({
                            withdrawOrderId,
                            productStockIds,
                        })
                    );

                    // Build the payload for the API
                    const payload = {
                        dateReturn: new Date().toISOString(),
                        orders,
                    };

                    // Call mutation with toast.promise for automatic loading/success/error feedback
                    toast.promise(
                        updateWithdrawOrderMutation.mutateAsync(payload),
                        {
                            loading: "Procesando devolución de productos...",
                            success: (data) => {
                                // Clear return products on success
                                clearReturnProducts()
                                // Invalidate queries to refetch updated data
                                // Note: Mutation hook also invalidates these queries, but we do it here
                                // for immediate UI updates and to ensure employee-specific query is refreshed
                                queryClient.invalidateQueries({
                                    queryKey: [QUERY_KEYS.PRODUCT_STOCK],
                                })
                                if (employeeId) {
                                    queryClient.invalidateQueries({
                                        queryKey: [QUERY_KEYS.WITHDRAW_ORDER_DETAILS_PRODUCTS, employeeId],
                                    })
                                }
                                // Navigate back after a short delay to show success message
                                setTimeout(() => {
                                    router.back()
                                }, 500)
                                return data.message || "Devolución procesada correctamente"
                            },
                            error: (error) => {
                                return error instanceof Error
                                    ? error.message
                                    : "Error al procesar la devolución"
                            },
                        }
                    )
                },
            },
        ])
    }

    const getTotalReturning = () => {
        return returnProducts.length
    }

    /**
     * Handler for warehouse stock item selection
     * Uses the new stock-based selection system that tracks individual items
     * @param stockItem - The selected warehouse stock item
     */
    const handleStockItemSelect = (stockItem: ProductStockItem) => {
        // Find the corresponding product from availableProducts by productStockId
        const matchingProduct = availableProducts.find((p: WithdrawOrderDetailsProduct) => p.productStockId === stockItem.id)

        if (matchingProduct) {
            // Use the new stock-based selection method
            handleProductStockSelectReturn(stockItem, matchingProduct, transformedProductStock)
        } else {
            Alert.alert(
                "Producto No Encontrado",
                "Este producto no está disponible en la orden actual"
            )
        }
    }




    return (
        <ThemedView style={styles.container}>
            <StatusBar style={isDark ? "light" : "dark"} />

            <ThemedHeader title="Gestionar Orden" />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Order Info */}


                {/* Order Items Overview */}
                <ThemedView style={styles.section}>
                    <Collapsible title={`Productos de la Orden (${renderedProducts.length})`}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.orderItemsGrid}
                        >
                            {renderedProducts.map((item: WithdrawOrderDetailsProduct) => {
                                return (
                                    <ThemedView
                                        key={item.id}
                                        style={[
                                            styles.orderItemCard,
                                            {
                                                backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                                            },
                                        ]}
                                    >

                                        <ThemedView
                                            style={styles.itemInfo}
                                            lightColor={Colors.light.surface}
                                            darkColor={Colors.dark.surface}
                                        >
                                            <ThemedText style={styles.itemName}>{item.description || `Producto ${item.productId}`}</ThemedText>
                                            <ThemedView
                                                style={[
                                                    styles.badge,
                                                    {
                                                        backgroundColor: Colors.light.highlight,
                                                    },
                                                ]}
                                            >
                                            </ThemedView>
                                            <ThemedText style={styles.itemBrand}>ID: {item.productStockId.slice(0, 8)}</ThemedText>
                                        </ThemedView>
                                    </ThemedView>
                                )
                            })}
                        </ScrollView>
                    </Collapsible>
                </ThemedView>

                {/* Scanner and Combobox Section */}
                <ScannerComboboxSection
                    productStock={transformedProductStock}
                    onStockItemSelect={handleStockItemSelect}
                    onScanPress={() => setShowScanner(true)}
                    onRefreshPress={() => refetchProducts()}
                    isLoading={isFetching}
                    itemCount={selectedProducts.length}
                    selectedItemIds={returnProducts.map((product) => product.productStockId)}
                />

                {/* Return Products Section */}
                {returnProducts.length > 0 && (
                    <ThemedView style={styles.section}>
                        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                            Productos para Devolver ({returnProducts.length})
                        </ThemedText>
                        <ThemedView
                            style={[
                                styles.totalContainer,
                                {
                                    backgroundColor: isDark ? Colors.dark.highlight : Colors.light.highlight,
                                },
                            ]}
                        >
                            <ThemedText style={styles.totalLabel}>Total a devolver:</ThemedText>
                            <ThemedText style={styles.totalValue}>{getTotalReturning()}</ThemedText>
                        </ThemedView>
                        {returnProducts.map((product: WithdrawOrderDetailsProduct) => (
                            <ProductCard
                                key={product.id}
                                product={{
                                    id: product.id,
                                    name: product.description || `Producto ${product.productId}`,
                                    brand: "N/A",
                                    stock: 1,
                                    quantity: 1,
                                    selectedAt: new Date(product.dateWithdraw),
                                }}
                                onRemove={handleRemoveProduct}
                                style={styles.productCard}
                            />
                        ))}
                    </ThemedView>
                )}



                {/* Submit Section */}
                {
                    returnProducts.length > 0 && (
                        <ThemedView style={styles.submitSection}>
                            <ThemedButton
                                title="Procesar Devolución"
                                onPress={handleSubmitReturn}
                                style={styles.submitButton}
                                variant="primary"
                                size="medium"
                                isLoading={updateWithdrawOrderMutation.isPending}
                                disabled={updateWithdrawOrderMutation.isPending}
                            />
                        </ThemedView>
                    )
                }
            </ScrollView >

            {/* Barcode Scanner Modal */}
            {
                showScanner && (
                    <BarcodeScanner
                        onBarcodeScanned={(barcode) => handleBarcodeScanned(barcode, availableProducts)}
                        onClose={() => setShowScanner(false)}
                    />
                )
            }
        </ThemedView >
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        padding: 16,
    },
    orderInfoSection: {
        marginBottom: 24,
        padding: 16,
        borderRadius: 12,
    },
    orderNumber: {
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 8,
    },
    orderDetails: {
        fontSize: 16,
        opacity: 0.7,
        marginBottom: 4,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        marginBottom: 12,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 12,
    },
    comboboxContainer: {
        flex: 1,
    },
    scanButton: {
        width: 56,
        height: 56,
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    orderItemsGrid: {
        paddingVertical: 8,
        gap: 12,
    },
    orderItemCard: {
        width: 280,
        borderRadius: 12,
        borderWidth: 2,
        padding: 16,
        marginRight: 12,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 20,
        fontWeight: "600",
        marginBottom: 4,
    },
    itemBrand: {
        fontSize: 14,
        opacity: 0.7,
        marginBottom: 12,
    },
    itemStats: {
        gap: 4,
    },
    itemStat: {
        fontSize: 14,
        opacity: 0.8,
    },
    productCard: {
        marginBottom: 8,
    },
    submitSection: {
        marginTop: 16,
        marginBottom: 32,
    },
    totalContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        padding: 16,
        borderRadius: 8,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: "600",
    },
    totalValue: {
        fontSize: 22,
        fontWeight: "bold",
    },
    submitButton: {
        width: "100%",
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        width: 120,
    },
    badgeText: {
        color: "white",
        fontSize: 12,
        fontWeight: "bold",
        letterSpacing: 0.5,
    },
})
