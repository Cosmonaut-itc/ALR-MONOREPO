"use client"

import { StyleSheet, TouchableOpacity } from "react-native"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import type { ProductCardProps } from "@/types/types"


// Create the component with ArkType
export function ProductCard({ product, onRemove, onUpdateQuantity, style }: ProductCardProps) {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    const handleQuantityChange = (change: number) => {
        const newQuantity = product.quantity + change
        onUpdateQuantity(product.id, newQuantity)
    }

    return (
        <ThemedView
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                    borderColor: isDark ? Colors.dark.border : Colors.light.border,
                },
                style,
            ]}
        >
            <ThemedView style={styles.cardHeader}>
                <ThemedView style={styles.productInfo}>
                    <ThemedText style={styles.productName}>{product.name}</ThemedText>
                    <ThemedText style={styles.productBrand}>{product.brand}</ThemedText>
                </ThemedView>
                <TouchableOpacity onPress={() => onRemove(product.id)} style={styles.removeButton}>
                    <ThemedText style={[styles.removeButtonText, { color: isDark ? "#ff6b6b" : "#d32f2f" }]}>✕</ThemedText>
                </TouchableOpacity>
            </ThemedView>

            <ThemedView style={styles.cardBody}>
                <ThemedView style={styles.priceContainer}>
                    <ThemedText style={styles.priceLabel}>Precio:</ThemedText>
                    <ThemedText style={styles.price}>${product.price}</ThemedText>
                </ThemedView>

                <ThemedView style={styles.quantityContainer}>
                    <ThemedText style={styles.quantityLabel}>Cantidad:</ThemedText>
                    <ThemedView style={styles.quantityControls}>
                        <TouchableOpacity
                            style={[
                                styles.quantityButton,
                                {
                                    backgroundColor: isDark ? Colors.dark.border : Colors.light.border,
                                },
                            ]}
                            onPress={() => handleQuantityChange(-1)}
                            disabled={product.quantity <= 1}
                        >
                            <ThemedText style={styles.quantityButtonText}>-</ThemedText>
                        </TouchableOpacity>
                        <ThemedText style={styles.quantityText}>{product.quantity}</ThemedText>
                        <TouchableOpacity
                            style={[
                                styles.quantityButton,
                                {
                                    backgroundColor: isDark ? Colors.dark.border : Colors.light.border,
                                },
                            ]}
                            onPress={() => handleQuantityChange(1)}
                            disabled={product.quantity >= product.stock}
                        >
                            <ThemedText style={styles.quantityButtonText}>+</ThemedText>
                        </TouchableOpacity>
                    </ThemedView>
                </ThemedView>
            </ThemedView>

            <ThemedView style={styles.cardFooter}>
                <ThemedText style={styles.totalLabel}>Total:</ThemedText>
                <ThemedText style={styles.totalPrice}>${(product.price * product.quantity).toFixed(2)}</ThemedText>
            </ThemedView>
        </ThemedView>
    )
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 4,
    },
    productBrand: {
        fontSize: 14,
        opacity: 0.7,
    },
    removeButton: {
        padding: 4,
    },
    removeButtonText: {
        fontSize: 18,
        fontWeight: "bold",
    },
    cardBody: {
        marginBottom: 12,
    },
    priceContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    priceLabel: {
        fontSize: 14,
        opacity: 0.7,
    },
    price: {
        fontSize: 16,
        fontWeight: "500",
    },
    quantityContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    quantityLabel: {
        fontSize: 14,
        opacity: 0.7,
    },
    quantityControls: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    quantityButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    quantityButtonText: {
        fontSize: 18,
        fontWeight: "bold",
    },
    quantityText: {
        fontSize: 16,
        fontWeight: "600",
        minWidth: 30,
        textAlign: "center",
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#e0e0e0",
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: "600",
    },
    totalPrice: {
        fontSize: 18,
        fontWeight: "bold",
    },
})
