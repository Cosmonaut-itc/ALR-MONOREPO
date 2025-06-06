"use client"

import { useEffect } from "react"
import { StyleSheet, TouchableOpacity, Platform, ScrollView } from "react-native"
import { StatusBar } from "expo-status-bar"
import { router } from "expo-router"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { ThemedButton } from "@/components/ThemedButton"
import { BarcodeScanner } from "@/components/ui/BarcodeScanner"
import { ProductCombobox } from "@/components/ui/ProductCombobox"
import { ProductCard } from "@/components/ui/ProductCard"
import { PendingOrderCard } from "@/components/ui/PendingOrderCard"
import { ReturnOrderModal } from "@/components/ui/ReturnOrderModal"
import { Collapsible } from "@/components/Collapsible"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { ArrowLeft, Camera } from "lucide-react-native"
import type { PendingOrder, SelectedProduct } from "@/types/types"
import { useBaseUserStore } from "@/app/stores/baseUserStores"

/**
 * Product type definition
 * Represents a nail salon product with its essential properties
 */
interface Product {
    id: string
    name: string
    brand: string
    price: number
    stock: number
    barcode?: string
}

/**
 * Mock data for nail salon products
 * This data simulates a product database with common nail salon items
 */
const NAIL_PRODUCTS: Product[] = [
    { id: "1", name: "Esmalte Rojo Clásico", brand: "OPI", price: 15.99, stock: 25, barcode: "123456789" },
    { id: "2", name: "Base Coat Fortalecedora", brand: "Essie", price: 12.5, stock: 18, barcode: "123456789" },
    { id: "3", name: "Top Coat Brillo", brand: "Sally Hansen", price: 10.99, stock: 30, barcode: "123456789" },
    { id: "4", name: "Removedor de Esmalte", brand: "Zoya", price: 8.75, stock: 12, barcode: "123456789" },
    { id: "5", name: "Lima de Uñas Profesional", brand: "Revlon", price: 5.99, stock: 40, barcode: "123456789" },
    { id: "6", name: "Aceite Cuticular", brand: "CND", price: 18.5, stock: 15, barcode: "123456789" },
    { id: "7", name: "Esmalte Gel UV", brand: "Gelish", price: 22.0, stock: 20, barcode: "123456789" },
    { id: "8", name: "Lámpara LED", brand: "Makartt", price: 45.99, stock: 5, barcode: "123456789" },
    { id: "9", name: "Esmalte Rojo Clásico", brand: "OPI", price: 15.99, stock: 25, barcode: "123456789" },
    { id: "10", name: "Base Coat Fortalecedora", brand: "Essie", price: 12.5, stock: 18, barcode: "123456789" },
    { id: "11", name: "Top Coat Brillo", brand: "Sally Hansen", price: 10.99, stock: 30, barcode: "123456789" },
    { id: "12", name: "Removedor de Esmalte", brand: "Zoya", price: 8.75, stock: 12, barcode: "123456789" },
    { id: "13", name: "Lima de Uñas Profesional", brand: "Revlon", price: 5.99, stock: 40, barcode: "123456789" },
    { id: "14", name: "Aceite Cuticular", brand: "CND", price: 18.5, stock: 15, barcode: "123456789" },
    { id: "15", name: "Esmalte Gel UV", brand: "Gelish", price: 22.0, stock: 20, barcode: "123456789" },
    { id: "16", name: "Lámpara LED", brand: "Makartt", price: 45.99, stock: 5, barcode: "123456789" },
]

/**
 * Mock pending orders data
 * Represents orders that have been taken but not fully returned
 */
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
        ],
        takenAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        takenBy: "Ana López",
        status: "pending",
    },
]

export default function InventoryScannerScreen() {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    // Initialize store with demo data
    useEffect(() => {
        useBaseUserStore.getState().initializeStore(NAIL_PRODUCTS, PENDING_ORDERS)
    }, [])

    // Get store state and actions
    const {
        selectedProducts,
        pendingOrders,
        showScanner,
        selectedOrder,
        showReturnModal,
        handleProductSelect,
        handleBarcodeScanned,
        handleRemoveProduct,
        handleUpdateQuantity,
        handleOrderClick,
        handleReturnSubmit,
        handleSubmit,
        setShowScanner,
        setShowReturnModal,
        setSelectedOrder,
    } = useBaseUserStore()

    return (
        <ThemedView style={styles.container}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* Header */}
            <ThemedView style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={20} color={isDark ? Colors.dark.tint : Colors.light.tint} />
                    <ThemedText style={[styles.backText, { color: isDark ? Colors.dark.tint : Colors.light.tint }]}>
                        Atrás
                    </ThemedText>
                </TouchableOpacity>
                <ThemedText type="title" style={styles.title}>
                    Escáner de Inventario
                </ThemedText>
                <ThemedView style={styles.placeholder} />
            </ThemedView>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Pending Orders Section - Collapsible */}
                {pendingOrders.length > 0 && (
                    <ThemedView style={styles.section}>
                        <Collapsible title={`Órdenes Pendientes (${pendingOrders.length})`}>
                            {pendingOrders.map((order: PendingOrder) => (
                                <PendingOrderCard
                                    key={order.id}
                                    order={order}
                                    onOrderClick={handleOrderClick}
                                    style={styles.pendingCard}
                                />
                            ))}
                        </Collapsible>
                    </ThemedView>
                )}

                {/* Scanner and Combobox Section */}
                <ThemedView style={styles.section}>
                    <ThemedView style={styles.inputRow}>
                        <ThemedView style={styles.comboboxContainer}>
                            <ProductCombobox
                                products={NAIL_PRODUCTS}
                                onProductSelect={(product: Product) => handleProductSelect(product)}
                            />
                        </ThemedView>
                        <TouchableOpacity
                            onPress={() => setShowScanner(true)}
                            style={[
                                styles.scanButton,
                                {
                                    backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                                    borderColor: isDark ? Colors.dark.border : Colors.light.border,
                                },
                            ]}
                            activeOpacity={0.7}
                        >
                            <Camera size={24} color={isDark ? Colors.dark.tint : Colors.light.tint} />
                        </TouchableOpacity>
                    </ThemedView>
                </ThemedView>

                {/* Selected Products Section */}
                {selectedProducts.length > 0 && (
                    <ThemedView style={styles.section}>
                        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                            Productos Seleccionados ({selectedProducts.length})
                        </ThemedText>
                        {selectedProducts.map((product: SelectedProduct) => (
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

                {/* Submit Button */}
                {selectedProducts.length > 0 && (
                    <ThemedView style={styles.submitContainer}>
                        <ThemedButton
                            title="Procesar Inventario"
                            onPress={handleSubmit}
                            style={styles.submitButton}
                            variant="primary"
                            size="medium"
                        />
                    </ThemedView>
                )}
            </ScrollView>

            {/* Barcode Scanner Modal */}
            {showScanner && <BarcodeScanner onBarcodeScanned={handleBarcodeScanned} onClose={() => setShowScanner(false)} />}

            {/* Return Order Modal */}
            {selectedOrder && (
                <ReturnOrderModal
                    order={selectedOrder}
                    visible={showReturnModal}
                    onClose={() => {
                        setShowReturnModal(false)
                        setSelectedOrder(null)
                    }}
                    onSubmit={handleReturnSubmit}
                />
            )}
        </ThemedView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        paddingTop: Platform.OS === "ios" ? 50 : 16,
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        padding: 8,
    },
    backText: {
        marginLeft: 4,
        fontSize: 16,
    },
    title: {
        fontSize: 20,
        textAlign: "center",
    },
    placeholder: {
        width: 50,
    },
    scrollView: {
        flex: 1,
        padding: 16,
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
        alignItems: "center",
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
        top: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    pendingCard: {
        marginBottom: 8,
    },
    productCard: {
        marginBottom: 8,
    },
    submitContainer: {
        marginTop: 16,
        marginBottom: 32,
    },
    submitButton: {
        width: "100%",
    },
})
