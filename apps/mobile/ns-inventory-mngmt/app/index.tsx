"use client"

import { useRouter } from "expo-router"
import { useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity } from "react-native"

import { ThemedButton } from "@/components/ThemedButton"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { Colors } from "@/constants/Colors"
import { Translations } from "@/constants/Translations"
import { useAppForm } from "@/hooks/form"
import { LoginFormSchema } from "@/types/types"

export default function Login() {
    const form = useAppForm({
        defaultValues: {
            email: "",
            password: "",
        },
        validators: {
            onChange: LoginFormSchema,
        }
    })
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    // Get translations for login screen
    const t = Translations.login

    const handleLogin = async () => {
        setIsLoading(true)
        // This would be where you handle authentication
        // For now, we'll just simulate a login
        setTimeout(() => {
            setIsLoading(false)
        }, 1000)
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <form.AppForm>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    <ThemedView style={styles.container}>
                        <ThemedView style={styles.logoContainer}>
                            <ThemedText type="title" style={styles.title}>
                                {t.title}
                            </ThemedText>
                            <ThemedText type="default" style={styles.subtitle}>
                                {t.subtitle}
                            </ThemedText>
                        </ThemedView>
                        <ThemedView style={styles.formContainer}>

                            <ThemedView style={styles.inputContainer}>
                                <ThemedText type="defaultSemiBold" style={styles.label}>
                                    {t.emailLabel}
                                </ThemedText>

                                {/* biome-ignore lint/correctness/noChildrenProp: <explanation> */}
                                <form.AppField name={'email'} children={(field) => {
                                    return (
                                        <>
                                            <field.TextInputForm placeholder={t.emailPlaceholder}
                                                value={field.state.value}
                                                onChangeText={field.handleChange}
                                                keyboardType="email-address"
                                                autoCapitalize="none" />
                                        </>
                                    )
                                }
                                }

                                />


                            </ThemedView>

                            <ThemedView style={styles.inputContainer}>
                                <ThemedText type="defaultSemiBold" style={styles.label}>
                                    {t.passwordLabel}
                                </ThemedText>

                                {/* biome-ignore lint/correctness/noChildrenProp: <explanation> */}
                                <form.AppField name={'password'} children={(field) =>
                                    <field.TextInputForm placeholder={t.passwordPlaceholder}
                                        value={field.state.value}
                                        onChangeText={field.handleChange}
                                        secureTextEntry />
                                }
                                />

                            </ThemedView>
                        
                            <ThemedButton
                                title="Login"
                                onPress={handleLogin}
                                isLoading={isLoading}
                                loadingText="Logging in..."
                                variant="primary"
                                size="medium"
                                style={styles.buttonContainer}
                            />

                            <ThemedView style={styles.forgotPasswordContainer}>
                                <TouchableOpacity>
                                    <ThemedText
                                        type="default"
                                        style={styles.forgotPassword}
                                        lightColor={Colors.light.tint}
                                        darkColor={Colors.dark.tint}
                                    >
                                        {t.forgotPassword}
                                    </ThemedText>
                                </TouchableOpacity>
                            </ThemedView>
                        </ThemedView>
                    </ThemedView>
                </ScrollView>
            </form.AppForm>
        </KeyboardAvoidingView >
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: "center",
    },
    logoContainer: {
        alignItems: "center",
        marginBottom: 40,
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 16,
        borderRadius: 60,
    },
    title: {
        fontSize: 28,
        marginBottom: 8,
        textAlign: "center",
    },
    subtitle: {
        textAlign: "center",
        marginBottom: 24,
    },
    formContainer: {
        width: "100%",
        maxWidth: 400,
        alignSelf: "center",
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        height: 50,
        paddingHorizontal: 12,
        justifyContent: "center",
    },
    button: {
        height: 50,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,
    },
    buttonContainer: {
        marginTop: 10,
    },
    buttonText: {
        fontSize: 16,
    },
    forgotPasswordContainer: {
        alignItems: "center",
        marginTop: 20,
    },
    forgotPassword: {
        fontSize: 14,
    },
})
