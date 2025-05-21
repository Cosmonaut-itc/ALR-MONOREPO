"use client"

import { useState } from "react"
import { StyleSheet, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView } from "react-native"
import { useRouter } from "expo-router"

import { ThemedView } from "@/components/ThemedView"
import { ThemedText } from "@/components/ThemedText"
import { TextInput } from "@/components/ThemedTextInput"
import { Colors } from "@/constants/Colors"
import { Translations } from "@/constants/Translations"
import { useColorScheme } from "@/hooks/useColorScheme"
import { ThemedButton } from "@/components/ThemedButton"
import { useAppForm } from "@/hooks/form"
import { LoginFormSchema } from "@/types/types"

export default function Login() {
    const formLogin = useAppForm({
        defaultValues: {
            email: "",
            password: "",
        },
        validators: {
            onChange: LoginFormSchema,
        }
    })
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const colorScheme = useColorScheme()
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
            <form>
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
                                <ThemedView
                                    style={[
                                        styles.input,
                                        {
                                            borderColor: colorScheme === "dark" ? Colors.dark.border : Colors.light.border,
                                            backgroundColor: colorScheme === "dark" ? Colors.dark.surface : Colors.light.surface,
                                        },
                                    ]}
                                >
                                    <TextInput
                                        placeholder={t.emailPlaceholder}
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </ThemedView>
                            </ThemedView>

                            <ThemedView style={styles.inputContainer}>
                                <ThemedText type="defaultSemiBold" style={styles.label}>
                                    {t.passwordLabel}
                                </ThemedText>
                                <ThemedView
                                    style={[
                                        styles.input,
                                        {
                                            borderColor: colorScheme === "dark" ? Colors.dark.border : Colors.light.border,
                                            backgroundColor: colorScheme === "dark" ? Colors.dark.surface : Colors.light.surface,
                                        },
                                    ]}
                                >
                                    <TextInput
                                        placeholder={t.passwordPlaceholder}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                    />
                                </ThemedView>
                            </ThemedView>

                            <ThemedButton
                                title="Login"
                                onPress={handleLogin}
                                isLoading={isLoading}
                                loadingText="Logging in..."
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
            </form>
        </KeyboardAvoidingView>
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
