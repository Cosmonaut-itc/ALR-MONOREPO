"use client"

import { StyleSheet, TouchableOpacity, Dimensions, Platform } from "react-native"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import type { ThemedNumpadProps } from "@/types/types"



// Create the component with ArkType
export function ThemedNumpad({ onNumberPress, onDelete, onClear, buttonSize: customButtonSize, style }: ThemedNumpadProps) {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    const { width } = Dimensions.get("window")
    const buttonSize = customButtonSize || Math.min(width / 4 - 20, 80)

    const renderNumpadButton = (num: string) => {
        return (
            <TouchableOpacity
                style={[
                    styles.numpadButton,
                    {
                        width: buttonSize,
                        height: buttonSize,
                        backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                        borderColor: isDark ? Colors.dark.border : Colors.light.border,
                    },
                ]}
                onPress={() => onNumberPress(num)}
                activeOpacity={0.7}
            >
                <ThemedText style={styles.numpadButtonText}>{num}</ThemedText>
            </TouchableOpacity>
        )
    }

    return (
        <ThemedView style={[styles.numpadContainer, style]}>
            <ThemedView style={styles.numpadRow}>
                {renderNumpadButton("1")}
                {renderNumpadButton("2")}
                {renderNumpadButton("3")}
            </ThemedView>
            <ThemedView style={styles.numpadRow}>
                {renderNumpadButton("4")}
                {renderNumpadButton("5")}
                {renderNumpadButton("6")}
            </ThemedView>
            <ThemedView style={styles.numpadRow}>
                {renderNumpadButton("7")}
                {renderNumpadButton("8")}
                {renderNumpadButton("9")}
            </ThemedView>
            <ThemedView style={styles.numpadRow}>
                <TouchableOpacity
                    style={[
                        styles.numpadButton,
                        {
                            width: buttonSize,
                            height: buttonSize,
                            backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                            borderColor: isDark ? Colors.dark.border : Colors.light.border,
                        },
                    ]}
                    onPress={onClear}
                    activeOpacity={0.7}
                >
                    <ThemedText style={[styles.numpadButtonText, { color: isDark ? "#ff6b6b" : "#d32f2f" }]}>C</ThemedText>
                </TouchableOpacity>
                {renderNumpadButton("0")}
                <TouchableOpacity
                    style={[
                        styles.numpadButton,
                        {
                            width: buttonSize,
                            height: buttonSize,
                            backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                            borderColor: isDark ? Colors.dark.border : Colors.light.border,
                        },
                    ]}
                    onPress={onDelete}
                    activeOpacity={0.7}
                >
                    <ThemedText style={styles.numpadButtonText}>⌫</ThemedText>
                </TouchableOpacity>
            </ThemedView>
        </ThemedView>
    )
}

const styles = StyleSheet.create({
    numpadContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    numpadRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 12,
    },
    numpadButton: {
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
        margin: 6,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 1.5,
            },
            android: {
                elevation: 2,
            },
            web: {
                boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.2)",
            },
        }),
    },
    numpadButtonText: {
        fontSize: 24,
        fontWeight: "500",
    },
})
