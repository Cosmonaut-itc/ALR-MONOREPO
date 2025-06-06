"use client"

import { useState, useEffect } from "react"
import { StyleSheet, TouchableOpacity, Platform, ScrollView, Alert } from "react-native"
import { StatusBar } from "expo-status-bar"
import { router, useLocalSearchParams } from "expo-router"

import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { ThemedButton } from "@/components/ThemedButton"
import { BarcodeScanner } from "@/components/ui/BarcodeScanner"
import { ProductCombobox } from "@/components/ui/ProductCombobox"
import { ProductCard } from "@/components/ui/ProductCard"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { ArrowLeft, Camera } from "lucide-react-native"
import type { PendingOrder, Product, SelectedProduct } from "@/types/types"
import { ThemedHeader } from "@/components/ThemedHeader"
import { ScannerComboboxSection } from "@/components/ui/ScannerComboboxSection"

// Mock pending orders data (in a real app, this would come from a store/API)
const PENDING_ORDERS: PendingOrder[] = [
    {
        id: "o1",
        orderNumber: "ORD-001",
        items: [
            {
                productId: "1",
                productName: "Esmalte Rojo Clásico",
                brand: "OPI",
                quantityTaken: 3,
                quantityReturned: 0,
                price: 15.99,
            },
            {
                productId: "2",
                productName: "Base Coat Fortalecedora",
                brand: "Essie",
                quantityTaken: 2,
                quantityReturned: 1,
                price: 12.5,
            },
        ],
        takenAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        takenBy: "María García",
        status: "partial",
    },
    {
        id: "o2",
        orderNumber: "ORD-002",
        items: [
            {
                productId: "3",
                productName: "Top Coat Brillo",
                brand: "Sally Hansen",
                quantityTaken: 1,
                quantityReturned: 0,
                price: 10.99,
            },
            {
                productId: "4",
                productName: "Removedor de Esmalte",
                brand: "Zoya",
                quantityTaken: 2,
                quantityReturned: 0,
                price: 8.75,
            },
        ],
        takenAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        takenBy: "Ana López",
        status: "pending",
    },
]

export default function OrderDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const [order, setOrder] = useState<PendingOrder | null>(null)
    const [returnProducts, setReturnProducts] = useState<SelectedProduct[]>([])
    const [showScanner, setShowScanner] = useState(false)
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    useEffect(() => {
        // Find the order by ID
        const foundOrder = PENDING_ORDERS.find((o) => o.id === id)
        if (foundOrder) {
            setOrder(foundOrder)
        } else {
            Alert.alert("Error", "Orden no encontrada", [{ text: "OK", onPress: () => router.back() }])
        }
    }, [id])

    // Convert order items to products for the combobox
    const orderAsProducts: Product[] =
        order?.items.map((item) => ({
            id: item.productId,
            name: item.productName,
            brand: item.brand,
            price: item.price,
            stock: item.quantityTaken - item.quantityReturned, // Available to return
            barcode: item.productId, // Use productId as barcode for scanning
        })) || []

    const handleProductSelect = (product: Product) => {
        const orderItem = order?.items.find((item) => item.productId === product.id)
        if (!orderItem) return

        const maxReturn = orderItem.quantityTaken - orderItem.quantityReturned
        if (maxReturn <= 0) {
            Alert.alert("Sin Stock", "No hay productos disponibles para devolver")
            return
        }

        const existingIndex = returnProducts.findIndex((p) => p.id === product.id)
        if (existingIndex >= 0) {
            // Update existing product quantity
            const updated = [...returnProducts]
            if (updated[existingIndex].quantity < maxReturn) {
                updated[existingIndex].quantity += 1
                setReturnProducts(updated)
            } else {
                Alert.alert("Límite Alcanzado", "No puedes devolver más de lo que se tomó")
            }
        } else {
            // Add new product for return
            setReturnProducts([
                ...returnProducts,
                {
                    id: product.id,
                    name: product.name,
                    brand: product.brand,
                    stock: maxReturn,
                    quantity: 1,
                    selectedAt: new Date(),
                },
            ])
        }
    }

    const handleBarcodeScanned = (barcode: string) => {
        // Find item by barcode (productId)
        const product = orderAsProducts.find((product) => product.barcode === barcode)

        if (product) {
            handleProductSelect(product)
            setShowScanner(false)
            Alert.alert("Producto Encontrado", `${product.name} agregado para devolución`)
        } else {
            Alert.alert("Producto No Encontrado", "El código escaneado no corresponde a ningún producto de esta orden")
        }
    }

    const handleRemoveProduct = (productId: string) => {
        setReturnProducts(returnProducts.filter((p) => p.id !== productId))
    }

    const handleUpdateQuantity = (productId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            handleRemoveProduct(productId)
            return
        }

        const orderItem = order?.items.find((item) => item.productId === productId)
        if (!orderItem) return

        const maxReturn = orderItem.quantityTaken - orderItem.quantityReturned
        const clampedQuantity = Math.min(newQuantity, maxReturn)

        setReturnProducts(returnProducts.map((p) => (p.id === productId ? { ...p, quantity: clampedQuantity } : p)))
    }

    const handleSubmitReturn = () => {
        if (returnProducts.length === 0) {
            Alert.alert("Sin Devoluciones", "Selecciona al menos un producto para devolver")
            return
        }

        const totalReturning = returnProducts.reduce((total, product) => total + product.quantity, 0)

        Alert.alert("Confirmar Devolución", `¿Deseas procesar la devolución de ${totalReturning} producto(s)?`, [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Confirmar",
                onPress: () => {
                    // Process return
                    console.log("Processing return:", returnProducts)
                    Alert.alert("Éxito", "Devolución procesada correctamente", [{ text: "OK", onPress: () => router.back() }])
                },
            },
        ])
    }

    const getTotalReturning = () => {
        return returnProducts.reduce((total, product) => total + product.quantity, 0)
    }

    const getOrderItemStatus = (productId: string) => {
        const orderItem = order?.items.find((item) => item.productId === productId)
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
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                        Productos de la Orden
                    </ThemedText>
                    {order.items.map((item) => {
                        const status = getOrderItemStatus(item.productId)
                        const statusColor =
                            status === "completed"
                                ? isDark
                                    ? "#4ade80"
                                    : "#16a34a"
                                : status === "partial"
                                    ? isDark
                                        ? "#fbbf24"
                                        : "#d97706"
                                    : isDark
                                        ? "#ffd166"
                                        : "#f57c00"

                        return (
                            <ThemedView
                                key={item.productId}
                                style={[
                                    styles.orderItemOverview,
                                    {
                                        backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                                        borderColor: statusColor,
                                    },
                                ]}
                            >
                                <ThemedView style={styles.itemInfo}>
                                    <ThemedText style={styles.itemName}>{item.productName}</ThemedText>
                                    <ThemedText style={styles.itemBrand}>{item.brand}</ThemedText>
                                </ThemedView>
                                <ThemedView style={styles.itemStats}>
                                    <ThemedText style={styles.itemStat}>Tomado: {item.quantityTaken}</ThemedText>
                                    <ThemedText style={styles.itemStat}>Devuelto: {item.quantityReturned}</ThemedText>
                                    <ThemedText style={styles.itemStat}>
                                        Disponible: {item.quantityTaken - item.quantityReturned}
                                    </ThemedText>
                                </ThemedView>
                            </ThemedView>
                        )
                    })}
                </ThemedView>

                {/* Scanner and Combobox Section */}
                <ScannerComboboxSection
                    products={orderAsProducts}
                    onProductSelect={handleProductSelect}
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
                        {returnProducts.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onRemove={handleRemoveProduct}
                                onUpdateQuantity={handleUpdateQuantity}
                                style={styles.productCard}
                            />
                        ))}
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
            {showScanner && <BarcodeScanner onBarcodeScanned={handleBarcodeScanned} onClose={() => setShowScanner(false)} />}
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
    orderItemOverview: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 2,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 4,
    },
    itemBrand: {
        fontSize: 14,
        opacity: 0.7,
    },
    itemStats: {
        alignItems: "flex-end",
    },
    itemStat: {
        fontSize: 12,
        opacity: 0.8,
        marginBottom: 2,
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
})
