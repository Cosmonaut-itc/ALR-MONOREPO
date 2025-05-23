import { useFormContext } from "@/hooks/form-context"
import type { ThemedButtonProps } from "@/types/types"
import { ActivityIndicator, StyleSheet, TouchableOpacity, ViewStyle, useColorScheme } from "react-native"
import { Colors } from "react-native/Libraries/NewAppScreen"
import { ThemedText } from "../ThemedText"

export function ThemedButtonForm({
    onPress,
    title,
    isLoading = false,
    disabled = false,
    variant = "primary",
    size = "medium",
    style,
    loadingText,
}: ThemedButtonProps) {
    const form = useFormContext()
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    // Determine colors based on variant and theme
    const getButtonStyles = () => {
        const baseStyle: ViewStyle = {
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
        }

        // Set padding based on size
        switch (size) {
            case "small":
                baseStyle.padding = 8
                break
            case "large":
                baseStyle.padding = 18
                break
            default: // medium
                baseStyle.padding = 14
                break
        }

        // Set colors and border based on variant
        switch (variant) {
            case "outline":
                baseStyle.backgroundColor = "transparent"
                baseStyle.borderWidth = 1
                baseStyle.borderColor = isDark ? Colors.dark.tint : Colors.light.tint
                break
            case "ghost":
                baseStyle.backgroundColor = "transparent"
                break
            default: // primary
                baseStyle.backgroundColor = isDark ? Colors.dark.tint : Colors.light.tint
                break
        }

        // Add opacity when disabled
        if (disabled || isLoading) {
            baseStyle.opacity = 0.6
        }

        return baseStyle
    }

    // Determine text color based on variant and theme
    const getTextColor = (): string => {
        switch (variant) {
            case "outline":
            case "ghost":
                return isDark ? Colors.dark.tint : Colors.light.tint
            default: // primary
                return "white"
        }
    }

    // Determine text size based on button size
    const getTextSize = (): number => {
        switch (size) {
            case "small":
                return 14
            case "large":
                return 18
            default: // medium
                return 16
        }
    }

    return (
        <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) =>
                <TouchableOpacity
                    style={[getButtonStyles(), style]}
                    onPress={onPress}
                    disabled={disabled || isSubmitting || isLoading}
                    activeOpacity={0.7}
                >
                    {isLoading || isSubmitting && (
                        <>
                            <ActivityIndicator
                                size="small"
                                color={getTextColor()}
                                style={styles.loader}
                            />
                            {loadingText ? (
                                <ThemedText
                                    type="defaultSemiBold"
                                    style={[
                                        { color: getTextColor(), fontSize: getTextSize() },

                                    ]}
                                >
                                    {loadingText}
                                </ThemedText>
                            ) : null}
                        </>
                    )}

                    {!isLoading || !isSubmitting && (
                        <ThemedText
                            type="defaultSemiBold"
                            style={[
                                { color: getTextColor(), fontSize: getTextSize() },

                            ]}
                        >
                            {title}
                        </ThemedText>
                    )}
                </TouchableOpacity>
            }
        </form.Subscribe>
    )
}

const styles = StyleSheet.create({
    loader: {
        marginRight: 8,
    },
})