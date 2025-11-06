import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { ProductCombobox } from "@/components/ui/ProductCombobox"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import type { ProductStockItem } from "@/types/types"
import { Camera, RefreshCw } from "lucide-react-native"
import { StyleSheet, TouchableOpacity } from "react-native"

/**
 * Props interface for the ScannerComboboxSection component
 * Simplified for warehouse-only mode
 */
interface ScannerComboboxSectionProps {
    /** Array of product stock items to display */
    productStock: ProductStockItem[]
    /** Target warehouse UUID to filter inventory by */
    targetWarehouse?: string
    /** Warehouse name for display purposes */
    warehouseName?: string
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
export function ScannerComboboxSection({
    productStock,
    warehouseName,
    onStockItemSelect,
    onScanPress,
    onRefreshPress,
    placeholder = "Buscar en inventario...",
    isLoading = false,
}: ScannerComboboxSectionProps) {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"
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
            const warehouseDisplay = warehouseName
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
                        productStock={productStock}
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