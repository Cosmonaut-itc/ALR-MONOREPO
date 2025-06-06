"use client"

import { useEffect } from "react"
import { StyleSheet, ScrollView, Alert } from "react-native"
import { StatusBar } from "expo-status-bar"
import { router, useLocalSearchParams } from "expo-router"

import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { ThemedButton } from "@/components/ThemedButton"
import { BarcodeScanner } from "@/components/ui/BarcodeScanner"
import { ProductCard } from "@/components/ui/ProductCard"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import type { Product, PendingOrder, SelectedProduct, OrderItem } from "@/types/types"
import { ThemedHeader } from "@/components/ThemedHeader"
import { ScannerComboboxSection } from "@/components/ui/ScannerComboboxSection"
import { useBaseUserStore, useReturnOrderStore } from "@/app/stores/baseUserStores"
import { Collapsible } from "@/components/Collapsible"

export default function OrderDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    // Get order from baseUserStore
    const { selectedOrder, pendingOrders } = useBaseUserStore()
    const order = selectedOrder || pendingOrders.find((o: PendingOrder) => o.id === id)

    // Get return order state and actions
    const {
        returnProducts,
        showScanner,
        handleProductSelect,
        handleBarcodeScanned,
        handleRemoveProduct,
        handleUpdateQuantity,
        setShowScanner,
        clearReturnProducts,
    } = useReturnOrderStore()

    useEffect(() => {
        if (!order) {
            Alert.alert("Error", "Orden no encontrada", [{ text: "OK", onPress: () => router.back() }])
        }
        // Clear return products when component unmounts
        return () => {
            clearReturnProducts()
        }
    }, [order, clearReturnProducts])

    // Convert order items to products for the combobox
    const orderAsProducts: Product[] =
        order?.items.map((item: OrderItem) => ({
            id: item.productId,
            name: item.productName,
            brand: item.brand,
            price: item.price,
            stock: item.quantityTaken - item.quantityReturned, // Available to return
            barcode: item.productId, // Use productId as barcode for scanning
        })) || []

    const handleSubmitReturn = () => {
        if (returnProducts.length === 0) {
            Alert.alert("Sin Devoluciones", "Selecciona al menos un producto para devolver")
            return
        }

        const totalReturning = returnProducts.reduce((total: number, product: SelectedProduct) => total + product.quantity, 0)

        Alert.alert("Confirmar Devolución", `¿Deseas procesar la devolución de ${totalReturning} producto(s)?`, [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Confirmar",
                onPress: () => {
                    // Process return
                    console.log("Processing return:", returnProducts)
                    clearReturnProducts()
                    Alert.alert("Éxito", "Devolución procesada correctamente", [{ text: "OK", onPress: () => router.back() }])
                },
            },
        ])
    }

    const getTotalReturning = () => {
        return returnProducts.reduce((total: number, product: SelectedProduct) => total + product.quantity, 0)
    }

    const getOrderItemStatus = (productId: string) => {
        const orderItem = order?.items.find((item: OrderItem) => item.productId === productId)
        if (!orderItem) return "unknown"

        if (orderItem.quantityReturned >= orderItem.quantityTaken) {
            return "completed"
        } if (orderItem.quantityReturned > 0) {
            return "partial"
        }
        return "pending"
    }

    if (!order) {
        return (
            <ThemedView style={styles.container}>
                <ThemedText>Cargando orden...</ThemedText>
            </ThemedView>
        )
    }

    const getStatusColor = () => {
        switch (order.status) {
            case "completed":
                return isDark ? "#4ade80" : "#16a34a"
            case "partial":
                return isDark ? "#fbbf24" : "#d97706"
            default:
                return isDark ? "#ffd166" : "#f57c00"
        }
    }

    const getStatusText = () => {
        switch (order.status) {
            case "completed":
                return "COMPLETADO"
            case "partial":
                return "SIN DEVOLVER"
            default:
                return "PENDIENTE"
        }
    }

    return (
        <ThemedView style={styles.container}>
            <StatusBar style={isDark ? "light" : "dark"} />

            <ThemedHeader title="Gestionar Orden" />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Order Info */}
                <ThemedView
                    style={[
                        styles.orderInfoSection,
                        {
                            backgroundColor: isDark ? Colors.dark.highlight : Colors.light.highlight,
                        },
                    ]}
                >
                    <ThemedText style={styles.orderNumber}>Orden #{order.orderNumber}</ThemedText>
                    <ThemedText style={styles.orderDetails}>Fecha: {order.takenAt.toLocaleDateString()}</ThemedText>
                    <ThemedText style={styles.orderDetails}>
                        Estado: {order.status === "pending" ? "Pendiente" : order.status === "partial" ? "Parcial" : "Completado"}
                    </ThemedText>
                </ThemedView>

                {/* Order Items Overview */}
                <ThemedView style={styles.section}>
                    <Collapsible title={`Productos de la Orden (${order.items.length})`}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.orderItemsGrid}
                        >
                            {order.items.map((item: OrderItem) => {
                                const status = getOrderItemStatus(item.productId)
                                const statusColor = isDark ? "#fbbf24" : "#d97706"
                                return (
                                    <ThemedView
                                        key={item.productId}
                                        style={[
                                            styles.orderItemCard,
                                            {
                                                backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                                                borderColor: statusColor,
                                            },
                                        ]}
                                    >

                                        <ThemedView
                                            style={styles.itemInfo}
                                            lightColor={Colors.light.surface}
                                            darkColor={Colors.dark.surface}
                                        >
                                            <ThemedText style={styles.itemName}>{item.productName}</ThemedText>
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
                                            <ThemedText style={styles.itemBrand}>{item.brand}</ThemedText>
                                        </ThemedView>
                                    </ThemedView>
                                )
                            })}
                        </ScrollView>
                    </Collapsible>
                </ThemedView>

                {/* Scanner and Combobox Section */}
                <ScannerComboboxSection
                    products={orderAsProducts}
                    onProductSelect={(product: Product) => {
                        const orderItem = order.items.find((item: OrderItem) => item.productId === product.id)
                        if (orderItem) {
                            handleProductSelect(product, orderItem.quantityTaken - orderItem.quantityReturned)
                        }
                    }}
                    onScanPress={() => setShowScanner(true)}
                    title="Seleccionar Productos para Devolución"
                    placeholder="Seleccionar producto de la orden..."
                />

                {/* Return Products Section */}
                {returnProducts.length > 0 && (
                    <ThemedView style={styles.section}>
                        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                            Productos para Devolver ({returnProducts.length})
                        </ThemedText>
                        {returnProducts.map((product: SelectedProduct) => {
                            const orderItem = order.items.find((item: OrderItem) => item.productId === product.id)
                            const maxReturn = orderItem ? orderItem.quantityTaken - orderItem.quantityReturned : 0
                            return (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    onRemove={handleRemoveProduct}
                                    onUpdateQuantity={(id: string, quantity: number) => handleUpdateQuantity(id, quantity, maxReturn)}
                                    style={styles.productCard}
                                />
                            )
                        })}
                    </ThemedView>
                )}

                {/* Submit Section */}
                {returnProducts.length > 0 && (
                    <ThemedView style={styles.submitSection}>
                        <ThemedView
                            style={[
                                styles.totalContainer,
                                {
                                    backgroundColor: isDark ? Colors.dark.highlight : Colors.light.highlight,
                                },
                            ]}
                        >
                            <ThemedText style={styles.totalLabel}>Total a devolver:</ThemedText>
                            <ThemedText style={styles.totalValue}>{getTotalReturning()}</ThemedText>
                        </ThemedView>
                        <ThemedButton
                            title="Procesar Devolución"
                            onPress={handleSubmitReturn}
                            style={styles.submitButton}
                            variant="primary"
                            size="medium"
                        />
                    </ThemedView>
                )}
            </ScrollView>

            {/* Barcode Scanner Modal */}
            {showScanner && (
                <BarcodeScanner
                    onBarcodeScanned={(barcode) => handleBarcodeScanned(barcode, orderAsProducts)}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </ThemedView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        padding: 16,
    },
    orderInfoSection: {
        marginBottom: 24,
        padding: 16,
        borderRadius: 12,
    },
    orderNumber: {
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 8,
    },
    orderDetails: {
        fontSize: 16,
        opacity: 0.7,
        marginBottom: 4,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        marginBottom: 12,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 12,
    },
    comboboxContainer: {
        flex: 1,
    },
    scanButton: {
        width: 56,
        height: 56,
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    orderItemsGrid: {
        paddingVertical: 8,
        gap: 12,
    },
    orderItemCard: {
        width: 280,
        borderRadius: 12,
        borderWidth: 2,
        padding: 16,
        marginRight: 12,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 20,
        fontWeight: "600",
        marginBottom: 4,
    },
    itemBrand: {
        fontSize: 14,
        opacity: 0.7,
        marginBottom: 12,
    },
    itemStats: {
        gap: 4,
    },
    itemStat: {
        fontSize: 14,
        opacity: 0.8,
    },
    productCard: {
        marginBottom: 8,
    },
    submitSection: {
        marginTop: 16,
        marginBottom: 32,
    },
    totalContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        padding: 16,
        borderRadius: 8,
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
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        width: 120,
    },
    badgeText: {
        color: "white",
        fontSize: 12,
        fontWeight: "bold",
        letterSpacing: 0.5,
    },
})
