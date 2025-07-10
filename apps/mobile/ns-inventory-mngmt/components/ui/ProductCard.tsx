"use client"

import { StyleSheet, TouchableOpacity } from "react-native"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { QuantityControls } from "@/components/ui/QuantityControls"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { Trash2 } from "lucide-react-native"
import type { ProductCardProps } from "@/types/types"

export function ProductCard({ product, onRemove, onUpdateQuantity, style }: ProductCardProps) {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    // Check if this product should show quantity controls
    // Products with unique IDs (selected from variants) don't show quantity controls
    const showQuantityControls = onUpdateQuantity !== undefined

    const handleQuantityIncrease = () => {
        if (onUpdateQuantity) {
            onUpdateQuantity(product.id, product.quantity + 1)
        }
    }

    const handleQuantityDecrease = () => {
        if (onUpdateQuantity) {
            onUpdateQuantity(product.id, product.quantity - 1)
        }
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
                    <ThemedText style={styles.productId}>ID: {product.id}</ThemedText>
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
                    <Trash2 size={20} color="white" />
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
                {showQuantityControls ? (
                    <ThemedView
                        style={styles.quantityContainer}
                        lightColor={Colors.light.surface}
                        darkColor={Colors.dark.surface}
                    >
                        <ThemedText style={styles.quantityLabel}>Cantidad:</ThemedText>
                        <QuantityControls
                            value={product.quantity}
                            onIncrease={handleQuantityIncrease}
                            onDecrease={handleQuantityDecrease}
                            min={1}
                            max={product.stock}
                            size="medium"
                        />
                    </ThemedView>
                ) : (
                    <ThemedView
                        style={styles.selectedContainer}
                        lightColor={Colors.light.surface}
                        darkColor={Colors.dark.surface}
                    >
                        <ThemedText style={styles.selectedLabel}>Producto Seleccionado</ThemedText>
                        <ThemedText style={styles.selectedBadge}>✓ ÚNICO</ThemedText>
                    </ThemedView>
                )}
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
                {showQuantityControls ? (
                    <>
                        <ThemedText style={styles.totalLabel}>Total:</ThemedText>
                        <ThemedText style={styles.totalValue}>{product.quantity}</ThemedText>
                    </>
                ) : (
                    <>
                        <ThemedText style={styles.totalLabel}>Stock Disponible:</ThemedText>
                        <ThemedText style={styles.totalValue}>{product.stock}</ThemedText>
                    </>
                )}
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
    productId: {
        fontSize: 14,
        opacity: 0.6,
        marginTop: 2,
        fontFamily: "monospace",
    },
    selectedContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    selectedLabel: {
        fontSize: 16,
        opacity: 0.7,
        fontWeight: "500",
    },
    selectedBadge: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#4ade80",
    },
})
