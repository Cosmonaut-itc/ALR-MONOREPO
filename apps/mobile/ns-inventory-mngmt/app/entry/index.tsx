"use client"

import { StyleSheet, Platform } from "react-native"
import { StatusBar } from "expo-status-bar"
import { router } from "expo-router"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { ThemedButton } from "@/components/ThemedButton"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { ThemedNumpad } from "@/components/ui/ThemedNumpad"
import { useNumpadStore } from "@/app/stores/baseUserStores"


export default function NumpadScreen() {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"
    const { value: storedValue, setValue, deleteValue, clearValue } = useNumpadStore()


    const handleSubmit = () => {
        // Handle submission logic here
        console.log("Submitted value:", storedValue)
        // Navigate back or to another screen
        router.push('/entry/baseUser')
    }

    return (

        <ThemedView style={styles.container}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <ThemedView style={styles.inputContainer}>
                <ThemedView
                    style={[
                        styles.input,
                        {
                            borderColor: isDark ? Colors.dark.border : Colors.light.border,
                            backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                        },
                    ]}
                >
                    <ThemedText style={styles.inputText}>{storedValue}</ThemedText>
                </ThemedView>
            </ThemedView>

            <ThemedNumpad
                onNumberPress={setValue}
                onDelete={deleteValue}
                onClear={clearValue}
                style={styles.numpad}
            />

            <ThemedView style={styles.buttonContainer}>
                <ThemedButton title="Submit" onPress={handleSubmit} disabled={storedValue.length === 0} style={styles.submitButton} variant={"primary"} size={"medium"} />
            </ThemedView>
        </ThemedView>

    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: "center",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 24,
        paddingTop: Platform.OS === "ios" ? 40 : 16,
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 24,
        textAlign: "center",
    },
    placeholder: {
        width: 50,
    },
    inputContainer: {
        alignItems: "center",
        marginBottom: 32,
    },
    input: {
        width: "100%",
        maxWidth: 400,
        height: 60,
        borderWidth: 1,
        borderRadius: 8,
        padding: 14,
        justifyContent: "center",
        alignItems: "center",
    },
    inputText: {
        fontSize: 28,
        letterSpacing: 2,
        fontWeight: "500",
        textAlign: "center",
        paddingTop: 6,
    },
    numpad: {
        marginBottom: 24,
    },
    buttonContainer: {
        alignItems: "center",
    },
    submitButton: {
        width: "100%",
        maxWidth: 400,
    },
})
