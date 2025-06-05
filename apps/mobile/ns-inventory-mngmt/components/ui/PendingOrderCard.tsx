"use client"

import { StyleSheet, TouchableOpacity } from "react-native"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import type { PendingOrderCardProps } from "@/types/types"

export function PendingOrderCard({ order, onOrderClick, style }: PendingOrderCardProps) {
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

    const getTotalItems = () => {
        return order.items.reduce((total, item) => total + item.quantityTaken, 0)
    }

    const getReturnedItems = () => {
        return order.items.reduce((total, item) => total + item.quantityReturned, 0)
    }

    const getStatusColor = () => {
        switch (order.status) {
            case "completed":
                return isDark ? "#4ade80" : "#16a34a"
            case "partial":
                return isDark ? "#fbbf24" : "#d97706"
            case "pending":
            default:
                return isDark ? "#ffd166" : "#f57c00"
        }
    }

    const getStatusText = () => {
        switch (order.status) {
            case "completed":
                return "COMPLETADO"
            case "partial":
                return "PARCIAL"
            case "pending":
            default:
                return "PENDIENTE"
        }
    }

    return (
        <TouchableOpacity
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                    borderColor: getStatusColor(),
                },
                style,
            ]}
            onPress={() => onOrderClick(order)}
            activeOpacity={0.7}
        >
            <ThemedView
                style={[
                    styles.cardHeader,
                    {
                        backgroundColor: isDark ? Colors.dark.highlight : Colors.light.highlight,
                    },
                ]}
            >
                <ThemedView style={styles.orderInfo} lightColor={Colors.light.highlight} darkColor={Colors.dark.highlight}>
                    <ThemedText style={styles.orderNumber}>Orden #{order.orderNumber}</ThemedText>
                    <ThemedText style={styles.takenBy}>Tomado por: {order.takenBy}</ThemedText>
                </ThemedView>
                <ThemedView
                    style={[
                        styles.badge,
                        {
                            backgroundColor: getStatusColor(),
                        },
                    ]}
                >
                    <ThemedText style={styles.badgeText}>{getStatusText()}</ThemedText>
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
                <ThemedView style={styles.detailRow} lightColor={Colors.light.surface} darkColor={Colors.dark.surface}>
                    <ThemedText style={styles.detailLabel}>Total de productos:</ThemedText>
                    <ThemedText style={styles.detailValue}>{getTotalItems()}</ThemedText>
                </ThemedView>
                <ThemedView style={styles.detailRow} lightColor={Colors.light.surface} darkColor={Colors.dark.surface}>
                    <ThemedText style={styles.detailLabel}>Devueltos:</ThemedText>
                    <ThemedText style={styles.detailValue}>{getReturnedItems()}</ThemedText>
                </ThemedView>
                <ThemedView style={styles.detailRow} lightColor={Colors.light.surface} darkColor={Colors.dark.surface}>
                    <ThemedText style={styles.detailLabel}>Tiempo:</ThemedText>
                    <ThemedText style={styles.detailValue}>{formatTimeAgo(order.takenAt)}</ThemedText>
                </ThemedView>
            </ThemedView>

            <ThemedView style={styles.tapHint}>
                <ThemedText style={styles.tapHintText}>Toca para gestionar devoluciones</ThemedText>
            </ThemedView>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 2,
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
    orderInfo: {
        flex: 1,
    },
    orderNumber: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 4,
    },
    takenBy: {
        fontSize: 16,
        opacity: 0.8,
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
        padding: 18,
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
    tapHint: {
        padding: 12,
        alignItems: "center",
        opacity: 0.6,
    },
    tapHintText: {
        fontSize: 14,
        fontStyle: "italic",
    },
})
