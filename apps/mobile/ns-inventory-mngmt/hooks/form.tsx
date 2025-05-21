import { ThemedText } from "@/components/ThemedText";
import { ThemedButtonForm } from "@/components/form/Button";
import { TextInputForm } from "@/components/form/TextInput";
import { createFormHook } from "@tanstack/react-form";
import { fieldContext, formContext } from "./form-context";

export const { useAppForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		TextInputForm,
		ThemedButtonForm,
	},
	formComponents: {
		ThemedText,
	},
});
