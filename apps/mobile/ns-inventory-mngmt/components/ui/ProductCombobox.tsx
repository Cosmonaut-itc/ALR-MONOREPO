"use client"

import { Collapsible } from "@/components/Collapsible"
import { ThemedText } from "@/components/ThemedText"
import { TextInput } from "@/components/ThemedTextInput"
import { ThemedView } from "@/components/ThemedView"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { getShortId } from "@/lib/functions"
import type {
    ProductComboboxProps,
    ProductStockItem,
    WarehouseStockGroup
} from "@/types/types"
import { useFocusEffect } from "expo-router"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Modal, ScrollView, StyleSheet, TouchableOpacity } from "react-native"

/**
 * Groups ProductStockItems by barcode, using description from stock items
 * Creates groups for warehouse inventory display
 */
const groupProductStock = (
    productStock: ProductStockItem[],
): WarehouseStockGroup[] => {
    // Group by barcode
    const groups = new Map<number, ProductStockItem[]>()

    for (const item of productStock) {
        const existing = groups.get(item.barcode) || []
        existing.push(item)
        groups.set(item.barcode, existing)
    }

    // Convert to WarehouseStockGroup objects using description from stock items
    return Array.from(groups.entries()).map(([barcode, items]) => {
        // Use description from the first item in the group (all items should have same description)
        const itemDescription = items[0]?.description
        const productName = itemDescription || `Producto ${barcode}`

        return {
            barcode,
            productName,
            brand: "Sin marca", // Default brand since we don't have product metadata
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
    productStock = [],
    warehouseName,
    onStockItemSelect,
    placeholder = "Buscar en inventario...",
    disabled = false,
    selectedItemIds = [],
}: ProductComboboxProps) {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    const [searchText, setSearchText] = useState<string>("")
    const [isOpen, setIsOpen] = useState<boolean>(false)

    /**
     * Filters out selected items from the product stock
     * Returns only items that are not in the selectedItemIds array
     */
    const availableProductStock = useMemo<ProductStockItem[]>(() => {
        if (!selectedItemIds || selectedItemIds.length === 0) {
            return productStock
        }
        const selectedIdsSet = new Set(selectedItemIds)
        return productStock.filter((item) => !selectedIdsSet.has(item.id))
    }, [productStock, selectedItemIds])

    // Group and filter warehouse stock
    const stockGroups = useMemo(() => {
        return groupProductStock(availableProductStock)
    }, [availableProductStock])

    const filteredStockGroups = useMemo(() => {
        return filterStockGroups(stockGroups, searchText)
    }, [stockGroups, searchText])

    useEffect(() => {
        setSearchText("")
    }, [])

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
                            Productos en {warehouseName || "Almacén"}
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
                                    No se encontraron elementos en {warehouseName || "el almacén"}
                                </ThemedText>
                            </ThemedView>
                        )}

                        {filteredStockGroups.length === 0 && !searchText && stockGroups.length === 0 && (
                            <ThemedView style={styles.noResultsContainer}>
                                <ThemedText style={styles.noResultsText}>
                                    No hay elementos disponibles en {warehouseName || "el almacén"}
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
