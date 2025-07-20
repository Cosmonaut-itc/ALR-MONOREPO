import { StyleSheet, TouchableOpacity } from "react-native"
import { ThemedView } from "@/components/ThemedView"
import { ThemedText } from "@/components/ThemedText"
import { ProductCombobox } from "@/components/ui/ProductCombobox"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { Camera } from "lucide-react-native"
import type { Product, ProductStockItem, WarehouseInventoryItem } from "@/types/types"

/**
 * Props interface for the ScannerComboboxSection component
 * Defines all required and optional properties for proper TypeScript support
 */
interface ScannerComboboxSectionProps {
    /** Array of available products to display in the combobox */
    products: Product[]
    /** Array of product stock items for warehouse mode */
    productStock?: ProductStockItem[]
    /** Target warehouse to filter inventory by */
    targetWarehouse?: number
    /** Mode for the ProductCombobox: 'product' or 'warehouse' */
    mode?: "product" | "warehouse"
    /** Callback function when a product is selected from the combobox */
    onProductSelect: (product: Product) => void
    /** Callback function when a warehouse inventory item is selected */
    onStockItemSelect?: (item: WarehouseInventoryItem) => void
    /** Callback function when the scan button is pressed */
    onScanPress: () => void
    /** Optional placeholder text for the combobox input */
    placeholder?: string
    /** Optional title to display above the scanner section */
    title?: string
    /** Boolean indicating if products are currently being loaded/refreshed */
    isLoading?: boolean
    /** Total count of available products for display purposes */
    productCount?: number
}

/**
 * ScannerComboboxSection Component
 * 
 * A comprehensive section that combines product selection via combobox and barcode scanning
 * functionality. This component handles both manual product selection and camera-based scanning.
 * Now supports both regular product mode and warehouse inventory mode.
 * 
 * Features:
 * - Product combobox with search and selection capabilities
 * - Warehouse inventory mode for stock-specific selection
 * - Camera scan button with visual feedback
 * - Loading states for better user experience
 * - Product count display for inventory awareness
 * - Responsive design with proper theming support
 * 
 * @param props - Configuration object containing all component properties
 * @returns JSX.Element representing the scanner and combobox section
 */
export function ScannerComboboxSection({
    products,
    productStock = [],
    targetWarehouse = 1,
    mode = "product",
    onProductSelect,
    onStockItemSelect,
    onScanPress,
    placeholder = "Seleccionar producto...",
    title,
    isLoading = false,
    productCount = 0,
}: ScannerComboboxSectionProps) {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    /**
     * Determines the appropriate placeholder text based on loading state and mode
     * Provides user feedback during data fetching operations
     * @returns Localized placeholder string
     */
    const getPlaceholderText = (): string => {
        if (isLoading) {
            return mode === "warehouse" ? "Cargando inventario..." : "Cargando productos..."
        }

        if (mode === "warehouse" && productStock.length === 0 && !isLoading) {
            return "No hay elementos en el almacén"
        }

        if (mode === "product" && products.length === 0 && !isLoading) {
            return "No hay productos disponibles"
        }

        return placeholder
    }

    /**
     * Generates the section title with optional product count
     * Enhances user awareness of available inventory
     * @returns Formatted title string or undefined
     */
    const getSectionTitle = (): string | undefined => {
        if (!title && productCount === 0) {
            return undefined
        }

        if (title && productCount > 0) {
            return `${title} (${productCount} ${mode === "warehouse" ? "elementos" : "productos"})`
        }

        if (title) {
            return title
        }

        if (mode === "warehouse") {
            return `Inventario Almacén ${targetWarehouse} (${productCount} elementos)`
        }

        return `Productos Disponibles (${productCount})`
    }

    /**
     * Determines if the scan button should be disabled based on current state
     * @returns Boolean indicating if scan button should be disabled
     */
    const isScanDisabled = (): boolean => {
        if (mode === "warehouse") {
            return productStock.length === 0 && !isLoading
        }
        return products.length === 0 && !isLoading
    }

    /**
     * Gets the appropriate helper text to display below the controls
     * @returns Helper text string or undefined
     */
    const getHelperText = (): string | undefined => {
        if (mode === "warehouse" && productStock.length === 0 && !isLoading) {
            return `No se encontraron elementos en el almacén ${targetWarehouse}`
        }

        if (mode === "product" && products.length === 0 && !isLoading) {
            return "No se encontraron productos en el inventario"
        }

        return undefined
    }

    return (
        <ThemedView style={styles.section}>
            {/* Section Title with Product Count */}
            {getSectionTitle() && (
                <ThemedView style={styles.titleContainer}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                        {getSectionTitle()}
                    </ThemedText>
                    {isLoading && (
                        <ThemedText style={styles.loadingIndicator}>
                            Actualizando...
                        </ThemedText>
                    )}
                </ThemedView>
            )}

            {/* Main Input Row - Combobox and Scan Button */}
            <ThemedView style={styles.inputRow}>
                {/* Product Combobox Container */}
                <ThemedView style={styles.comboboxContainer}>
                    <ProductCombobox
                        products={products}
                        productStock={productStock}
                        targetWarehouse={targetWarehouse}
                        mode={mode}
                        onProductSelect={onProductSelect}
                        onStockItemSelect={onStockItemSelect || (() => { })} // Provide default empty handler
                        placeholder={getPlaceholderText()}
                        disabled={isLoading || (mode === "warehouse" ? productStock.length === 0 : products.length === 0)}
                    />
                </ThemedView>

                {/* Barcode Scanner Button */}
                <TouchableOpacity
                    onPress={onScanPress}
                    style={[
                        styles.scanButton,
                        {
                            backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                            borderColor: isDark ? Colors.dark.border : Colors.light.border,
                        },
                        // Apply disabled styling when no products are available
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