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
import type { ProductStockItem, SelectedProduct, Product, CabinetWarehouseMapEntry } from "@/types/types"
import { useBaseUserStore } from "@/app/stores/baseUserStores"
import { ThemedHeader } from "@/components/ThemedHeader"
import { ScannerComboboxSection } from "@/components/ui/ScannerComboboxSection"
import { getProductStock, getCabinetWarehouses } from "@/lib/fetch-functions"
import { QUERY_KEYS } from "@/lib/query-keys"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner-native"
import { useCreateWithdrawOrderMutation } from "@/lib/mutations"
import type { CreateWithdrawOrderPayload } from "@/lib/mutations"

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
    // Handle response structure: { cabinet: [{ employee: {...}, productStock: {...} }, ...], cabinetId, cabinetName, totalItems, warehouseId }
    const productStock: ProductStockItem[] = (() => {
        if (!data) return [];
        
        // Check if data has cabinet property with array
        if (data.cabinet && Array.isArray(data.cabinet)) {
            return data.cabinet.map((item: {
                employee: unknown | null;
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
            }) => {
                const stock = item.productStock;
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

    // Get store state and actions first to access currentEmployee
    const {
        selectedProducts,
        showScanner,
        productStock: storeProductStock,
        handleProductStockSelect,
        handleBarcodeScanned,
        handleRemoveProduct,
        clearSelectedProducts,
        setShowScanner,
        getAvailableStockItems,
        currentEmployee,
    } = useBaseUserStore()

    // Get query client for cache invalidation
    const queryClient = useQueryClient()

    // Initialize mutation hook
    const createWithdrawOrderMutation = useCreateWithdrawOrderMutation()

    // Get employee warehouse ID for filtering
    const employeeWarehouseId = currentEmployee?.employee.warehouseId

    // Fetch cabinet warehouse map to find matching cabinet
    const { warehouses } = useCabinetWarehousesQuery()
    
    // Find the cabinet entry that matches the employee's warehouse ID
    const matchedCabinet = useMemo(() => {
        if (!employeeWarehouseId || !warehouses.length) return undefined
        return warehouses.find(entry => entry.warehouseId === employeeWarehouseId)
    }, [employeeWarehouseId, warehouses])

    
    // Get cabinet ID and warehouse name from matched cabinet
    const cabinetId = matchedCabinet?.cabinetId
    const warehouseName = matchedCabinet?.cabinetName
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

    // Initialize store with product stock when available
    useEffect(() => {
        const hasProductStock = productStock.length > 0
        const stockLoaded = !isLoadingProductStock

        if (hasProductStock && stockLoaded && !isInitialized.current) {
            const store = useBaseUserStore.getState()
            // Initialize store with productStock only
            store.initializeStore(productStock)
            isInitialized.current = true
        }
    }, [productStock, isLoadingProductStock])

    // Get available stock items from the store (filters by warehouse and availability)
    // Uses warehouse ID from current employee state
    const availableStock = getAvailableStockItems(warehouseId)

    /**
     * Extracts product information from a ProductStockItem's description
     * @param stockItem - The stock item to extract info from
     * @returns Object with name and brand
     */
    const extractProductInfoFromStock = (stockItem: ProductStockItem): { name: string; brand: string } => {
        const description = stockItem.description || `Producto ${stockItem.barcode}`
        const nameParts = description.split(" - ")
        return {
            name: nameParts[0] || description,
            brand: nameParts[1] || "Sin marca",
        }
    }

    /**
     * Enhanced barcode scan handler that works with product stock data
     * Searches through product stock items to find matches by UUID (stock item ID)
     * Shows success toast with product details when product is found and added
     * @param identifier - Scanned UUID or barcode string to match against stock items
     */
    const handleEnhancedBarcodeScanned = (identifier: string) => {
        // Search by stock item ID (UUID) first, then fall back to barcode if needed
        const foundStockItem = availableStock.find(
            (item) => item.id === identifier || item.barcode.toString() === identifier
        )

        if (foundStockItem) {
            handleBarcodeScanned(identifier)
            // Extract product info from stock item
            const productInfo = extractProductInfoFromStock(foundStockItem)
            // Show success toast with product information
            toast.success(
                `${productInfo.name}${productInfo.brand ? ` - ${productInfo.brand}` : ""} agregado`,
                {
                    description: `Código: ${identifier}`,
                }
            )
        } else {
            // Show user-friendly error message when product not found
            toast.warning(`Producto con código ${identifier} no encontrado en el inventario`)
        }
    }

    /**
     * Handler for warehouse stock item selection
     * Uses the stock-based selection system that tracks individual items
     * Extracts product information from stock item description
     * @param stockItem - The selected warehouse stock item
     */
    const handleStockItemSelect = (stockItem: ProductStockItem) => {
        // Extract product info from stock item
        const productInfo = extractProductInfoFromStock(stockItem)
        
        // Create a basic product object from stock item data
        const basicProduct: Product = {
            id: stockItem.id,
            name: productInfo.name,
            brand: productInfo.brand,
            price: 0, // Price not available in stock data
            stock: 1, // Individual stock item
            barcode: stockItem.barcode.toString(),
            ...(stockItem.description && { description: stockItem.description }),
        }
        
        handleProductStockSelect(stockItem, basicProduct)
    }

    /**
     * Handles the submission of the withdraw order
     * Builds the payload from selected products and employee data,
     * calls the mutation with toast feedback, and clears selection on success
     */
    const handleSubmitWithdrawOrder = async () => {
        // Validate that we have selected products
        if (selectedProducts.length === 0) {
            toast.error("Agrega al menos un producto antes de continuar")
            return
        }

        // Validate that we have employee data
        if (!currentEmployee?.employee.id) {
            toast.error("No se pudo obtener la información del empleado")
            return
        }

        // Build the payload for the API
        const payload: CreateWithdrawOrderPayload = {
            dateWithdraw: new Date().toISOString(),
            employeeId: currentEmployee.employee.id,
            numItems: selectedProducts.length,
            products: selectedProducts.map(p => p.id),
            isComplete: false,
        }

        // Call mutation with toast.promise for automatic loading/success/error feedback
        toast.promise(
            createWithdrawOrderMutation.mutateAsync(payload),
            {
                loading: "Procesando retiro de productos...",
                success: (data) => {
                    // Clear selected products on success
                    clearSelectedProducts()
                    // Invalidate product stock query to refetch updated data
                    if (cabinetId) {
                        queryClient.invalidateQueries({
                            queryKey: [QUERY_KEYS.PRODUCT_STOCK, cabinetId],
                        })
                    }
                    return data.message || "Retiro procesado correctamente"
                },
                error: (error) => {
                    return error instanceof Error 
                        ? error.message 
                        : "Error al procesar el retiro"
                },
            }
        )
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
                    products={[]}
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
                            onPress={handleSubmitWithdrawOrder}
                            style={styles.submitButton}
                            variant="primary"
                            size="medium"
                            isLoading={createWithdrawOrderMutation.isPending}
                            disabled={createWithdrawOrderMutation.isPending}
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
