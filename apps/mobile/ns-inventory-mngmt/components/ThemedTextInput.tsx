import { TextInput as RNTextInput, StyleSheet, type TextInputProps } from "react-native"

import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"

export type ThemedTextInputProps = TextInputProps & {
    lightColor?: string
    darkColor?: string
}

export function TextInput({ style, lightColor, darkColor, ...otherProps }: ThemedTextInputProps) {
    const colorScheme = useColorScheme()
    const color = colorScheme === "dark" ? darkColor || Colors.dark.text : lightColor || Colors.light.text

    const placeholderTextColor = colorScheme === "dark" ? Colors.dark.placeholder : Colors.light.placeholder

    return (
        <RNTextInput style={[{ color }, styles.input, style]} placeholderTextColor={placeholderTextColor} {...otherProps} />
    )
}

const styles = StyleSheet.create({
    input: {
        fontSize: 16,
        width: "100%",
    },
})