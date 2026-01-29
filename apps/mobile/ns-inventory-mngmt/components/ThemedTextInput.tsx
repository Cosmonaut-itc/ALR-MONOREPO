import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import type { ThemedTextInputProps } from "@/types/types"
import { TextInput as RNTextInput, StyleSheet, type TextInputProps, View } from "react-native"

export function TextInput({
    style,
    lightColor,
    darkColor,
    containerStyle,
    ...otherProps
}: ThemedTextInputProps & TextInputProps) {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    const textColor = isDark ? darkColor || Colors.dark.text : lightColor || Colors.light.text
    const placeholderTextColor = isDark ? Colors.dark.placeholder : Colors.light.placeholder
    const backgroundColor = isDark ? Colors.dark.surface : Colors.light.surface
    const borderColor = isDark ? Colors.dark.border : Colors.light.border

    return (
        <View style={[styles.container, { backgroundColor, borderColor }, containerStyle]}>
            <RNTextInput
                style={[
                    styles.input,
                    { color: textColor },
                    style
                ]}
                placeholderTextColor={placeholderTextColor}
                {...otherProps}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 16,
    },
    input: {
        fontSize: 16,
        width: "100%",
    },
})