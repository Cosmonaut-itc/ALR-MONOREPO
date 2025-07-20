"use client"

import React, { useEffect, useMemo } from "react"
import { StyleSheet, TouchableOpacity, Modal, ScrollView } from "react-native"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { TextInput } from "@/components/ThemedTextInput"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import type {
    Product,
    ProductComboboxProps,
    ProductStockItem,
    WarehouseInventoryItem,
    WarehouseInventoryGroup
} from "@/types/types"
import { Collapsible } from "@/components/Collapsible"
import { useProductComboboxStore } from "@/app/stores/baseUserStores"

/**
 * Utility function to get the last 6 characters of a UUID for display
 * @param uuid - The full UUID string
 * @returns The last 6 characters of the UUID
 */
const getShortId = (uuid: string): string => {
    return uuid.slice(-6).toUpperCase()
}

/**
 * Transforms product stock data into warehouse inventory items
 * Combines stock information with product details for warehouse mode
 */
const transformToWarehouseInventory = (
    productStock: ProductStockItem[],
    products: Product[],
    targetWarehouse: number = 1
): WarehouseInventoryItem[] => {
    return productStock
        .filter(stock => stock.currentWarehouse === targetWarehouse && !stock.isBeingUsed)
        .map(stock => {
            // Find matching product by barcode
            const product = products.find(p => Number(p.barcode) === stock.barcode)

            const result: WarehouseInventoryItem = {
                id: stock.id,
                productId: product?.id || stock.barcode.toString(),
                productName: product?.name || `Producto ${stock.barcode}`,
                brand: product?.brand || "Sin marca",
                barcode: stock.barcode,
                shortId: getShortId(stock.id),
                isBeingUsed: stock.isBeingUsed,
            }

            // Only add optional date properties if they exist
            if (stock.lastUsed) {
                result.lastUsed = stock.lastUsed
            }
            if (stock.firstUsed) {
                result.firstUsed = stock.firstUsed
            }

            return result
        })
}

/**
 * Groups warehouse inventory items by barcode/product name
 * Creates collapsible groups for products with multiple stock items
 */
const groupWarehouseInventory = (
    warehouseItems: WarehouseInventoryItem[]
): WarehouseInventoryGroup[] => {
    const groups = new Map<number, WarehouseInventoryItem[]>()

    // Group items by barcode
    for (const item of warehouseItems) {
        const existing = groups.get(item.barcode) || []
        existing.push(item)
        groups.set(item.barcode, existing)
    }

    // Convert to WarehouseInventoryGroup objects
    return Array.from(groups.entries()).map(([barcode, items]) => ({
        barcode,
        productName: items[0].productName,
        brand: items[0].brand,
        items,
        totalCount: items.length,
    }))
}

/**
 * Filters warehouse inventory groups based on search text
 */
const filterWarehouseGroups = (
    groups: WarehouseInventoryGroup[],
    searchText: string
): WarehouseInventoryGroup[] => {
    if (!searchText.trim()) return groups

    const normalizedSearch = searchText.toLowerCase().trim()

    return groups.filter(group => {
        // Search in product name and brand
        const matchesName = group.productName.toLowerCase().includes(normalizedSearch)
        const matchesBrand = group.brand.toLowerCase().includes(normalizedSearch)
        const matchesBarcode = group.barcode.toString().includes(normalizedSearch)

        // Search in individual item short IDs
        const matchesShortId = group.items.some(item =>
            item.shortId.toLowerCase().includes(normalizedSearch)
        )

        return matchesName || matchesBrand || matchesBarcode || matchesShortId
    })
}

// Create the component with enhanced warehouse support
export function ProductCombobox({
    products,
    productStock = [],
    targetWarehouse = 1,
    onProductSelect,
    onStockItemSelect,
    placeholder,
    disabled = false,
    mode = "product" // Default to original product mode for backward compatibility
}: ProductComboboxProps) {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    // Get store state and actions
    const {
        searchText,
        isOpen,
        filteredProducts,
        groupedProducts,
        handleSearch,
        setIsOpen,
        resetSearch
    } = useProductComboboxStore()

    // Transform and group warehouse inventory when in warehouse mode
    const warehouseInventory = useMemo(() => {
        if (mode !== "warehouse") return []
        return transformToWarehouseInventory(productStock, products, targetWarehouse)
    }, [productStock, products, targetWarehouse, mode])

    const warehouseGroups = useMemo(() => {
        if (mode !== "warehouse") return []
        return groupWarehouseInventory(warehouseInventory)
    }, [warehouseInventory, mode])

    const filteredWarehouseGroups = useMemo(() => {
        if (mode !== "warehouse") return []
        return filterWarehouseGroups(warehouseGroups, searchText)
    }, [warehouseGroups, searchText, mode])

    // Initialize store with products when component mounts
    useEffect(() => {
        if (mode === "product") {
            resetSearch(products)
        }
    }, [products, resetSearch, mode])

    const handleProductSelection = (product: Product) => {
        onProductSelect(product)
        resetSearch(products)
        setIsOpen(false)
    }

    const handleStockItemSelection = (item: WarehouseInventoryItem) => {
        if (onStockItemSelect) {
            onStockItemSelect(item)
        }
        setIsOpen(false)
    }

    const handleSearchInput = (text: string) => {
        if (mode === "product") {
            handleSearch(text, products)
        } else {
            // For warehouse mode, we just need to update the search text
            // Use handleSearch with empty array to just set the text
            handleSearch(text, [])
        }
    }

    const renderWarehouseInventoryGroup = (group: WarehouseInventoryGroup) => {
        // If only one item in group, render directly
        if (group.items.length === 1) {
            const item = group.items[0]
            return (
                <TouchableOpacity
                    key={item.id}
                    style={[
                        styles.productItem,
                        {
                            borderBottomColor: isDark ? Colors.dark.border : Colors.light.border,
                            backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                        },
                    ]}
                    onPress={() => handleStockItemSelection(item)}
                >
                    <ThemedView style={styles.productInfo} darkColor={Colors.dark.surface} lightColor={Colors.light.surface}>
                        <ThemedText style={styles.productName}>{item.productName}</ThemedText>
                        <ThemedText style={styles.productBrand}>{item.brand}</ThemedText>
                        <ThemedText style={styles.productDetails}>ID: {item.shortId}</ThemedText>
                    </ThemedView>
                </TouchableOpacity>
            )
        }

        // Multiple items - render collapsible group
        return (
            <ThemedView
                key={`group-${group.barcode}`}
                style={[
                    styles.productGroupContainer,
                    {
                        borderBottomColor: isDark ? Colors.dark.border : Colors.light.border,
                        backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
                    },
                ]}
            >
                <Collapsible
                    title={`${group.productName} (${group.totalCount} disponibles)`}
                    titleStyle={{ fontSize: 22, fontWeight: "bold" }}
                >
                    {group.items.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.subProductItem,
                                {
                                    backgroundColor: isDark ? Colors.dark.highlight : Colors.light.highlight,
                                    borderColor: isDark ? Colors.dark.border : Colors.light.border,
                                },
                            ]}
                            onPress={() => handleStockItemSelection(item)}
                        >
                            <ThemedView
                                style={styles.subProductInfo}
                                darkColor={Colors.dark.highlight}
                                lightColor={Colors.light.highlight}
                            >
                                <ThemedText style={styles.subProductBrand}>{item.brand}</ThemedText>
                                <ThemedText style={styles.subProductDetails}>
                                    ID: {item.shortId}
                                </ThemedText>
                                {item.lastUsed && (
                                    <ThemedText style={styles.subProductMeta}>
                                        Último uso: {new Date(item.lastUsed).toLocaleDateString()}
                                    </ThemedText>
                                )}
                            </ThemedView>
                        </TouchableOpacity>
                    ))}
                </Collapsible>
            </ThemedView>
        )
    }

    const renderProductGroup = (groupKey: string, groupProducts: Product[]) => {
        // If only one product in group, render directly
        if (groupProducts.length === 1) {
            return (
                <TouchableOpacity
                    key={groupProducts[0].id}
                    style={[
                        styles.productItem,
                        {
                            borderBottomColor: isDark ? Colors.dark.border : Colors.light.border,
                            backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                        },
                    ]}
                    onPress={() => handleProductSelection(groupProducts[0])}
                >
                    <ThemedView style={styles.productInfo} darkColor={Colors.dark.surface} lightColor={Colors.light.surface}>
                        <ThemedText style={styles.productName}>{groupProducts[0].name}</ThemedText>
                        <ThemedText style={styles.productBrand}>{groupProducts[0].brand}</ThemedText>
                    </ThemedView>
                </TouchableOpacity>
            )
        }

        // Multiple products with same name/barcode - render collapsible
        const mainProduct = groupProducts[0]
        return (
            <ThemedView
                key={groupKey}
                style={[
                    styles.productGroupContainer,
                    {
                        borderBottomColor: isDark ? Colors.dark.border : Colors.light.border,
                        backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
                    },
                ]}
            >
                <Collapsible title={`${mainProduct.name} (${groupProducts.length} variantes)`} titleStyle={{ fontSize: 22, fontWeight: "bold" }}>
                    {groupProducts.map((product, index) => (
                        <TouchableOpacity
                            key={product.id}
                            style={[
                                styles.subProductItem,
                                {
                                    backgroundColor: isDark ? Colors.dark.highlight : Colors.light.highlight,
                                    borderColor: isDark ? Colors.dark.border : Colors.light.border,
                                },
                            ]}
                            onPress={() => handleProductSelection(product)}
                        >
                            <ThemedView
                                style={styles.subProductInfo}
                                darkColor={Colors.dark.highlight}
                                lightColor={Colors.light.highlight}
                            >
                                <ThemedText style={styles.subProductBrand}>{product.brand}</ThemedText>
                                <ThemedText style={styles.subProductDetails}>
                                    ID: {product.id}
                                </ThemedText>
                            </ThemedView>
                        </TouchableOpacity>
                    ))}
                </Collapsible>
            </ThemedView>
        )
    }

    // Determine what to show in the input based on mode
    const getDisplayText = () => {
        if (mode === "warehouse") {
            return searchText || placeholder
        }
        return searchText || placeholder
    }

    // Determine modal title based on mode
    const getModalTitle = () => {
        if (mode === "warehouse") {
            return `Inventario Almacén ${targetWarehouse}`
        }
        return "Seleccionar Producto"
    }

    // Determine placeholder based on mode
    const getPlaceholderText = () => {
        if (mode === "warehouse") {
            return placeholder || "Buscar en inventario..."
        }
        return placeholder || "Buscar producto..."
    }

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
                {mode === "warehouse" ? "Inventario de Almacén" : "Producto"}
            </ThemedText>
            <TouchableOpacity
                style={[
                    styles.input,
                    {
                        borderColor: isDark ? Colors.dark.border : Colors.light.border,
                        backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                    },
                    disabled && styles.inputDisabled,
                ]}
                onPress={() => !disabled && setIsOpen(true)}
                disabled={disabled}
            >
                <ThemedText
                    style={[
                        styles.inputText,
                        {
                            color: searchText
                                ? isDark
                                    ? Colors.dark.text
                                    : Colors.light.text
                                : isDark
                                    ? Colors.dark.tabIconDefault
                                    : Colors.light.tabIconDefault,
                        },
                    ]}
                >
                    {getDisplayText()}
                </ThemedText>
                <ThemedText style={styles.dropdownIcon}>▼</ThemedText>
            </TouchableOpacity>

            <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet">
                <ThemedView style={styles.modalContainer}>
                    <ThemedView
                        style={[
                            styles.modalHeader,
                            {
                                backgroundColor: isDark ? Colors.dark.highlight : Colors.light.highlight,
                                borderBottomColor: isDark ? Colors.dark.border : Colors.light.border,
                            },
                        ]}
                    >
                        <ThemedText type="title" style={styles.modalTitle}>
                            {getModalTitle()}
                        </ThemedText>
                        <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
                            <ThemedText style={{ color: isDark ? Colors.dark.tint : Colors.light.tint }}>✕</ThemedText>
                        </TouchableOpacity>
                    </ThemedView>

                    <ThemedView style={styles.searchContainer}>
                        <TextInput
                            value={searchText}
                            onChangeText={handleSearchInput}
                            placeholder={getPlaceholderText()}
                            autoFocus
                            style={styles.searchInputText}
                        />
                    </ThemedView>

                    <ScrollView style={styles.productList} showsVerticalScrollIndicator={false}>
                        {mode === "warehouse" ? (
                            // Warehouse mode - show grouped inventory
                            filteredWarehouseGroups.map(group =>
                                renderWarehouseInventoryGroup(group)
                            )
                        ) : (
                            // Product mode - show regular products
                            Object.entries(groupedProducts).map(([groupKey, groupProducts]) =>
                                renderProductGroup(groupKey, groupProducts)
                            )
                        )}

                        {/* No results message */}
                        {mode === "warehouse" && filteredWarehouseGroups.length === 0 && searchText && (
                            <ThemedView style={styles.noResultsContainer}>
                                <ThemedText style={styles.noResultsText}>
                                    No se encontraron elementos en el almacén {targetWarehouse}
                                </ThemedText>
                            </ThemedView>
                        )}

                        {mode === "product" && Object.keys(groupedProducts).length === 0 && searchText && (
                            <ThemedView style={styles.noResultsContainer}>
                                <ThemedText style={styles.noResultsText}>
                                    No se encontraron productos
                                </ThemedText>
                            </ThemedView>
                        )}
                    </ScrollView>
                </ThemedView>
            </Modal>
        </ThemedView>
    )
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        marginBottom: 8,
        fontSize: 16,
    },
    input: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderRadius: 8,
        padding: 16,
        minHeight: 56,
    },
    inputText: {
        fontSize: 18,
        flex: 1,
    },
    inputDisabled: {
        opacity: 0.5,
    },
    dropdownIcon: {
        fontSize: 14,
        opacity: 0.6,
    },
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 20,
    },
    closeButton: {
        padding: 8,
        fontSize: 20,
    },
    searchContainer: {
        padding: 16,
    },
    searchInputText: {
        fontSize: 18,
    },
    productList: {
        flex: 1,
    },
    productItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 4,
    },
    productBrand: {
        fontSize: 16,
        opacity: 0.7,
    },
    productDetails: {
        fontSize: 14,
        opacity: 0.7,
        marginTop: 4,
    },
    productPrice: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 2,
    },
    productStock: {
        fontSize: 14,
        opacity: 0.7,
    },
    productGroupContainer: {
        borderBottomWidth: 1,
        padding: 25,
    },
    subProductItem: {
        padding: 12,
        marginVertical: 4,
        marginLeft: 16,
        borderRadius: 8,
        borderWidth: 1,
    },
    subProductInfo: {
        flex: 1,
    },
    subProductBrand: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 4,
    },
    subProductDetails: {
        fontSize: 14,
        opacity: 0.7,
    },
    subProductMeta: {
        fontSize: 12,
        opacity: 0.5,
        marginTop: 2,
    },
    noResultsContainer: {
        padding: 40,
        alignItems: "center",
    },
    noResultsText: {
        fontSize: 16,
        opacity: 0.6,
        textAlign: "center",
    },
})
