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
    WarehouseStockGroup
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
 * Groups ProductStockItems by barcode, enriching with product information
 * Creates groups for warehouse inventory display
 */
const groupProductStock = (
    productStock: ProductStockItem[],
    products: Product[],
    targetWarehouse: number = 1
): WarehouseStockGroup[] => {
    // Filter stock by warehouse and availability
    const availableStock = productStock.filter(
        stock => stock.currentWarehouse === targetWarehouse && !stock.isBeingUsed
    )

    // Group by barcode
    const groups = new Map<number, ProductStockItem[]>()

    for (const item of availableStock) {
        const existing = groups.get(item.barcode) || []
        existing.push(item)
        groups.set(item.barcode, existing)
    }

    // Convert to WarehouseStockGroup objects with product information
    return Array.from(groups.entries()).map(([barcode, items]) => {
        // Find matching product by barcode for metadata
        const product = products.find(p => Number(p.barcode) === barcode)

        return {
            barcode,
            productName: product?.name || `Producto ${barcode}`,
            brand: product?.brand || "Sin marca",
            items,
            totalCount: items.length,
        }
    })
}

/**
 * Filters warehouse stock groups based on search text
 */
const filterStockGroups = (
    groups: WarehouseStockGroup[],
    searchText: string
): WarehouseStockGroup[] => {
    if (!searchText.trim()) return groups

    const normalizedSearch = searchText.toLowerCase().trim()

    return groups.filter(group => {
        // Search in product name, brand, and barcode
        const matchesName = group.productName.toLowerCase().includes(normalizedSearch)
        const matchesBrand = group.brand.toLowerCase().includes(normalizedSearch)
        const matchesBarcode = group.barcode.toString().includes(normalizedSearch)

        // Search in individual item UUIDs (short IDs)
        const matchesItemId = group.items.some(item =>
            getShortId(item.id).toLowerCase().includes(normalizedSearch)
        )

        return matchesName || matchesBrand || matchesBarcode || matchesItemId
    })
}

// Warehouse-only ProductCombobox Component
export function ProductCombobox({
    products,
    productStock = [],
    targetWarehouse = 1,
    onStockItemSelect,
    placeholder = "Buscar en inventario...",
    disabled = false,
}: ProductComboboxProps) {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    // Get store state and actions for search functionality
    const {
        searchText,
        isOpen,
        handleSearch,
        setIsOpen,
        resetSearch
    } = useProductComboboxStore()

    // Group and filter warehouse stock
    const stockGroups = useMemo(() => {
        return groupProductStock(productStock, products, targetWarehouse)
    }, [productStock, products, targetWarehouse])

    const filteredStockGroups = useMemo(() => {
        return filterStockGroups(stockGroups, searchText)
    }, [stockGroups, searchText])

    // Reset search when component mounts or stock changes
    useEffect(() => {
        resetSearch([]) // We don't use the products array anymore
    }, [productStock, resetSearch])

    const handleStockItemSelection = (item: ProductStockItem) => {
        if (onStockItemSelect) {
            onStockItemSelect(item)
        }
        setIsOpen(false)
    }

    const handleSearchInput = (text: string) => {
        // Just update the search text - filtering is handled in useMemo
        handleSearch(text, [])
    }

    const renderStockGroup = (group: WarehouseStockGroup) => {
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
                                <ThemedText style={styles.subProductBrand}>{group.brand}</ThemedText>
                                <ThemedText style={styles.subProductDetails}>
                                    ID: {getShortId(item.id)}
                                </ThemedText>
                            </ThemedView>
                        </TouchableOpacity>
                    ))}
                </Collapsible>
            </ThemedView>
        )
    }

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
                Inventario de Almacén
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
                    {searchText || placeholder}
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
                            Inventario Almacén {targetWarehouse}
                        </ThemedText>
                        <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
                            <ThemedText style={{ color: isDark ? Colors.dark.tint : Colors.light.tint }}>✕</ThemedText>
                        </TouchableOpacity>
                    </ThemedView>

                    <ThemedView style={styles.searchContainer}>
                        <TextInput
                            value={searchText}
                            onChangeText={handleSearchInput}
                            placeholder="Buscar en inventario..."
                            autoFocus
                            style={styles.searchInputText}
                        />
                    </ThemedView>

                    <ScrollView style={styles.productList} showsVerticalScrollIndicator={false}>
                        {filteredStockGroups.map(group =>
                            renderStockGroup(group)
                        )}

                        {/* No results message */}
                        {filteredStockGroups.length === 0 && searchText && (
                            <ThemedView style={styles.noResultsContainer}>
                                <ThemedText style={styles.noResultsText}>
                                    No se encontraron elementos en el almacén {targetWarehouse}
                                </ThemedText>
                            </ThemedView>
                        )}

                        {filteredStockGroups.length === 0 && !searchText && stockGroups.length === 0 && (
                            <ThemedView style={styles.noResultsContainer}>
                                <ThemedText style={styles.noResultsText}>
                                    No hay elementos disponibles en el almacén {targetWarehouse}
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
