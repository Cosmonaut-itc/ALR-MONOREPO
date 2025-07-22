"use client"

import { StyleSheet, ScrollView, Alert } from "react-native"
import { StatusBar } from "expo-status-bar"
import { router, useLocalSearchParams } from "expo-router"

import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { ThemedButton } from "@/components/ThemedButton"
import { BarcodeScanner } from "@/components/ui/BarcodeScanner"
import { ProductCard } from "@/components/ui/ProductCard"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import type { Product, SelectedProduct, WithdrawOrderDetails, ProductStockItem } from "@/types/types"
import { ThemedHeader } from "@/components/ThemedHeader"
import { ScannerComboboxSection } from "@/components/ui/ScannerComboboxSection"
import { useBaseUserStore, useReturnOrderStore } from "@/app/stores/baseUserStores"
import { Collapsible } from "@/components/Collapsible"
import { useQuery } from "@tanstack/react-query"
import { QUERY_KEYS } from "@/lib/query-keys"
import { getWithdrawalOrdersDetails } from "@/lib/fetch-functions"
import { useMemo } from "react"


/**
 * Custom hook to manage product data from a withrawal order with proper error handling and loading states 
 * Follows TanStack Query best practices for data fetching and state management
 * @returns Object containing products data, loading state, error state, and utility functions
 */
interface UseWithdrawOrderDetailsQueryResult {
    /** Array of transformed products ready for UI consumption */
    products: WithdrawOrderDetails[]
    /** Boolean indicating if the initial data fetch is in progress */
    isLoading: boolean
    /** Boolean indicating if there's an error in the query */
    isError: boolean
    /** Error object containing details about any query failures */
    error: Error | null
    /** Boolean indicating if a background refetch is in progress */
    isFetching: boolean
    /** Function to manually trigger a refetch of products */
    refetch: () => void
}

const useWithdrawalOrderDetailsQuery = (date: string): UseWithdrawOrderDetailsQueryResult => {
    const {
        data: apiProducts,
        isLoading,
        isError,
        error,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: [QUERY_KEYS.WITHDRAW_ORDER_DETAILS, date],
        queryFn: () => getWithdrawalOrdersDetails(date),
        staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh for this duration
        gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time
        retry: 3, // Retry failed requests up to 3 times
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    })

    return {
        products: apiProducts || [],
        isLoading,
        isError,
        error,
        isFetching,
        refetch,
    }
}



export default function OrderDetailsScreen() {
    const { date } = useLocalSearchParams<{ date: string }>()
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    console.log("date", date)

    const { productStock, availableProducts, selectedProducts, handleProductStockSelect } = useBaseUserStore()

    // Get return order state and actions
    const {
        returnProducts,
        showScanner,
        handleProductSelect,
        handleProductStockSelect: handleProductStockSelectReturn,
        handleBarcodeScanned,
        handleRemoveProduct,
        setShowScanner,
        clearReturnProducts,
    } = useReturnOrderStore()

    const { products, isLoading, isError, error, isFetching, refetch } = useWithdrawalOrderDetailsQuery(date)

    // Filter withdrawal order details that have corresponding products in availableProducts and transform to Product type
    const renderedProducts = useMemo(() => {
        return products
            .filter((orderDetail: WithdrawOrderDetails) =>
                availableProducts.some((p: Product) => p.id === orderDetail.productId)
            )
            .map((orderDetail: WithdrawOrderDetails) => {
                // Find the corresponding product information using productId
                const productInfo = availableProducts.find((p: Product) => p.id === orderDetail.productId);

                if (!productInfo) {
                    // This shouldn't happen due to the filter above, but TypeScript safety
                    throw new Error(`Product not found for ID: ${orderDetail.productId}`);
                }

                return {
                    id: orderDetail.productId,
                    name: productInfo.name,
                    brand: productInfo.brand,
                    price: productInfo.price,
                    stock: productInfo.stock, // Use available stock from product info
                };
            });
    }, [products, availableProducts])


    const handleSubmitReturn = () => {
        if (returnProducts.length === 0) {
            Alert.alert("Sin Devoluciones", "Selecciona al menos un producto para devolver")
            return
        }

        const totalReturning = returnProducts.reduce((total: number, product: SelectedProduct) => total + product.quantity, 0)

        Alert.alert("Confirmar Devolución", `¿Deseas procesar la devolución de ${totalReturning} producto(s)?`, [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Confirmar",
                onPress: () => {
                    // Process return
                    console.log("Processing return:", returnProducts)
                    clearReturnProducts()
                    Alert.alert("Éxito", "Devolución procesada correctamente", [{ text: "OK", onPress: () => router.back() }])
                },
            },
        ])
    }

    const getTotalReturning = () => {
        return returnProducts.reduce((total: number, product: SelectedProduct) => total + product.quantity, 0)
    }

    /**
 * Handler for warehouse stock item selection
 * Uses the new stock-based selection system that tracks individual items
 * @param stockItem - The selected warehouse stock item
 */
    const handleStockItemSelect = (stockItem: ProductStockItem) => {
        // Find the full product information by barcode
        const fullProduct = availableProducts.find((p: Product) => Number(p.barcode) === stockItem.barcode)

        if (fullProduct) {
            // Use the new stock-based selection method
            handleProductStockSelectReturn(stockItem, fullProduct, productStock)
        } else {
            // Create a basic product object if full product not found
            const basicProduct: Product = {
                id: `product-${stockItem.barcode}`, // Use product prefix + barcode as product ID
                name: `Producto ${stockItem.barcode}`, // Fallback name
                brand: "Sin marca", // Default brand
                price: 0, // Default price since we don't have it in stock data
                stock: 1, // Set to 1 since we know this specific item exists
                barcode: stockItem.barcode.toString(),
            }
            handleProductStockSelectReturn(stockItem, basicProduct, productStock)
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
                            {renderedProducts.map((item: Product) => {
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
                                            <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                                            <ThemedView
                                                style={[
                                                    styles.badge,
                                                    {
                                                        backgroundColor: Colors.light.highlight,
                                                    },
                                                ]}
                                            >
                                            </ThemedView>
                                            <ThemedText style={styles.itemBrand}>{item.brand}</ThemedText>
                                        </ThemedView>
                                    </ThemedView>
                                )
                            })}
                        </ScrollView>
                    </Collapsible>
                </ThemedView>

                {/* Scanner and Combobox Section */}
                <ScannerComboboxSection
                    products={availableProducts}
                    productStock={productStock}
                    targetWarehouse={1}
                    onStockItemSelect={handleStockItemSelect}
                    onScanPress={() => setShowScanner(true)}
                    isLoading={isFetching}
                    itemCount={selectedProducts.length}
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
                        {returnProducts.map((product: SelectedProduct) => (
                            <ProductCard
                                key={product.id}
                                product={product}
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
