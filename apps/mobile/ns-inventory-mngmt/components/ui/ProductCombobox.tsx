"use client"

import React, { useEffect } from "react"
import { StyleSheet, TouchableOpacity, Modal, ScrollView } from "react-native"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { TextInput } from "@/components/ThemedTextInput"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import type { Product, ProductComboboxProps } from "@/types/types"
import { Collapsible } from "@/components/Collapsible"
import { useProductComboboxStore } from "@/app/stores/baseUserStores"

// Create the component with ArkType
export function ProductCombobox({ products, onProductSelect, placeholder }: ProductComboboxProps) {
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

    // Initialize store with products when component mounts
    useEffect(() => {
        resetSearch(products)
    }, [products, resetSearch])

    const handleProductSelect = (product: Product) => {
        onProductSelect(product)
        resetSearch(products)
        setIsOpen(false)
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
                    onPress={() => handleProductSelect(groupProducts[0])}
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
                            onPress={() => handleProductSelect(product)}
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

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
                Producto
            </ThemedText>
            <TouchableOpacity
                style={[
                    styles.input,
                    {
                        borderColor: isDark ? Colors.dark.border : Colors.light.border,
                        backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                    },
                ]}
                onPress={() => setIsOpen(true)}
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
                            Seleccionar Producto
                        </ThemedText>
                        <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
                            <ThemedText style={{ color: isDark ? Colors.dark.tint : Colors.light.tint }}>✕</ThemedText>
                        </TouchableOpacity>
                    </ThemedView>

                    <ThemedView style={styles.searchContainer}>
                        <TextInput
                            value={searchText}
                            onChangeText={(text) => handleSearch(text, products)}
                            placeholder="Buscar producto..."
                            autoFocus
                            style={styles.searchInputText}
                        />
                    </ThemedView>

                    <ScrollView style={styles.productList} showsVerticalScrollIndicator={false}>
                        {Object.entries(groupedProducts).map(([groupKey, groupProducts]) =>
                            renderProductGroup(groupKey, groupProducts),
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
        alignItems: "flex-end",
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

})
