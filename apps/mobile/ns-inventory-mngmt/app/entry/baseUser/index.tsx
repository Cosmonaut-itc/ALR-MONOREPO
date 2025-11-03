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
import { getProductStock, getCabinetWarehouses } from "@/lib/fetch-functions"
import { QUERY_KEYS } from "@/lib/query-keys"
import { useQuery } from "@tanstack/react-query"
import type { Product, CabinetWarehouseMapEntry } from "@/types/types"

/**
 * Custom hook to fetch and manage cabinet warehouse map
 * @returns Object containing warehouse map data, loading state, and utility functions
 */
interface UseCabinetWarehousesQueryResult {
    /** Array of cabinet warehouse map entries */
    warehouses: CabinetWarehouseMapEntry[]
    /** Boolean indicating if the initial data fetch is in progress */
    isLoading: boolean
    /** Boolean indicating if there's an error in the query */
    isError: boolean
    /** Error object containing details about any query failures */
    error: Error | null
    /** Boolean indicating if a background refetch is in progress */
    isFetching: boolean
    /** Function to manually trigger a refetch of warehouse map */
    refetch: () => void
}

const useCabinetWarehousesQuery = (): UseCabinetWarehousesQueryResult => {
    const {
        data: warehouses,
        isLoading,
        isError,
        error,
        isFetching,
        refetch,
    } = useQuery<CabinetWarehouseMapEntry[]>({
        queryKey: [QUERY_KEYS.CABINET_WAREHOUSES],
        queryFn: getCabinetWarehouses,
        staleTime: 10 * 60 * 1000, // 10 minutes - warehouse data doesn't change frequently
        gcTime: 30 * 60 * 1000, // 30 minutes - cache garbage collection time
        retry: 3, // Retry failed requests up to 3 times
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    })

    return {
        warehouses: (warehouses || []) as CabinetWarehouseMapEntry[],
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
 * @param cabinetId - The cabinet ID to fetch product stock for
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

const useProductStockQuery = (cabinetId: string | undefined): UseProductStockQueryResult => {
    // Fetch product stock data using TanStack Query with proper error handling and loading states
    const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
        queryKey: [QUERY_KEYS.PRODUCT_STOCK, cabinetId],
        queryFn: () => {
            if (!cabinetId) {
                throw new Error("Cabinet ID is not available");
            }
            return getProductStock(cabinetId);
        },
        enabled: !!cabinetId, // Only fetch when cabinetId is available
        staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh for this duration
        gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time
        retry: 3, // Retry failed requests up to 3 times
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    })

    // Transform API data to local ProductStockItem interface
    // Handle response structure: [{ cabinet: { productStock: {...}, employee: {...} } }, ...]
    const productStock: ProductStockItem[] = (() => {
        if (!data) return [];
        
        // Check if data is a direct array with cabinet property
        if (Array.isArray(data)) {
            return data.map((item: {
                cabinet: {
                    productStock: {
                        id: string;
                        barcode: number;
                        description?: string | null;
                        lastUsed: string | null;
                        lastUsedBy: string | null;
                        numberOfUses: number;
                        currentWarehouse: string;
                        isBeingUsed: boolean;
                        firstUsed: string | null;
                    };
                };
            }) => {
                const stock = item.cabinet.productStock;
                const transformed: ProductStockItem = {
                    id: stock.id,
                    barcode: stock.barcode,
                    numberOfUses: stock.numberOfUses,
                    currentWarehouse: stock.currentWarehouse,
                    isBeingUsed: stock.isBeingUsed,
                };
                
                if (stock.description !== undefined && stock.description !== null) {
                    transformed.description = stock.description;
                }
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
    const { currentEmployee } = useBaseUserStore();
    const employeeWarehouseId = currentEmployee?.employee.warehouseId;

    // Fetch cabinet warehouse map to find matching cabinet
    const { warehouses } = useCabinetWarehousesQuery()
    
    // Find the cabinet entry that matches the employee's warehouse ID
    const matchedCabinet = useMemo(() => {
        if (!employeeWarehouseId || !warehouses.length) return undefined
        return warehouses.find(entry => entry.warehouseId === employeeWarehouseId)
    }, [employeeWarehouseId, warehouses])
    
    // Get cabinet ID and warehouse name from matched cabinet
    const cabinetId = matchedCabinet?.id
    const warehouseName = matchedCabinet?.name
    const warehouseId = employeeWarehouseId // Keep for backward compatibility

    const {
        productStock,
        isLoading: isLoadingProductStock,
        isError: isProductStockError,
        error: productStockError,
        isFetching: isFetchingProductStock,
        refetch: refetchProductStock,
    } = useProductStockQuery(cabinetId)

    // Track if store has been initialized to prevent infinite loops
    const isInitialized = useRef(false)

    const currentDate = useMemo(() => new Date().toISOString().split('T')[0], [])

    // Initialize store with fetched product stock when available
    useEffect(() => {
        const hasProductStock = productStock.length > 0
        const stockLoaded = !isLoadingProductStock

        if (hasProductStock && stockLoaded && !isInitialized.current) {
            console.log('🚀 Initializing store with product stock:', {
                productStockCount: productStock.length
            })
            const store = useBaseUserStore.getState()
            // Only update productStock, products should already be in store from elsewhere
            if (store.productStock.length === 0 || store.productStock !== productStock) {
                store.initializeStore(store.availableProducts, productStock)
            }
            isInitialized.current = true
        }
    }, [productStock, isLoadingProductStock])

    // Get store state and actions
    const {
        selectedProducts,
        showScanner,
        availableProducts,
        handleProductStockSelect,
        handleBarcodeScanned,
        handleRemoveProduct,
        handleSubmit,
        setShowScanner,
        getAvailableStockItems,
    } = useBaseUserStore()


    // Get available stock items from the store (filters by warehouse and availability)
    // Uses warehouse ID from current employee state
    const availableStock = getAvailableStockItems(warehouseId)

    /**
     * Enhanced barcode scan handler that works with store product data
     * Searches through the available products to find matches by barcode
     * @param barcode - Scanned barcode string to match against products
     */
    const handleEnhancedBarcodeScanned = (barcode: string) => {
        const foundProduct = availableProducts.find(
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
        const fullProduct = availableProducts.find(p => p.barcode === stockItem.barcode.toString() || Number(p.barcode) === stockItem.barcode)

        if (fullProduct) {
            // Use the new stock-based selection method
            handleProductStockSelect(stockItem, fullProduct)
        } else {
            // Create a basic product object if full product not found
            // Try to find product by barcode from available products first
            const fallbackProduct = availableProducts.find(
                (p) => p.barcode === stockItem.barcode.toString() || Number(p.barcode) === stockItem.barcode
            );
            const basicProduct: Product = {
                id: `product-${stockItem.barcode}`, // Use product prefix + barcode as product ID
                name: fallbackProduct?.name || `Producto ${stockItem.barcode}`, // Use product name if available, otherwise fallback
                brand: fallbackProduct?.brand || "Sin marca", // Use product brand if available
                price: fallbackProduct?.price || 0, // Use product price if available
                stock: 1, // Set to 1 since we know this specific item exists
                barcode: stockItem.barcode.toString(),
            }
            
            // Add description only if it exists (for exactOptionalPropertyTypes compatibility)
            if (fallbackProduct?.description !== undefined) {
                basicProduct.description = fallbackProduct.description
            }
            
            handleProductStockSelect(stockItem, basicProduct)
        }
    }

    // Early return pattern for loading state
    // This prevents rendering the main UI while data is still being fetched
    if (isLoadingProductStock) {
        return (
            <ThemedView style={styles.container}>
                <StatusBar style={isDark ? "light" : "dark"} />
                <ThemedHeader title="Escáner de Inventario" />
                <ThemedView style={styles.loadingContainer}>
                    <ThemedText style={styles.loadingText}>
                        Cargando inventario...
                    </ThemedText>
                    {isFetchingProductStock && (
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
    if (isProductStockError) {
        return (
            <ThemedView style={styles.container}>
                <StatusBar style={isDark ? "light" : "dark"} />
                <ThemedHeader title="Escáner de Inventario" />
                <ThemedView style={styles.errorContainer}>
                    <ThemedText style={styles.errorTitle}>
                        Error al Cargar Inventario
                    </ThemedText>
                    <ThemedText style={styles.errorMessage}>
                        {productStockError?.message || "Ocurrió un error inesperado"}
                    </ThemedText>
                    <ThemedButton
                        title="Reintentar"
                        onPress={() => {
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
                {/* Uses warehouse ID from current employee state */}
                <ScannerComboboxSection
                    products={availableProducts}
                    productStock={availableStock}
                    {...(warehouseId !== undefined && { targetWarehouse: warehouseId })}
                    {...(warehouseName !== undefined && { warehouseName })}
                    onStockItemSelect={handleStockItemSelect}
                    onScanPress={() => setShowScanner(true)}
                    onRefreshPress={() => refetchProductStock()}
                    isLoading={isFetchingProductStock}
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
