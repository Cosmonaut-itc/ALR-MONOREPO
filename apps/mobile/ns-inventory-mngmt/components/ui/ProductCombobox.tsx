"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
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
import { getShortId } from "@/lib/functions"
import { useFocusEffect } from "expo-router"

/**
 * Groups ProductStockItems by barcode, enriching with product information
 * Creates groups for warehouse inventory display
 */
const groupProductStock = (
    productStock: ProductStockItem[],
    products: Product[],
    targetWarehouse?: string
): WarehouseStockGroup[] => {
    // Filter stock by warehouse and availability
    // If targetWarehouse is not provided, show all available items
    const availableStock = productStock.filter(
        stock => (!targetWarehouse || stock.currentWarehouse === targetWarehouse) && !stock.isBeingUsed
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
        // Compare Product.barcode (string) with ProductStockItem.barcode (number)
        const product = products.find(p => p.barcode === barcode.toString() || Number(p.barcode) === barcode)
        
        // Use description from productStock item if available, otherwise use product name or barcode fallback
        // Prefer description from the first item in the group (all items should have same description)
        const itemDescription = items[0]?.description
        const productName = itemDescription || product?.name || `Producto ${barcode}`

        return {
            barcode,
            productName,
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
    targetWarehouse,
    warehouseName,
    onStockItemSelect,
    placeholder = "Buscar en inventario...",
    disabled = false,
}: ProductComboboxProps) {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    const [searchText, setSearchText] = useState<string>("")
    const [isOpen, setIsOpen] = useState<boolean>(false)

    // Group and filter warehouse stock
    // Ensure products is always an array to prevent undefined errors
    const stockGroups = useMemo(() => {
        if (!products || !Array.isArray(products)) {
            return []
        }
        return groupProductStock(productStock, products, targetWarehouse)
    }, [productStock, products, targetWarehouse])

    const filteredStockGroups = useMemo(() => {
        return filterStockGroups(stockGroups, searchText)
    }, [stockGroups, searchText])

    useEffect(() => {
        setSearchText("")
    }, [productStock, products, targetWarehouse])

    useFocusEffect(
        useCallback(() => {
            return () => {
                setIsOpen(false)
                setSearchText("")
            }
        }, [])
    )

    /**
     * Handles the selection of a stock item from the modal list.
     * Closes the modal and clears the search input for a clean state.
     * @param item - Stock item selected by the user
     */
    const handleStockItemSelection = (item: ProductStockItem): void => {
        if (onStockItemSelect) {
            onStockItemSelect(item)
        }
        setIsOpen(false)
        setSearchText("")
    }

    /**
     * Updates the search text used to filter stock groups.
     * @param text - Text entered by the user in the search field
     */
    const handleSearchInput = (text: string): void => {
        setSearchText(text)
    }

    /**
     * Opens the combobox modal when the trigger is pressed.
     * Ignores the action if the component is disabled.
     */
    const handleOpenModal = (): void => {
        if (!disabled) {
            setIsOpen(true)
            setSearchText("")
        }
    }

    /**
     * Closes the combobox modal and resets the search text.
     */
    const handleCloseModal = (): void => {
        setIsOpen(false)
        setSearchText("")
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
                Productos
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
                onPress={handleOpenModal}
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

            <Modal
                visible={isOpen}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={handleCloseModal}
            >
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
                            Productos en {warehouseName || targetWarehouse || "Almacén"}
                        </ThemedText>
                        <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
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
                                    No se encontraron elementos en {warehouseName || targetWarehouse || "el almacén"}
                                </ThemedText>
                            </ThemedView>
                        )}

                        {filteredStockGroups.length === 0 && !searchText && stockGroups.length === 0 && (
                            <ThemedView style={styles.noResultsContainer}>
                                <ThemedText style={styles.noResultsText}>
                                    No hay elementos disponibles en {warehouseName || targetWarehouse || "el almacén"}
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
