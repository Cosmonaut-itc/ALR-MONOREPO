//index.tsx
"use client"

import { useRouter } from "expo-router"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity } from "react-native"
import { ThemedButton } from "@/components/ThemedButton"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { Colors } from "@/constants/Colors"
import { Translations } from "@/constants/Translations"
import { useAppForm } from "@/hooks/form"
import { LoginFormSchema } from "@/types/types"
import { authClient } from "@/lib/auth";
import { useMutation } from "@tanstack/react-query"
import { toast } from 'sonner-native';
import { useRootUserStore } from "@/app/stores/rootUserStore";

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
    const router = useRouter()
    const { setUserData } = useRootUserStore()

    // Get translations for login screen
    const t = Translations.login

    const signInMutation = useMutation({ mutationKey: ["signIn"],
        mutationFn: async (formData: { email: string; password: string; }) => {
            const result = await authClient.signIn.email({
                email: formData.email,
                password: formData.password,
            })

            if (result.error) {
                throw new Error(` Error al inicar sesion - ${result.error.message}`)
            }

            return result
        },
        onSuccess: (data) => {
            // Extract user ID from Better Auth result
            // Better Auth returns Data<T> which wraps the response in a data property
            // Structure: result.data.user.id
            const userId = 
                (data as { data?: { user?: { id?: string } } })?.data?.user?.id ||
                null;

            if (!userId) {
                console.error("Failed to extract user ID from login result:", data);
                toast.error("Error al obtener información del usuario");
                return;
            }

            // Store user data in the root user store
            setUserData(userId, data);

            // Handle success - maybe redirect or show success message
            console.log("Sign in successful:", data);
            router.replace("/entry"); // Redirect to explore page on successful login
        },
        onError: (error) => {
            console.error("Sign up error:", error)
            toast.error(`${error}`) // Show error message to user
            // Handle error - show error message to user
        }
    })

    const handleLogin = () => {
        signInMutation.mutate({
            email: form.state.values.email, 
            password: form.state.values.password,
        })
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
                                isLoading={signInMutation.isPending}
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
