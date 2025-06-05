"use client"

import { useState, useEffect } from "react"
import { StyleSheet, Modal, TouchableOpacity, Platform } from "react-native"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { ThemedButton } from "@/components/ThemedButton"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { X, Camera } from "lucide-react-native"
import type { BarcodeScannerProps } from "@/types/types"

export function BarcodeScanner({ onBarcodeScanned, onClose }: BarcodeScannerProps) {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null)
    const [scanned, setScanned] = useState(false)
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    useEffect(() => {
        // In a real app, you would request camera permissions here
        // For demo purposes, we'll simulate permission granted
        setHasPermission(true)
    }, [])

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        setScanned(true)
        onBarcodeScanned(data)
    }

    // Mock scanner for demo purposes
    const simulateBarcodeScan = () => {
        const mockBarcodes = ["123456789", "987654321", "555666777"]
        const randomBarcode = mockBarcodes[Math.floor(Math.random() * mockBarcodes.length)]
        handleBarCodeScanned({ data: randomBarcode })
    }

    if (hasPermission === null) {
        return (
            <Modal visible={true} animationType="slide">
                <ThemedView style={styles.container}>
                    <ThemedText>Solicitando permisos de cámara...</ThemedText>
                </ThemedView>
            </Modal>
        )
    }

    if (hasPermission === false) {
        return (
            <Modal visible={true} animationType="slide">
                <ThemedView style={styles.container}>
                    <ThemedText style={styles.noPermissionText}>Sin acceso a la cámara</ThemedText>
                    <ThemedButton title="Cerrar" onPress={onClose} variant="primary" size="medium" />
                </ThemedView>
            </Modal>
        )
    }

    return (
        <Modal visible={true} animationType="slide">
            <ThemedView style={styles.container}>
                {/* Header */}
                <ThemedView style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={24} color={isDark ? Colors.dark.tint : Colors.light.tint} />
                        <ThemedText style={{ color: isDark ? Colors.dark.tint : Colors.light.tint, marginLeft: 8 }}>
                            Cerrar
                        </ThemedText>
                    </TouchableOpacity>
                </ThemedView>

                {/* Scanner Area */}
                <ThemedView style={styles.scannerContainer}>
                    <ThemedView
                        style={[
                            styles.scannerFrame,
                            {
                                borderColor: isDark ? Colors.dark.tint : Colors.light.tint,
                                backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                            },
                        ]}
                    >
                        <Camera size={48} color={isDark ? Colors.dark.tint : Colors.light.tint} />
                        <ThemedText style={styles.scannerText}>
                            {scanned ? "Código escaneado!" : "Apunta la cámara al código de barras"}
                        </ThemedText>

                        {/* Mock scanner overlay */}
                        <ThemedView style={styles.scannerOverlay}>
                            <ThemedView
                                style={[styles.scannerLine, { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint }]}
                            />
                        </ThemedView>
                    </ThemedView>
                </ThemedView>

                {/* Instructions */}
                <ThemedView style={styles.instructionsContainer}>
                    <ThemedText style={styles.instructionsText}>
                        Mantén el código de barras dentro del marco para escanearlo
                    </ThemedText>
                </ThemedView>

                {/* Demo Button */}
                <ThemedView style={styles.demoContainer}>
                    <ThemedButton
                        title="Simular Escaneo (Demo)"
                        onPress={simulateBarcodeScan}
                        variant="outline"
                        size="medium"
                        disabled={scanned}
                    />
                </ThemedView>

                {scanned && (
                    <ThemedView style={styles.scannedContainer}>
                        <ThemedButton title="Escanear Otro" onPress={() => setScanned(false)} variant="primary" size="medium" />
                    </ThemedView>
                )}
            </ThemedView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Platform.OS === "ios" ? 50 : 20,
    },
    header: {
        flexDirection: "row",
        justifyContent: "flex-end",
        padding: 16,
    },
    closeButton: {
        flexDirection: "row",
        alignItems: "center",
        padding: 8,
    },
    scannerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    scannerFrame: {
        width: 300,
        height: 200,
        borderWidth: 2,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
    },
    scannerText: {
        textAlign: "center",
        fontSize: 16,
        marginTop: 20,
    },
    scannerOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    scannerLine: {
        width: "80%",
        height: 2,
        opacity: 0.8,
    },
    instructionsContainer: {
        padding: 20,
        alignItems: "center",
    },
    instructionsText: {
        textAlign: "center",
        fontSize: 14,
        opacity: 0.7,
    },
    demoContainer: {
        padding: 20,
        alignItems: "center",
    },
    scannedContainer: {
        padding: 20,
        alignItems: "center",
    },
    noPermissionText: {
        textAlign: "center",
        fontSize: 16,
        marginBottom: 20,
    },
})
