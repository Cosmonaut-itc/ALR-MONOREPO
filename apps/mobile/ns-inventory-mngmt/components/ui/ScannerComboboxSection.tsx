import { StyleSheet, TouchableOpacity } from "react-native"
import { ThemedView } from "@/components/ThemedView"
import { ThemedText } from "@/components/ThemedText"
import { ProductCombobox } from "@/components/ui/ProductCombobox"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { Camera, RefreshCw } from "lucide-react-native"
import type { Product, ProductStockItem, CabinetWarehouseMapEntry } from "@/types/types"
import { useQuery } from "@tanstack/react-query"
import { getCabinetWarehouses } from "@/lib/fetch-functions"
import { QUERY_KEYS } from "@/lib/query-keys"
import { useMemo } from "react"

/**
 * Props interface for the ScannerComboboxSection component
 * Simplified for warehouse-only mode
 */
interface ScannerComboboxSectionProps {
    /** Array of available products for metadata lookup */
    products: Product[]
    /** Array of product stock items to display */
    productStock: ProductStockItem[]
    /** Target warehouse UUID to filter inventory by */
    targetWarehouse?: string
    /** Callback function when a stock item is selected */
    onStockItemSelect: (item: ProductStockItem) => void
    /** Callback function when the scan button is pressed */
    onScanPress: () => void
    /** Callback function when the refresh button is pressed */
    onRefreshPress?: () => void
    /** Optional placeholder text for the combobox input */
    placeholder?: string
    /** Optional title to display above the scanner section */
    title?: string
    /** Boolean indicating if data is currently being loaded/refreshed */
    isLoading?: boolean
    /** Total count of available stock items for display purposes */
    itemCount?: number
}

/**
 * ScannerComboboxSection Component
 * 
 * A warehouse inventory section that combines stock item selection via combobox and barcode scanning
 * functionality. This component is specifically designed for warehouse inventory management.
 * 
 * Features:
 * - Warehouse stock combobox with search and selection capabilities
 * - Camera scan button with visual feedback
 * - Loading states for better user experience
 * - Stock item count display for inventory awareness
 * - Responsive design with proper theming support
 * 
 * @param props - Configuration object containing all component properties
 * @returns JSX.Element representing the warehouse scanner and combobox section
 */
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

export function ScannerComboboxSection({
    products,
    productStock,
    targetWarehouse,
    onStockItemSelect,
    onScanPress,
    onRefreshPress,
    placeholder = "Buscar en inventario...",
    isLoading = false,
}: ScannerComboboxSectionProps) {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"
    
    // Fetch cabinet warehouse map to map UUID to name
    const { warehouses } = useCabinetWarehousesQuery()
    
    // Create a map of warehouse ID to name for quick lookup
    // Since multiple cabinets can belong to the same warehouse, we use the first one we find
    // or we could use a more sophisticated approach to get the warehouse name
    const warehouseMap = useMemo(() => {
        const map = new Map<string, string>()
        for (const entry of warehouses) {
            // Only set if not already set (first entry for this warehouse wins)
            // Or use the entry name if it contains warehouse info
            if (!map.has(entry.warehouseId)) {
                map.set(entry.warehouseId, entry.name)
            }
        }
        return map
    }, [warehouses])
    
    // Get warehouse name from UUID, fallback to UUID if not found
    const warehouseName = useMemo(() => {
        if (!targetWarehouse) return undefined
        return warehouseMap.get(targetWarehouse) || targetWarehouse
    }, [targetWarehouse, warehouseMap])
    /**
     * Determines the appropriate placeholder text based on loading state
     * Provides user feedback during data fetching operations
     * @returns Localized placeholder string
     */
    const getPlaceholderText = (): string => {
        if (isLoading) {
            return "Cargando inventario..."
        }

        if (productStock.length === 0 && !isLoading) {
            return "No hay elementos en el almacén"
        }

        return placeholder
    }

    /**
     * Determines if the scan button should be disabled based on current state
     * @returns Boolean indicating if scan button should be disabled
     */
    const isScanDisabled = (): boolean => {
        return productStock.length === 0 && !isLoading
    }

    /**
     * Gets the appropriate helper text to display below the controls
     * @returns Helper text string or undefined
     */
    const getHelperText = (): string | undefined => {
        if (productStock.length === 0 && !isLoading) {
            const warehouseDisplay = warehouseName || targetWarehouse || "el almacén"
            return `No se encontraron elementos en ${warehouseDisplay}`
        }

        return undefined
    }

    return (
        <ThemedView style={styles.section}>
            {/* Main Input Row - Combobox and Scan Button */}
            <ThemedView style={styles.inputRow}>
                {/* Product Combobox Container */}
                <ThemedView style={styles.comboboxContainer}>
                    <ProductCombobox
                        products={products}
                        productStock={productStock}
                        {...(targetWarehouse !== undefined && { targetWarehouse })}
                        {...(warehouseName !== undefined && { warehouseName })}
                        onStockItemSelect={onStockItemSelect}
                        placeholder={getPlaceholderText()}
                        disabled={isLoading || productStock.length === 0}
                    />
                </ThemedView>

                {/* Refresh Button */}
                {onRefreshPress && (
                    <TouchableOpacity
                        onPress={onRefreshPress}
                        style={[
                            styles.refreshButton,
                            {
                                backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                                borderColor: isDark ? Colors.dark.border : Colors.light.border,
                            },
                            isLoading && styles.refreshButtonDisabled,
                        ]}
                        activeOpacity={0.7}
                        disabled={isLoading}
                        accessibilityLabel="Actualizar inventario"
                        accessibilityHint="Toca para actualizar el inventario del almacén"
                    >
                        <RefreshCw
                            size={24}
                            color={
                                isLoading
                                    ? (isDark ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault)
                                    : (isDark ? Colors.dark.tint : Colors.light.tint)
                            }
                        />
                    </TouchableOpacity>
                )}

                {/* Barcode Scanner Button */}
                <TouchableOpacity
                    onPress={onScanPress}
                    style={[
                        styles.scanButton,
                        {
                            backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                            borderColor: isDark ? Colors.dark.border : Colors.light.border,
                        },
                        isScanDisabled() && styles.scanButtonDisabled,
                    ]}
                    activeOpacity={0.7}
                    disabled={isScanDisabled()}
                    accessibilityLabel="Abrir escáner de códigos de barras"
                    accessibilityHint="Toca para abrir la cámara y escanear códigos de barras"
                >
                    <Camera
                        size={24}
                        color={
                            isScanDisabled()
                                ? (isDark ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault)
                                : (isDark ? Colors.dark.tint : Colors.light.tint)
                        }
                    />
                </TouchableOpacity>
            </ThemedView>

            {/* Helper Text for User Guidance */}
            {getHelperText() && (
                <ThemedText style={styles.helperText}>
                    {getHelperText()}
                </ThemedText>
            )}
        </ThemedView>
    )
}

const styles = StyleSheet.create({
    section: {
        marginBottom: 24,
    },
    titleContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        flex: 1,
    },
    loadingIndicator: {
        fontSize: 12,
        opacity: 0.7,
        fontStyle: "italic",
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 12,
    },
    comboboxContainer: {
        flex: 1,
    },
    refreshButton: {
        width: 56,
        height: 56,
        borderRadius: 8,
        borderWidth: 1,
        bottom: 17,
        justifyContent: "center",
        alignItems: "center",
    },
    refreshButtonDisabled: {
        opacity: 0.5,
    },
    scanButton: {
        width: 56,
        height: 56,
        borderRadius: 8,
        borderWidth: 1,
        bottom: 17,
        justifyContent: "center",
        alignItems: "center",
    },
    scanButtonDisabled: {
        opacity: 0.5,
    },
    helperText: {
        fontSize: 12,
        opacity: 0.6,
        marginTop: 8,
        textAlign: "center",
        fontStyle: "italic",
    },
}) 