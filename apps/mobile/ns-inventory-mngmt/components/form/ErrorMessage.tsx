"use client"

import { ThemedText } from "@/components/ThemedText"
import { useColorScheme } from "@/hooks/useColorScheme"
import type { ThemedFormErrorProps } from "@/types/types"
import { MotiView } from "moti"
import { StyleSheet, View } from "react-native"


export function ThemedFormError({
    message,
    visible = true,
    showIcon = true,
    testID = "form-error",
    severity = "error",
}: ThemedFormErrorProps) {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    // Get color based on severity and theme
    const getColor = () => {
        switch (severity) {
            case "warning":
                return isDark ? "#ffd166" : "#f57c00"
            case "info":
                return isDark ? "#60a5fa" : "#2196f3"
            case "error":
            default:
                return isDark ? "#ff6b6b" : "#d32f2f"
        }
    }

    const color = getColor()

    // If no message or not visible, render nothing
    if (!message || !visible) {
        return null
    }

    // Get icon based on severity
    const getIcon = () => {
        switch (severity) {
            case "warning":
                return "⚠️"
            case "info":
                return "ℹ️"
            case "error":
            default:
                return "!"
        }
    }

    return (
        <MotiView
            style={[styles.container]}
            testID={testID}
            accessibilityRole="alert"
            from={{
                opacity: 0,
                height: 0,
                marginBottom: 0,
            }}
            animate={{
                opacity: 1,
                height: 20, // Approximate height of the error message
                marginBottom: 8,
            }}
            exit={{
                opacity: 0,
                height: 0,
                marginBottom: 0,
            }}
            transition={{
                type: "timing",
                duration: 200,
            }}
        >
            {/* Icon */}
            {showIcon && (
                <View style={[styles.iconContainer, { backgroundColor: color }]}>
                    <ThemedText style={styles.icon}>{getIcon()}</ThemedText>
                </View>
            )}

            {/* Message */}
            <ThemedText style={[styles.errorText, { color }]}>Por favor, ingrese {message}</ThemedText>
        </MotiView>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        overflow: "hidden",
    },
    iconContainer: {
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 6,
    },
    icon: {
        color: "white",
        fontSize: 12,
        fontWeight: "bold",
        paddingBottom: 24,
    },
    errorText: {
        fontSize: 12,
    },
})
