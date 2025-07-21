"use client"

import { StyleSheet, TouchableOpacity } from "react-native"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { Trash2 } from "lucide-react-native"
import type { ProductCardProps } from "@/types/types"

export function ProductCard({ product, onRemove, style }: ProductCardProps) {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

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

                <ThemedView
                    style={styles.selectedContainer}
                    lightColor={Colors.light.surface}
                    darkColor={Colors.dark.surface}
                >
                    <ThemedText style={styles.productId}>ID: {product.id}</ThemedText>
                </ThemedView>

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
        alignItems: "center",
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
    productId: {
        fontSize: 20,
        opacity: 0.6,
        marginTop: 2,
        fontWeight: "bold",
    },
    selectedContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
})
