"use client"

import { useState } from "react"
import { StyleSheet, Modal, TouchableOpacity, Platform, Alert, Vibration } from "react-native"
import { CameraView, useCameraPermissions, type CameraType } from "expo-camera"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { ThemedButton } from "@/components/ThemedButton"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { X, Camera } from "lucide-react-native"
import type { BarcodeScannerProps, QRCodeData } from "@/types/types"

/**
 * Type definition for barcode scanning result from expo-camera
 */
interface BarcodeScanningResult {
    type: string
    data: string
}

/**
 * Modern barcode scanner component using expo-camera CameraView
 * Focuses on QR code scanning to extract barcode and product ID information
 * Handles camera permissions and provides visual feedback for scan results
 */
export function BarcodeScanner({ onBarcodeScanned, onClose }: BarcodeScannerProps) {
    const [permission, requestPermission] = useCameraPermissions()
    const [scanned, setScanned] = useState(false)
    const [facing] = useState<CameraType>('back')
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    /**
     * Parses QR code data to extract barcode and product ID
     * Expected QR format: JSON string with barcode, productId, name, and type fields
     * Falls back to using the raw data as barcode if parsing fails
     */
    const parseQRData = (data: string): QRCodeData | null => {
        try {
            // Try to parse as JSON first (structured QR codes)
            const parsed = JSON.parse(data)

            // Validate required fields
            if (parsed.barcode && parsed.productId && parsed.type) {
                const result: QRCodeData = {
                    barcode: parsed.barcode,
                    productId: parsed.productId,
                    type: parsed.type
                }
                if (parsed.name) {
                    result.name = parsed.name
                }
                return result
            }
            return null
        } catch {
            // If not JSON, check if it looks like a structured barcode
            // Format: "BARCODE:12345|PRODUCT:ABC123|TYPE:product"
            if (data.includes("|") && data.includes(":")) {
                const parts = data.split("|")
                const qrData: Partial<QRCodeData> = {}

                // Replace forEach with for...of loop
                for (const part of parts) {
                    const [key, value] = part.split(":")
                    switch (key?.toUpperCase()) {
                        case "BARCODE":
                            qrData.barcode = value
                            break
                        case "PRODUCT":
                        case "PRODUCTID":
                            qrData.productId = value
                            break
                        case "NAME":
                            qrData.name = value
                            break
                        case "TYPE":
                            qrData.type = value as "product" | "inventory"
                            break
                    }
                }

                if (qrData.barcode && qrData.productId) {
                    const result: QRCodeData = {
                        barcode: qrData.barcode,
                        productId: qrData.productId,
                        type: qrData.type || "product"
                    }
                    if (qrData.name) {
                        result.name = qrData.name
                    }
                    return result
                }
            }
            return null
        }
    }

    /**
     * Handles successful barcode/QR code scan using the new expo-camera API
     * Attempts to parse structured QR data, falls back to raw barcode
     * Provides haptic and visual feedback
     */
    const handleBarcodeScanned = (scanningResult: BarcodeScanningResult) => {
        if (scanned) return

        setScanned(true)

        // Provide haptic feedback
        if (Platform.OS !== "web") {
            Vibration.vibrate(100)
        }

        // Extract data from the scanning result
        const data = scanningResult.data
        console.log(`Scanned ${scanningResult.type} with data: ${data}`)

        // Try to parse as structured QR code first
        const qrData = parseQRData(data)

        if (qrData) {
            Alert.alert(
                "QR Code Escaneado",
                `Producto: ${qrData.name || qrData.productId}\nCódigo: ${qrData.barcode}`,
                [
                    {
                        text: "Cancelar",
                        style: "cancel",
                        onPress: () => setScanned(false)
                    },
                    {
                        text: "Agregar",
                        onPress: () => {
                            onBarcodeScanned(qrData.barcode)
                            onClose()
                        }
                    }
                ]
            )
        } else {
            // Fall back to treating the raw data as a barcode
            Alert.alert(
                "Código Escaneado",
                `Código: ${data}`,
                [
                    {
                        text: "Cancelar",
                        style: "cancel",
                        onPress: () => setScanned(false)
                    },
                    {
                        text: "Agregar",
                        onPress: () => {
                            onBarcodeScanned(data)
                            onClose()
                        }
                    }
                ]
            )
        }
    }

    /**
     * Resets scanner state to allow scanning again
     */
    const resetScanner = () => {
        setScanned(false)
    }

    // Loading state while permissions are being requested
    if (!permission) {
        return (
            <Modal visible={true} animationType="slide">
                <ThemedView style={styles.container}>
                    <ThemedView style={styles.loadingContainer}>
                        <Camera size={48} color={isDark ? Colors.dark.tint : Colors.light.tint} />
                        <ThemedText style={styles.loadingText}>Solicitando permisos de cámara...</ThemedText>
                    </ThemedView>
                </ThemedView>
            </Modal>
        )
    }

    // Permission denied state
    if (!permission.granted) {
        return (
            <Modal visible={true} animationType="slide">
                <ThemedView style={styles.container}>
                    <ThemedView style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={isDark ? Colors.dark.tint : Colors.light.tint} />
                            <ThemedText style={{ color: isDark ? Colors.dark.tint : Colors.light.tint, marginLeft: 8 }}>
                                Cerrar
                            </ThemedText>
                        </TouchableOpacity>
                    </ThemedView>
                    <ThemedView style={styles.permissionContainer}>
                        <X size={48} color={isDark ? Colors.dark.text : Colors.light.text} />
                        <ThemedText style={styles.noPermissionText}>Sin acceso a la cámara</ThemedText>
                        <ThemedText style={styles.permissionInstructions}>
                            Para escanear códigos QR, necesitas permitir el acceso a la cámara en la configuración de la aplicación.
                        </ThemedText>
                        <ThemedButton
                            title="Solicitar Permisos"
                            onPress={requestPermission}
                            variant="primary"
                            size="medium"
                            style={styles.permissionButton}
                        />
                        <ThemedButton
                            title="Cerrar"
                            onPress={onClose}
                            variant="outline"
                            size="medium"
                            style={styles.permissionButton}
                        />
                    </ThemedView>
                </ThemedView>
            </Modal>
        )
    }

    // Main scanner interface using CameraView
    return (
        <Modal visible={true} animationType="slide">
            <ThemedView style={styles.container}>
                {/* Header with close button */}
                <ThemedView style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={24} color={isDark ? Colors.dark.tint : Colors.light.tint} />
                        <ThemedText style={{ color: isDark ? Colors.dark.tint : Colors.light.tint, marginLeft: 8 }}>
                            Cerrar
                        </ThemedText>
                    </TouchableOpacity>
                </ThemedView>

                {/* Camera scanner view using the new CameraView */}
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing={facing}
                    barcodeScannerSettings={{
                        barcodeTypes: [
                            "qr",
                            "ean13",
                            "ean8",
                            "code128",
                            "code39",
                            "upc_a",
                            "upc_e",
                            "pdf417",
                            "aztec",
                            "datamatrix",
                            "codabar",
                            "itf14"
                        ],
                    }}
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                />

                {/* Scanning overlay */}
                <ThemedView style={styles.overlay}>
                    {/* Top section */}
                    <ThemedView style={styles.overlaySection}>
                        <ThemedText style={styles.instructionText}>
                            {scanned ? "¡Código escaneado!" : "Apunta la cámara al código QR"}
                        </ThemedText>
                    </ThemedView>

                    {/* Center scanning frame */}
                    <ThemedView style={styles.scanningArea}>
                        <ThemedView style={styles.scanFrame}>
                            {/* Corner indicators */}
                            <ThemedView style={[styles.corner, styles.topLeft]} />
                            <ThemedView style={[styles.corner, styles.topRight]} />
                            <ThemedView style={[styles.corner, styles.bottomLeft]} />
                            <ThemedView style={[styles.corner, styles.bottomRight]} />

                            {/* Scanning line animation */}
                            {!scanned && (
                                <ThemedView style={[styles.scanLine, { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint }]} />
                            )}
                        </ThemedView>
                    </ThemedView>

                    {/* Bottom section with controls */}
                    <ThemedView style={styles.overlaySection}>
                        <ThemedView style={styles.controls}>
                            {/* Reset scanner button */}
                            {scanned && (
                                <ThemedButton
                                    title="Escanear Otro"
                                    onPress={resetScanner}
                                    variant="primary"
                                    size="medium"
                                    style={styles.resetButton}
                                />
                            )}
                        </ThemedView>

                        <ThemedText style={styles.helpText}>
                            {scanned
                                ? "Toca 'Escanear Otro' para continuar"
                                : "Asegúrate de que el código esté bien iluminado y enfocado"
                            }
                        </ThemedText>
                    </ThemedView>
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
        position: "absolute",
        top: Platform.OS === "ios" ? 50 : 20,
        right: 16,
        zIndex: 10,
        backgroundColor: "transparent",

    },
    closeButton: {
        flexDirection: "row",
        alignItems: "center",
        padding: 8,
        borderRadius: 8,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        textAlign: "center",
    },
    permissionContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    noPermissionText: {
        fontSize: 18,
        fontWeight: "600",
        textAlign: "center",
        marginTop: 16,
        marginBottom: 12,
    },
    permissionInstructions: {
        fontSize: 14,
        textAlign: "center",
        opacity: 0.7,
        marginBottom: 24,
        lineHeight: 20,
    },
    permissionButton: {
        width: 200,
        marginTop: 8,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "transparent",
        justifyContent: "space-between",
        paddingTop: Platform.OS === "ios" ? 100 : 70,
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    overlaySection: {
        alignItems: "center",
        backgroundColor: "transparent",
    },
    instructionText: {
        fontSize: 18,
        fontWeight: "600",
        textAlign: "center",
        color: "white",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    scanningArea: {
        flex: 1,
        justifyContent: "center",
        backgroundColor: "transparent",
        alignItems: "center",
    },
    scanFrame: {
        width: 250,
        height: 250,
        backgroundColor: "transparent",
        position: "relative",
    },
    corner: {
        position: "absolute",
        width: 20,
        height: 20,
        borderColor: "white",
        borderWidth: 3,
        backgroundColor: "transparent",
    },
    topLeft: {
        top: 0,
        left: 0,
        borderBottomWidth: 0,
        borderRightWidth: 0,
    },
    topRight: {
        top: 0,
        right: 0,
        borderBottomWidth: 0,
        borderLeftWidth: 0,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderTopWidth: 0,
        borderRightWidth: 0,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderTopWidth: 0,
        borderLeftWidth: 0,
    },
    scanLine: {
        position: "absolute",
        left: 0,
        right: 0,
        height: 2,
        top: "50%",
        opacity: 0.8,
    },
    controls: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        gap: 20,
    },
    resetButton: {
        paddingHorizontal: 24,
    },
    helpText: {
        fontSize: 14,
        textAlign: "center",
        color: "white",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        maxWidth: 300,
        lineHeight: 18,
    },
})
