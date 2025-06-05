"use client"

import { useState } from "react"
import { StyleSheet, Modal, TouchableOpacity, ScrollView, Alert } from "react-native"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { ThemedButton } from "@/components/ThemedButton"
import { QuantityControls } from "@/components/ui/QuantityControls"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { X } from "lucide-react-native"
import type { ReturnOrderModalProps, OrderItem } from "@/types/types"

export function ReturnOrderModal({ order, visible, onClose, onSubmit }: ReturnOrderModalProps) {
    const [returnItems, setReturnItems] = useState<OrderItem[]>(order.items.map((item) => ({ ...item })))
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    const handleQuantityIncrease = (itemIndex: number) => {
        const newItems = [...returnItems]
        const currentReturned = newItems[itemIndex].quantityReturned
        const maxReturn = newItems[itemIndex].quantityTaken - currentReturned

        if (currentReturned < maxReturn) {
            newItems[itemIndex].quantityReturned = currentReturned + 1
            setReturnItems(newItems)
        }
    }

    const handleQuantityDecrease = (itemIndex: number) => {
        const newItems = [...returnItems]
        const currentReturned = newItems[itemIndex].quantityReturned

        if (currentReturned > 0) {
            newItems[itemIndex].quantityReturned = currentReturned - 1
            setReturnItems(newItems)
        }
    }

    const handleSubmit = () => {
        const itemsToReturn = returnItems.filter((item) => item.quantityReturned > 0)

        if (itemsToReturn.length === 0) {
            Alert.alert("Sin Devoluciones", "Selecciona al menos un producto para devolver")
            return
        }

        Alert.alert("Confirmar Devolución", `¿Deseas procesar la devolución de ${itemsToReturn.length} producto(s)?`, [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Confirmar",
                onPress: () => {
                    onSubmit(order, itemsToReturn)
                    onClose()
                },
            },
        ])
    }

    const getTotalReturning = () => {
        return returnItems.reduce((total, item) => total + item.quantityReturned, 0)
    }

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <ThemedView style={styles.container}>
                {/* Header */}
                <ThemedView
                    style={[
                        styles.header,
                        {
                            backgroundColor: isDark ? Colors.dark.highlight : Colors.light.highlight,
                            borderBottomColor: isDark ? Colors.dark.border : Colors.light.border,
                        },
                    ]}
                >
                    <ThemedText type="title" style={styles.title}>
                        Gestionar Devolución
                    </ThemedText>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={24} color={isDark ? Colors.dark.tint : Colors.light.tint} />
                    </TouchableOpacity>
                </ThemedView>

                {/* Order Info */}
                <ThemedView style={styles.orderInfo}>
                    <ThemedText style={styles.orderNumber}>Orden #{order.orderNumber}</ThemedText>
                    <ThemedText style={styles.orderDetails}>Tomado por: {order.takenBy}</ThemedText>
                </ThemedView>

                {/* Items List */}
                <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
                    {order.items.map((item, index) => {
                        const maxReturn = item.quantityTaken - item.quantityReturned
                        const currentReturning = returnItems[index].quantityReturned

                        return (
                            <ThemedView
                                key={`${item.productId}-${index}`}
                                style={[
                                    styles.itemCard,
                                    {
                                        backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                                        borderColor: isDark ? Colors.dark.border : Colors.light.border,
                                    },
                                ]}
                            >
                                <ThemedView style={styles.itemHeader}>
                                    <ThemedView style={styles.itemInfo}>
                                        <ThemedText style={styles.itemName}>{item.productName}</ThemedText>
                                        <ThemedText style={styles.itemBrand}>{item.brand}</ThemedText>
                                    </ThemedView>
                                </ThemedView>

                                <ThemedView style={styles.itemBody}>
                                    <ThemedView style={styles.itemRow}>
                                        <ThemedText style={styles.itemLabel}>Tomado:</ThemedText>
                                        <ThemedText style={styles.itemValue}>{item.quantityTaken}</ThemedText>
                                    </ThemedView>
                                    <ThemedView style={styles.itemRow}>
                                        <ThemedText style={styles.itemLabel}>Ya devuelto:</ThemedText>
                                        <ThemedText style={styles.itemValue}>{item.quantityReturned}</ThemedText>
                                    </ThemedView>
                                    <ThemedView style={styles.itemRow}>
                                        <ThemedText style={styles.itemLabel}>Disponible:</ThemedText>
                                        <ThemedText style={styles.itemValue}>{maxReturn}</ThemedText>
                                    </ThemedView>

                                    {maxReturn > 0 && (
                                        <ThemedView style={styles.returnSection}>
                                            <ThemedText style={styles.returnLabel}>Devolver ahora:</ThemedText>
                                            <QuantityControls
                                                value={currentReturning}
                                                onIncrease={() => handleQuantityIncrease(index)}
                                                onDecrease={() => handleQuantityDecrease(index)}
                                                min={0}
                                                max={maxReturn}
                                                size="medium"
                                            />
                                        </ThemedView>
                                    )}
                                </ThemedView>
                            </ThemedView>
                        )
                    })}
                </ScrollView>

                {/* Footer */}
                <ThemedView
                    style={[
                        styles.footer,
                        {
                            backgroundColor: isDark ? Colors.dark.highlight : Colors.light.highlight,
                            borderTopColor: isDark ? Colors.dark.border : Colors.light.border,
                        },
                    ]}
                >
                    <ThemedView style={styles.totalSection} darkColor={Colors.dark.highlight} lightColor={Colors.light.highlight}>
                        <ThemedText style={styles.totalLabel}>Total a devolver:</ThemedText>
                        <ThemedText style={styles.totalValue}>{getTotalReturning()}</ThemedText>
                    </ThemedView>
                    <ThemedButton
                        title="Procesar Devolución"
                        onPress={handleSubmit}
                        disabled={getTotalReturning() === 0}
                        style={styles.submitButton}
                        variant="primary"
                        size="medium"
                    />
                </ThemedView>
            </ThemedView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 24,
    },
    closeButton: {
        padding: 8,
    },
    orderInfo: {
        padding: 20,
    },
    orderNumber: {
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 4,
    },
    orderDetails: {
        fontSize: 16,
        opacity: 0.7,
    },
    itemsList: {
        flex: 1,
        padding: 16,
    },
    itemCard: {
        borderWidth: 1,
        borderRadius: 12,
        marginBottom: 12,
        overflow: "hidden",
    },
    itemHeader: {
        padding: 16,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 4,
    },
    itemBrand: {
        fontSize: 16,
        opacity: 0.7,
    },
    itemBody: {
        padding: 16,
        gap: 8,
    },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    itemLabel: {
        fontSize: 16,
        opacity: 0.7,
    },
    itemValue: {
        fontSize: 16,
        fontWeight: "600",
    },
    returnSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#e0e0e0",
        alignItems: "center",
    },
    returnLabel: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 12,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
    },
    totalSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: "600",
    },
    totalValue: {
        fontSize: 22,
        fontWeight: "bold",
    },
    submitButton: {
        width: "100%",
    },
})
