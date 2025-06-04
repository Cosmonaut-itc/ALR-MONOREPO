"use client"

import { StyleSheet } from "react-native"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import type { PendingInventoryCardProps } from "@/types/types"


// Create the component with ArkType
export function PendingInventoryCard({ item, style }: PendingInventoryCardProps) {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    const formatTimeAgo = (date: Date) => {
        const now = new Date()
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

        if (diffInMinutes < 60) {
            return `hace ${diffInMinutes} min`
        } else if (diffInMinutes < 1440) {
            const hours = Math.floor(diffInMinutes / 60)
            return `hace ${hours} hora${hours > 1 ? "s" : ""}`
        } else {
            const days = Math.floor(diffInMinutes / 1440)
            return `hace ${days} día${days > 1 ? "s" : ""}`
        }
    }

    return (
        <ThemedView
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                    borderColor: isDark ? "#ffd166" : "#f57c00",
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
                <ThemedView style={styles.productInfo} darkColor={Colors.dark.highlight} lightColor={Colors.light.highlight}>
                    <ThemedText style={styles.productName}>{item.productName}</ThemedText>
                </ThemedView>
                <ThemedView
                    style={[
                        styles.badge,
                        {
                            backgroundColor: isDark ? "#ffd166" : "#f57c00",
                        },
                    ]}
                >
                    <ThemedText style={styles.badgeText}>PENDIENTE</ThemedText>
                </ThemedView>
            </ThemedView>

            <ThemedView
                style={[
                    styles.cardBody,
                    {
                        backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                    },
                ]}
            >
                <ThemedView style={styles.detailRow} darkColor={Colors.dark.surface} lightColor={Colors.light.surface}>
                    <ThemedText style={styles.detailLabel}>Cantidad:</ThemedText>
                    <ThemedText style={styles.detailValue}>{item.quantity}</ThemedText>
                </ThemedView>
                <ThemedView style={styles.detailRow} darkColor={Colors.dark.surface} lightColor={Colors.light.surface}>
                    <ThemedText style={styles.detailLabel}>Tiempo:</ThemedText>
                    <ThemedText style={styles.detailValue}>{formatTimeAgo(item.takenAt)}</ThemedText>
                </ThemedView>
            </ThemedView>
        </ThemedView>
    )
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 2,
        borderRadius: 12,
        padding: 18,
        marginBottom: 12,
        overflow: "hidden",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 16,
        padding: 16,
        marginHorizontal: -18,
        marginTop: -18,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 20,
        fontWeight: "700",
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    badgeText: {
        color: "white",
        fontSize: 12,
        fontWeight: "bold",
        letterSpacing: 0.5,
    },
    cardBody: {
        gap: 12,
        padding: 16,
        marginHorizontal: -18,
        marginBottom: -18,
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    detailLabel: {
        fontSize: 16,
        opacity: 0.7,
        fontWeight: "500",
    },
    detailValue: {
        fontSize: 18,
        fontWeight: "600",
    },
})