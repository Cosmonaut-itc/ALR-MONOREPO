"use client"

import { useEffect, useMemo, useRef } from "react"
import { StyleSheet, Platform, ScrollView } from "react-native"
import { StatusBar } from "expo-status-bar"
import { router } from "expo-router"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { ThemedButton } from "@/components/ThemedButton"
import { BarcodeScanner } from "@/components/ui/BarcodeScanner"
import { ProductCard } from "@/components/ui/ProductCard"
import { useColorScheme } from "@/hooks/useColorScheme"
import type { ProductStockItem, SelectedProduct } from "@/types/types"
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
        id: apiProduct.good_id.toString(), // Convert number to string for Product.id
        name: apiProduct.title,
        brand: apiProduct.unit_short_title, // Using unit short title as brand fallback
        price: apiProduct.cost,
        stock: Number(apiProduct.value), // Convert string to number for Product.stock
        barcode: apiProduct.barcode, // barcode is already a string from API
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

    // Transform API data to local Product interface with memoization
    // Only transform if data is available to avoid runtime errors
    const products: Product[] = useMemo(() => {
        // Return empty array only if there's an error or no data
        if (isError || !apiProducts) return []
        return apiProducts.map(transformApiProductToProduct)
    }, [apiProducts, isError])

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
    // Get warehouse ID from current employee data
    const { currentEmployee } = useBaseUserStore();
    const warehouseId = currentEmployee?.employee.warehouseId;

    // Fetch product stock data using TanStack Query with proper error handling and loading states
    const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
        queryKey: [QUERY_KEYS.PRODUCT_STOCK, warehouseId],
        queryFn: () => {
            if (!warehouseId) {
                throw new Error("Warehouse ID is not available");
            }
            return getProductStock(warehouseId);
        },
        enabled: !!warehouseId, // Only fetch when warehouseId is available
        staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh for this duration
        gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time
        retry: 3, // Retry failed requests up to 3 times
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    })

    // Transform API data to local ProductStockItem interface
    // Handle both possible response structures:
    // 1. Direct array: [{ productStock: {...}, employee: {...} }, ...]
    // 2. Wrapped in warehouse property: { warehouse: [{ productStock: {...}, employee: {...} }, ...], ... }
    const productStock: ProductStockItem[] = (() => {
        if (!data) return [];
        
        // Check if data has warehouse property (old structure)
        if (data.warehouse && Array.isArray(data.warehouse)) {
            return data.warehouse.map((item: {
                productStock: {
                    id: string;
                    barcode: number;
                    lastUsed: string | null;
                    lastUsedBy: string | null;
                    numberOfUses: number;
                    currentWarehouse: string;
                    isBeingUsed: boolean;
                    firstUsed: string | null;
                };
            }) => {
                const stock = item.productStock;
                const transformed: ProductStockItem = {
                    id: stock.id,
                    barcode: stock.barcode,
                    numberOfUses: stock.numberOfUses,
                    currentWarehouse: stock.currentWarehouse,
                    isBeingUsed: stock.isBeingUsed,
                };
                
                if (stock.lastUsed) {
                    transformed.lastUsed = new Date(stock.lastUsed);
                }
                if (stock.lastUsedBy) {
                    transformed.lastUsedBy = stock.lastUsedBy;
                }
                if (stock.firstUsed) {
                    transformed.firstUsed = new Date(stock.firstUsed);
                }
                
                return transformed;
            });
        }
        
        // Check if data is a direct array (new structure)
        if (Array.isArray(data)) {
            return data.map((item: {
                productStock: {
                    id: string;
                    barcode: number;
                    lastUsed: string | null;
                    lastUsedBy: string | null;
                    numberOfUses: number;
                    currentWarehouse: string;
                    isBeingUsed: boolean;
                    firstUsed: string | null;
                };
            }) => {
                const stock = item.productStock;
                const transformed: ProductStockItem = {
                    id: stock.id,
                    barcode: stock.barcode,
                    numberOfUses: stock.numberOfUses,
                    currentWarehouse: stock.currentWarehouse,
                    isBeingUsed: stock.isBeingUsed,
                };
                
                if (stock.lastUsed) {
                    transformed.lastUsed = new Date(stock.lastUsed);
                }
                if (stock.lastUsedBy) {
                    transformed.lastUsedBy = stock.lastUsedBy;
                }
                if (stock.firstUsed) {
                    transformed.firstUsed = new Date(stock.firstUsed);
                }
                
                return transformed;
            });
        }
        
        return [];
    })();

    return {
        productStock,
        isLoading,
        isError,
        error,
        isFetching,
        refetch,
    }
}

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

    // Track if store has been initialized to prevent infinite loops
    const isInitialized = useRef(false)

    const currentDate = useMemo(() => new Date().toISOString().split('T')[0], [])

    // Initialize store with fetched data only when BOTH datasets are available
    useEffect(() => {
        // Wait for both datasets to have data and not be in loading state
        const hasProducts = products.length > 0
        const hasProductStock = productStock.length > 0
        const bothLoaded = !isLoadingProducts && !isLoadingProductStock

        if (hasProducts && hasProductStock && bothLoaded && !isInitialized.current) {
            console.log('🚀 Initializing store with:', {
                productsCount: products.length,
                productStockCount: productStock.length
            })
            useBaseUserStore.getState().initializeStore(products, productStock)
            isInitialized.current = true
        }
    }, [products, productStock, isLoadingProducts, isLoadingProductStock])

    // Get store state and actions
    const {
        selectedProducts,
        showScanner,
        handleProductStockSelect,
        handleBarcodeScanned,
        handleRemoveProduct,
        handleSubmit,
        setShowScanner,
        getAvailableStockItems,
    } = useBaseUserStore()


    // Get available stock items from the store (filters by warehouse and availability)
    // TODO: Replace with actual warehouse UUID from server/user context
    const availableStock = getAvailableStockItems()

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
     * Uses the new stock-based selection system that tracks individual items
     * @param stockItem - The selected warehouse stock item
     */
    const handleStockItemSelect = (stockItem: ProductStockItem) => {
        // Find the full product information by barcode
        // Compare Product.barcode (string) with ProductStockItem.barcode (number)
        const fullProduct = products.find(p => p.barcode === stockItem.barcode.toString() || Number(p.barcode) === stockItem.barcode)

        if (fullProduct) {
            // Use the new stock-based selection method
            handleProductStockSelect(stockItem, fullProduct)
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
            handleProductStockSelect(stockItem, basicProduct)
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


    return (
        <ThemedView style={styles.container}>
            <StatusBar style={isDark ? "light" : "dark"} />

            <ThemedHeader title="Retiro de Productos" />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Return Order Section, it ius just a button that opens the return order screen */}
                <ThemedButton
                    title="Retornar Productos"
                    onPress={() => router.push(`/entry/baseUser/returnOrder/${currentDate}`)}
                    variant="primary"
                    size="medium"
                    style={styles.returnOrderButton}
                />

                {/* Warehouse Inventory Section */}
                {/* TODO: Replace with actual warehouse UUID from server/user context */}
                <ScannerComboboxSection
                    products={products}
                    productStock={availableStock}
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
                                style={styles.productCard}
                            />
                        ))}
                    </ThemedView>
                )}

                {/* Submit Button */}
                {selectedProducts.length > 0 && (
                    <ThemedView style={styles.submitContainer}>
                        <ThemedButton
                            title="Procesar Retiro"
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
    returnOrderButton: {
        marginBottom: 16,
    },
})
