"use client"

import { useEffect } from "react"
import { StyleSheet, TouchableOpacity, Platform, ScrollView } from "react-native"
import { StatusBar } from "expo-status-bar"
import { router } from "expo-router"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { ThemedButton } from "@/components/ThemedButton"
import { BarcodeScanner } from "@/components/ui/BarcodeScanner"
import { ProductCombobox } from "@/components/ui/ProductCombobox"
import { ProductCard } from "@/components/ui/ProductCard"
import { PendingOrderCard } from "@/components/ui/PendingOrderCard"
import { Collapsible } from "@/components/Collapsible"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { ArrowLeft, Camera } from "lucide-react-native"
import type { PendingOrder, ProductStockItem, SelectedProduct } from "@/types/types"
import { useBaseUserStore } from "@/app/stores/baseUserStores"
import { ThemedHeader } from "@/components/ThemedHeader"
import { ScannerComboboxSection } from "@/components/ui/ScannerComboboxSection"
import { getProducts, getProductStock } from "@/lib/fetch-functions"
import { QUERY_KEYS } from "@/lib/query-keys"
import { useQuery } from "@tanstack/react-query"
import type { DataItemArticulosType } from "@/types/types"

/**
 * Product type definition
 * Represents a nail salon product with its essential properties
 * This interface is used throughout the application for product-related operations
 */
interface Product {
    id: string
    name: string
    brand: string
    price: number
    stock: number
    barcode?: string
}

/**
 * Transforms API product data to the application's Product interface
 * This mapping function ensures type safety and data consistency throughout the app
 * @param apiProduct - Raw product data from the API endpoint
 * @returns Transformed product following the local Product interface
 */
const transformApiProductToProduct = (apiProduct: DataItemArticulosType): Product => {
    return {
        id: apiProduct.good_id,
        name: apiProduct.title,
        brand: apiProduct.unit_short_title, // Using unit short title as brand fallback
        price: apiProduct.cost,
        stock: apiProduct.value, // Using value as stock amount
        barcode: apiProduct.barcode?.toString(), // Convert number to string, handle optional
    }
}

/**
 * Custom hook to manage product data with proper error handling and loading states
 * Follows TanStack Query best practices for data fetching and state management
 * @returns Object containing products data, loading state, error state, and utility functions
 */
interface UseProductsQueryResult {
    /** Array of transformed products ready for UI consumption */
    products: Product[]
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

const useProductsQuery = (): UseProductsQueryResult => {
    const {
        data: apiProducts,
        isLoading,
        isError,
        error,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: [QUERY_KEYS.PRODUCTS],
        queryFn: getProducts,
        staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh for this duration
        gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time
        retry: 3, // Retry failed requests up to 3 times
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    })

    // Transform API data to local Product interface
    // Only transform if data is available to avoid runtime errors
    const products: Product[] = apiProducts?.map(transformApiProductToProduct) ?? []

    return {
        products,
        isLoading,
        isError,
        error,
        isFetching,
        refetch,
    }
}

/**
 * Custom hook to manage product stock data with proper error handling and loading states
 * Follows TanStack Query best practices for data fetching and state management
 * @returns Object containing product stock data, loading state, error state, and utility functions
 */
interface UseProductStockQueryResult {
    /** Array of product stock items ready for UI consumption */
    productStock: ProductStockItem[]
    /** Boolean indicating if the initial data fetch is in progress */
    isLoading: boolean
    /** Boolean indicating if there's an error in the query */
    isError: boolean
    /** Error object containing details about any query failures */
    error: Error | null
    /** Boolean indicating if a background refetch is in progress */
    isFetching: boolean
    /** Function to manually trigger a refetch of product stock */
    refetch: () => void
}

const useProductStockQuery = (): UseProductStockQueryResult => {
    // Fetch product stock data using TanStack Query with proper error handling and loading states
    const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
        queryKey: [QUERY_KEYS.PRODUCT_STOCK],
        queryFn: getProductStock,
        staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh for this duration
        gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time
        retry: 3, // Retry failed requests up to 3 times
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    })

    // Transform API data to local ProductStockItem interface
    // Only transform if data is available to avoid runtime errors
    return {
        productStock: data || [],
        isLoading,
        isError,
        error,
        isFetching,
        refetch,
    }
}

/**
 * Mock pending orders data
 * Represents orders that have been taken but not fully returned
 */
const PENDING_ORDERS: PendingOrder[] = [
    {
        id: "o1",
        orderNumber: "ORD-001",
        items: [
            {
                productId: "1",
                productName: "Esmalte Rojo Clásico",
                brand: "OPI",
                quantityTaken: 3,
                quantityReturned: 0,
                price: 15.99,
            },
            {
                productId: "2",
                productName: "Base Coat Fortalecedora",
                brand: "Essie",
                quantityTaken: 2,
                quantityReturned: 1,
                price: 12.5,
            },
        ],
        takenAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        takenBy: "María García",
        status: "partial",
    },
    {
        id: "o2",
        orderNumber: "ORD-002",
        items: [
            {
                productId: "3",
                productName: "Top Coat Brillo",
                brand: "Sally Hansen",
                quantityTaken: 1,
                quantityReturned: 0,
                price: 10.99,
            },
        ],
        takenAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        takenBy: "Ana López",
        status: "pending",
    },
]

export default function InventoryScannerScreen() {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    // Fetch products using TanStack Query with proper error handling and loading states
    const {
        products,
        isLoading: isLoadingProducts,
        isError: isProductsError,
        error: productsError,
        isFetching: isFetchingProducts,
        refetch: refetchProducts,
    } = useProductsQuery()

    const {
        productStock,
        isLoading: isLoadingProductStock,
        isError: isProductStockError,
        error: productStockError,
        isFetching: isFetchingProductStock,
        refetch: refetchProductStock,
    } = useProductStockQuery()

    // Initialize store with demo data for pending orders
    // In a real application, this would also be fetched from an API
    useEffect(() => {
        useBaseUserStore.getState().initializeStore([], PENDING_ORDERS)
    }, [])

    // Get store state and actions
    const {
        selectedProducts,
        pendingOrders,
        showScanner,
        selectedOrder,
        handleProductSelect,
        handleBarcodeScanned,
        handleRemoveProduct,
        handleUpdateQuantity,
        handleOrderClick,
        handleSubmit,
        setShowScanner,
    } = useBaseUserStore()

    /**
     * Enhanced barcode scan handler that works with API product data
     * Searches through the fetched products to find matches by barcode
     * @param barcode - Scanned barcode string to match against products
     */
    const handleEnhancedBarcodeScanned = (barcode: string) => {
        const foundProduct = products.find(
            (product) => product.barcode === barcode || product.id === barcode
        )

        if (foundProduct) {
            handleBarcodeScanned(barcode)
        } else {
            // Show user-friendly error message when product not found
            console.warn(`Product with barcode ${barcode} not found in inventory`)
            // You could show a toast notification here
        }
    }

    /**
     * Handler for warehouse stock item selection
     * Converts ProductStockItem to SelectedProduct format for the existing workflow
     * @param stockItem - The selected warehouse stock item
     */
    const handleStockItemSelect = (stockItem: ProductStockItem) => {
        // Find the full product information by barcode
        const fullProduct = products.find(p => Number(p.barcode) === stockItem.barcode)

        if (fullProduct) {
            // Use existing handleProductSelect with the full product data
            handleProductSelect(fullProduct, 1)
        } else {
            // Create a basic product object if full product not found
            const basicProduct: Product = {
                id: stockItem.id, // Use stock item ID as product ID
                name: `Producto ${stockItem.barcode}`, // Fallback name
                brand: "Sin marca", // Default brand
                price: 0, // Default price since we don't have it in stock data
                stock: 1, // Set to 1 since we know this specific item exists
                barcode: stockItem.barcode.toString(),
            }
            handleProductSelect(basicProduct, 1)
        }
    }

    // Early return pattern for loading state
    // This prevents rendering the main UI while data is still being fetched
    if (isLoadingProducts || isLoadingProductStock) {
        return (
            <ThemedView style={styles.container}>
                <StatusBar style={isDark ? "light" : "dark"} />
                <ThemedHeader title="Escáner de Inventario" />
                <ThemedView style={styles.loadingContainer}>
                    <ThemedText style={styles.loadingText}>
                        Cargando inventario...
                    </ThemedText>
                    {(isFetchingProducts || isFetchingProductStock) && (
                        <ThemedText style={styles.subLoadingText}>
                            Actualizando datos...
                        </ThemedText>
                    )}
                </ThemedView>
            </ThemedView>
        )
    }

    // Early return pattern for error state
    // Provides user with clear error messaging and recovery options
    if (isProductsError || isProductStockError) {
        return (
            <ThemedView style={styles.container}>
                <StatusBar style={isDark ? "light" : "dark"} />
                <ThemedHeader title="Escáner de Inventario" />
                <ThemedView style={styles.errorContainer}>
                    <ThemedText style={styles.errorTitle}>
                        Error al Cargar Inventario
                    </ThemedText>
                    <ThemedText style={styles.errorMessage}>
                        {productsError?.message || productStockError?.message || "Ocurrió un error inesperado"}
                    </ThemedText>
                    <ThemedButton
                        title="Reintentar"
                        onPress={() => {
                            refetchProducts()
                            refetchProductStock()
                        }}
                        variant="primary"
                        size="medium"
                        style={styles.retryButton}
                    />
                </ThemedView>
            </ThemedView>
        )
    }

    // Filter available stock for the target warehouse
    const availableStock = productStock.filter(
        item => item.currentWarehouse === 1 && !item.isBeingUsed
    )

    return (
        <ThemedView style={styles.container}>
            <StatusBar style={isDark ? "light" : "dark"} />

            <ThemedHeader title="Escáner de Inventario" />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Pending Orders Section - Collapsible */}
                {pendingOrders.length > 0 && (
                    <ThemedView style={styles.section}>
                        <Collapsible title={`Órdenes Pendientes (${pendingOrders.length})`}>
                            {pendingOrders.map((order: PendingOrder) => (
                                <PendingOrderCard
                                    key={order.id}
                                    order={order}
                                    onOrderClick={(order) => handleOrderClick(order, router)}
                                    style={styles.pendingCard}
                                />
                            ))}
                        </Collapsible>
                    </ThemedView>
                )}

                {/* Warehouse Inventory Section */}
                <ScannerComboboxSection
                    products={products}
                    productStock={availableStock}
                    targetWarehouse={1}
                    onStockItemSelect={handleStockItemSelect}
                    onScanPress={() => setShowScanner(true)}
                    isLoading={isFetchingProducts || isFetchingProductStock}
                    itemCount={availableStock.length}
                />

                {/* Selected Products Section */}
                {selectedProducts.length > 0 && (
                    <ThemedView style={styles.section}>
                        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                            Productos Seleccionados ({selectedProducts.length})
                        </ThemedText>
                        {selectedProducts.map((product: SelectedProduct) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onRemove={handleRemoveProduct}
                                onUpdateQuantity={handleUpdateQuantity}
                                style={styles.productCard}
                            />
                        ))}
                    </ThemedView>
                )}

                {/* Submit Button */}
                {selectedProducts.length > 0 && (
                    <ThemedView style={styles.submitContainer}>
                        <ThemedButton
                            title="Procesar Inventario"
                            onPress={handleSubmit}
                            style={styles.submitButton}
                            variant="primary"
                            size="medium"
                        />
                    </ThemedView>
                )}
            </ScrollView>

            {/* Barcode Scanner Modal - Enhanced with better error handling */}
            {showScanner && (
                <BarcodeScanner
                    onBarcodeScanned={handleEnhancedBarcodeScanned}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </ThemedView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        paddingTop: Platform.OS === "ios" ? 50 : 16,
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        padding: 8,
    },
    backText: {
        marginLeft: 4,
        fontSize: 16,
    },
    title: {
        fontSize: 20,
        textAlign: "center",
    },
    placeholder: {
        width: 50,
    },
    scrollView: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        marginBottom: 12,
    },
    pendingCard: {
        marginBottom: 8,
    },
    productCard: {
        marginBottom: 8,
    },
    submitContainer: {
        marginTop: 16,
        marginBottom: 32,
    },
    submitButton: {
        width: "100%",
    },
    // Loading state styles
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    loadingText: {
        fontSize: 18,
        textAlign: "center",
        marginBottom: 8,
    },
    subLoadingText: {
        fontSize: 14,
        textAlign: "center",
        opacity: 0.7,
    },
    // Error state styles
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: "600",
        textAlign: "center",
        marginBottom: 12,
    },
    errorMessage: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: 24,
        opacity: 0.8,
        lineHeight: 22,
    },
    retryButton: {
        paddingHorizontal: 32,
    },
})
