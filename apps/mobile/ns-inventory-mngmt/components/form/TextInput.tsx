import { Colors } from "@/constants/Colors";
import { useFieldContext } from "@/hooks/form-context";
import { useColorScheme } from "@/hooks/useColorScheme";
import { TextInput as RNTextInput, StyleSheet, type TextInputProps } from "react-native";

type ThemedTextInputProps = TextInputProps & {
    lightColor?: string
    darkColor?: string
}


export function TextInputForm({ style, lightColor, darkColor, ...otherProps }: ThemedTextInputProps) {
    const field = useFieldContext<string>()
    const colorScheme = useColorScheme()
    const color = colorScheme === "dark" ? darkColor || Colors.dark.text : lightColor || Colors.light.text


    const placeholderTextColor = colorScheme === "dark" ? Colors.dark.placeholder : Colors.light.placeholder

    return (
        <RNTextInput value={field.state.value} onBlur={field.handleBlur} onChangeText={(text) => field.handleChange(text)}
            style={[{ color }, stylesInput.input, style]} placeholderTextColor={placeholderTextColor} {...otherProps} />
    )
}

const stylesInput = StyleSheet.create({
    input: {
        fontSize: 16,
        width: "100%",
    },
})