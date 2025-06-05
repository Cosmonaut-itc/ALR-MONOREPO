"use client"

import { StyleSheet, TouchableOpacity } from "react-native"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { Minus, Plus } from "lucide-react-native"

export interface QuantityControlsProps {
    value: number
    onIncrease: () => void
    onDecrease: () => void
    min?: number
    max?: number
    disabled?: boolean
    size?: "small" | "medium" | "large"
    style?: any
}

export function QuantityControls({
    value,
    onIncrease,
    onDecrease,
    min = 0,
    max = Number.POSITIVE_INFINITY,
    disabled = false,
    size = "medium",
    style,
}: QuantityControlsProps) {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    const getSizeStyles = () => {
        switch (size) {
            case "small":
                return {
                    buttonSize: 32,
                    iconSize: 16,
                    textSize: 16,
                    gap: 12,
                }
            case "large":
                return {
                    buttonSize: 48,
                    iconSize: 24,
                    textSize: 24,
                    gap: 20,
                }
            default: // medium
                return {
                    buttonSize: 40,
                    iconSize: 20,
                    textSize: 20,
                    gap: 16,
                }
        }
    }

    const sizeStyles = getSizeStyles()
    const canDecrease = !disabled && value > min
    const canIncrease = !disabled && value < max

    return (
        <ThemedView style={[styles.container, { gap: sizeStyles.gap }, style]} darkColor={Colors.dark.surface} lightColor={Colors.light.surface}>
            <TouchableOpacity
                style={[
                    styles.button,
                    {
                        width: sizeStyles.buttonSize,
                        height: sizeStyles.buttonSize,
                        borderRadius: sizeStyles.buttonSize / 2,
                        backgroundColor: isDark ? Colors.dark.border : Colors.light.border,
                        opacity: canDecrease ? 1 : 0.5,
                    },
                ]}
                onPress={onDecrease}
                disabled={!canDecrease}
                activeOpacity={0.7}
            >
                <Minus size={sizeStyles.iconSize} color={isDark ? Colors.dark.text : Colors.light.text} />
            </TouchableOpacity>

            <ThemedText
                style={[
                    styles.valueText,
                    {
                        fontSize: sizeStyles.textSize,
                        minWidth: sizeStyles.buttonSize,
                    },
                ]}
            >
                {value}
            </ThemedText>

            <TouchableOpacity
                style={[
                    styles.button,
                    {
                        width: sizeStyles.buttonSize,
                        height: sizeStyles.buttonSize,
                        borderRadius: sizeStyles.buttonSize / 2,
                        backgroundColor: isDark ? Colors.dark.border : Colors.light.border,
                        opacity: canIncrease ? 1 : 0.5,
                    },
                ]}
                onPress={onIncrease}
                disabled={!canIncrease}
                activeOpacity={0.7}
            >
                <Plus size={sizeStyles.iconSize} color={isDark ? Colors.dark.text : Colors.light.text} />
            </TouchableOpacity>
        </ThemedView>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    button: {
        justifyContent: "center",
        alignItems: "center",
    },
    valueText: {
        fontWeight: "700",
        textAlign: "center",
    },
})
