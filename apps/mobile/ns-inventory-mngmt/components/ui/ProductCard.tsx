"use client"

import { StyleSheet, TouchableOpacity } from "react-native"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import type { ProductCardProps } from "@/types/types"
import { Trash2 } from 'lucide-react-native'

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
            <ThemedView
                style={[
                    styles.cardHeader,
                    {
                        backgroundColor: isDark ? Colors.dark.highlight : Colors.light.highlight,
                    },
                ]}
            >
                <ThemedView style={styles.productInfo} lightColor={Colors.light.highlight} darkColor={Colors.dark.highlight}>
                    <ThemedText style={styles.productName}>{product.name}</ThemedText>
                    <ThemedText style={styles.productBrand}>{product.brand}</ThemedText>
                </ThemedView>
                <TouchableOpacity
                    onPress={() => onRemove(product.id)}
                    style={[
                        styles.deleteButton,
                        {
                            backgroundColor: isDark ? "#ff6b6b" : "#d32f2f",
                        },
                    ]}
                    activeOpacity={0.7}
                >
                    <ThemedText style={styles.deleteButtonText}>
                        <Trash2 />
                    </ThemedText>
                </TouchableOpacity>
            </ThemedView>

            <ThemedView
                style={[
                    styles.cardBody,
                    {
                        backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                    },
                ]}
            >
                <ThemedView style={styles.quantityContainer} lightColor={Colors.light.surface} darkColor={Colors.dark.surface}>
                    <ThemedText style={styles.quantityLabel}>Cantidad:</ThemedText>
                    <ThemedView style={styles.quantityControls} lightColor={Colors.light.surface} darkColor={Colors.dark.surface}>
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

            <ThemedView
                style={[
                    styles.cardFooter,
                    {
                        backgroundColor: isDark ? Colors.dark.highlight : Colors.light.highlight,
                        borderTopColor: isDark ? Colors.dark.border : Colors.light.border,
                    },
                ]}
            >
                <ThemedText style={styles.totalLabel}>Total:</ThemedText>
                <ThemedText style={styles.totalValue}>{product.quantity}</ThemedText>
            </ThemedView>
        </ThemedView>
    )
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: 12,
        marginBottom: 12,
        overflow: "hidden",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: 18,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 6,
    },
    productBrand: {
        fontSize: 16,
        opacity: 0.8,
    },
    deleteButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 12,
    },
    deleteButtonText: {
        fontSize: 18,
    },
    cardBody: {
        padding: 18,
    },
    quantityContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    quantityLabel: {
        fontSize: 16,
        opacity: 0.7,
        fontWeight: "500",
    },
    quantityControls: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    quantityButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    quantityButtonText: {
        fontSize: 22,
        fontWeight: "bold",
    },
    quantityText: {
        fontSize: 20,
        fontWeight: "700",
        minWidth: 40,
        textAlign: "center",
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 18,
        borderTopWidth: 1,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: "600",
    },
    totalValue: {
        fontSize: 22,
        fontWeight: "bold",
    },
})
