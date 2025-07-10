import { StyleSheet, TouchableOpacity } from "react-native"
import { ThemedView } from "@/components/ThemedView"
import { ThemedText } from "@/components/ThemedText"
import { ProductCombobox } from "@/components/ui/ProductCombobox"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { Camera } from "lucide-react-native"
import type { Product } from "@/types/types"

interface ScannerComboboxSectionProps {
    products: Product[]
    onProductSelect: (product: Product) => void
    onScanPress: () => void
    placeholder?: string
    title?: string
}

export function ScannerComboboxSection({
    products,
    onProductSelect,
    onScanPress,
    placeholder = "Seleccionar producto...",
    title,
}: ScannerComboboxSectionProps) {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    return (
        <ThemedView style={styles.section}>
            {title && (
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                    {title}
                </ThemedText>
            )}
            <ThemedView style={styles.inputRow}>
                <ThemedView style={styles.comboboxContainer}>
                    <ProductCombobox
                        products={products}
                        onProductSelect={onProductSelect}
                        placeholder={placeholder}
                    />
                </ThemedView>
                <TouchableOpacity
                    onPress={onScanPress}
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
    )
}

const styles = StyleSheet.create({
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
        bottom: 17,
        justifyContent: "center",
        alignItems: "center",
    },
}) 