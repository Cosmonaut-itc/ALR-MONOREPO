import { TextInput as RNTextInput, type TextInputProps, StyleSheet } from "react-native"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { useFieldContext } from "@/hooks/form-context"

export type ThemedTextInputProps = TextInputProps & {
	lightColor?: string
	darkColor?: string
}

export function TextInput({ style, lightColor, darkColor, ...otherProps }: ThemedTextInputProps) {
	const field = useFieldContext<string>()
	const colorScheme = useColorScheme()
	const color = colorScheme === "dark" ? darkColor || Colors.dark.text : lightColor || Colors.light.text


	const placeholderTextColor = colorScheme === "dark" ? Colors.dark.placeholder : Colors.light.placeholder

	return (
		<RNTextInput value={field.state.value} onBlur={field.handleBlur} onChangeText={(text) => field.handleChange(text)}
			style={[{ color }, styles.input, style]} placeholderTextColor={placeholderTextColor} {...otherProps} />
	)
}

const styles = StyleSheet.create({
	input: {
		fontSize: 16,
		width: "100%",
	},
})


export const { useAppForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		TextInput,
	},
	formComponents: {
		ThemedText,
		ThemedButton,
	},
});
