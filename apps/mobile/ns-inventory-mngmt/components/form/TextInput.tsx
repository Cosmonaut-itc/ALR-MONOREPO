import { Colors } from "@/constants/Colors";
import { useFieldContext } from "@/hooks/form-context";
import { useColorScheme } from "@/hooks/useColorScheme";
import { ThemedTextInputProps } from "@/types/types";
import { TextInput as RNTextInput, StyleSheet, type TextInputProps, View } from "react-native";
import { ThemedView } from "../ThemedView";
import { ThemedFormError } from "./ErrorMessage";

export function TextInputForm({ style, lightColor, darkColor, ...otherProps }: ThemedTextInputProps & TextInputProps) {
    const field = useFieldContext<string>()
    const colorScheme = useColorScheme()
    const color = colorScheme === "dark" ? darkColor || Colors.dark.text : lightColor || Colors.light.text

    const error = field.state.meta.errors[0]

    console.log(error)

    const placeholderTextColor = colorScheme === "dark" ? Colors.dark.placeholder : Colors.light.placeholder

    return (
        <>
            <View style={stylesInput.container}>
                <ThemedView
                    style={[
                        stylesInput.inputView,
                        {
                            borderColor: colorScheme === "dark" ? Colors.dark.border : Colors.light.border,
                            backgroundColor: colorScheme === "dark" ? Colors.dark.surface : Colors.light.surface,
                        },
                    ]}
                >
                    <RNTextInput
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChangeText={(text) => field.handleChange(text)}
                        style={[{ color }, stylesInput.input, style]}
                        placeholderTextColor={placeholderTextColor}
                        {...otherProps}
                    />
                </ThemedView>
            </View>
            <View style={stylesInput.container}>
                {/* Conditionally render ThemedFormError below the input */}
                <ThemedFormError showIcon severity="error" message={error ? error.expected : ''} visible={!!error} />
            </View>
        </>
    )
}

const stylesInput = StyleSheet.create({
    container: {
        width: "100%",
        // Add some margin if you want space between this field and the next
        // marginBottom: 16,
    },
    input: {
        fontSize: 16,
        width: "100%",
    },
    inputView: {

        borderWidth: 1,
        borderRadius: 8,
        height: 50,
        paddingHorizontal: 12,
        justifyContent: "center",

    }
})