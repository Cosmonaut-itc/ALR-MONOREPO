"use client"

import { useState } from "react"
import { StyleSheet, TouchableOpacity, FlatList, Modal } from "react-native"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import type { Product, ProductComboboxProps } from "@/types/types"

// Create the component with ArkType
export function ProductCombobox({ products, onProductSelect, placeholder }: ProductComboboxProps) {
    const [searchText, setSearchText] = useState("")
    const [isOpen, setIsOpen] = useState(false)
    const [filteredProducts, setFilteredProducts] = useState<Product[]>(products)
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    const handleSearch = (text: string) => {
        setSearchText(text)
        if (text.trim() === "") {
            setFilteredProducts(products)
        } else {
            const filtered = products.filter(
                (product: Product) =>
                    product.name.toLowerCase().includes(text.toLowerCase()) ||
                    product.brand.toLowerCase().includes(text.toLowerCase()),
            )
            setFilteredProducts(filtered)
        }
    }

    const handleProductSelect = (product: Product) => {
        onProductSelect(product)
        setSearchText("")
        setIsOpen(false)
        setFilteredProducts(products)
    }

    const renderProductItem = ({ item }: { item: Product }) => (
        <TouchableOpacity
            style={[
                styles.productItem,
                {
                    borderBottomColor: isDark ? Colors.dark.border : Colors.light.border,
                },
            ]}
            onPress={() => handleProductSelect(item)}
        >
            <ThemedView style={styles.productInfo}>
                <ThemedText style={styles.productName}>{item.name}</ThemedText>
                <ThemedText style={styles.productBrand}>{item.brand}</ThemedText>
            </ThemedView>
            <ThemedView style={styles.productDetails}>
                <ThemedText style={styles.productPrice}>${item.price}</ThemedText>
                <ThemedText style={styles.productStock}>Stock: {item.stock}</ThemedText>
            </ThemedView>
        </TouchableOpacity>
    )

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
                    <ThemedView style={styles.modalHeader}>
                        <ThemedText type="title" style={styles.modalTitle}>
                            Seleccionar Producto
                        </ThemedText>
                        <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
                            <ThemedText style={{ color: isDark ? Colors.dark.tint : Colors.light.tint }}>✕</ThemedText>
                        </TouchableOpacity>
                    </ThemedView>

                    <ThemedView style={styles.searchContainer}>
                        <ThemedView
                            style={[
                                styles.searchInput,
                                {
                                    borderColor: isDark ? Colors.dark.border : Colors.light.border,
                                    backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                                },
                            ]}
                        >
                            <ThemedText
                                style={styles.searchInputText}
                            >
                                {searchText}
                            </ThemedText>
                        </ThemedView>
                    </ThemedView>

                    <FlatList
                        data={filteredProducts}
                        renderItem={renderProductItem}
                        keyExtractor={(item) => item.id}
                        style={styles.productList}
                        showsVerticalScrollIndicator={false}
                    />
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
    },
    input: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        minHeight: 50,
    },
    inputText: {
        fontSize: 16,
        flex: 1,
    },
    dropdownIcon: {
        fontSize: 12,
        opacity: 0.6,
    },
    modalContainer: {
        flex: 1,
        paddingTop: 20,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
    },
    modalTitle: {
        fontSize: 18,
    },
    closeButton: {
        padding: 8,
        fontSize: 18,
    },
    searchContainer: {
        padding: 16,
    },
    searchInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
    },
    searchInputText: {
        fontSize: 16,
    },
    productList: {
        flex: 1,
    },
    productItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: "500",
        marginBottom: 4,
    },
    productBrand: {
        fontSize: 14,
        opacity: 0.7,
    },
    productDetails: {
        alignItems: "flex-end",
    },
    productPrice: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 2,
    },
    productStock: {
        fontSize: 12,
        opacity: 0.7,
    },
})
