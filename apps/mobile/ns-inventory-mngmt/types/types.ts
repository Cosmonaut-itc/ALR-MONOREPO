import { Translations } from "@/constants/Translations";
//types.ts
import { type as t } from "arktype";

//Constants
const loginTranslations = Translations.login;
//Form Schema and types

// Login form schema and types
export const LoginFormSchema = t({
	email: t("string.email").describe(loginTranslations.emailError),
	password: t("string >= 8").describe(loginTranslations.passwordError),
});
export type LoginForm = typeof LoginFormSchema.infer;

//Components types and its location in the project
//Form Components
//Error Message Component
export const ThemedFormErrorSeverityArk = t.enumerated("error", "warning", "info");
export type ThemedFormErrorSeverity = typeof ThemedFormErrorSeverityArk.infer;

export const ThemedFormErrorPropsArk = t({
	message: "string?", // Corresponds to: string | null | undefined
	visible: "boolean?", // Corresponds to: boolean | undefined
	showIcon: "boolean? ", // Corresponds to: boolean | undefined
	testID: "string?", // Corresponds to: string | undefined
	severity: ThemedFormErrorSeverityArk, // Corresponds to: "error" | "warning" | "info" | undefined
});

export type ThemedFormErrorProps = typeof ThemedFormErrorPropsArk.infer;
