import { StyleSheet, TouchableOpacity, Platform } from "react-native"
import { router } from "expo-router"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { ArrowLeft } from "lucide-react-native"

interface ThemedHeaderProps {
    title: string
    showBackButton?: boolean
    onBackPress?: () => void
}

export function ThemedHeader({ title, showBackButton = true, onBackPress }: ThemedHeaderProps) {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"

    const handleBackPress = () => {
        if (onBackPress) {
            onBackPress()
        } else {
            router.back()
        }
    }

    return (
        <ThemedView style={styles.header}>
            {showBackButton ? (
                <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                    <ArrowLeft size={20} color={isDark ? Colors.dark.tint : Colors.light.tint} />
                    <ThemedText style={[styles.backText, { color: isDark ? Colors.dark.tint : Colors.light.tint }]}>
                        {showBackButton ? "Atrás" : ""}
                    </ThemedText>
                </TouchableOpacity>
            ) : (
                <ThemedView style={styles.placeholder} />
            )}
            <ThemedText type="title" style={styles.title}>
                {title}
            </ThemedText>
            <ThemedView style={styles.placeholder} />
        </ThemedView>
    )
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        paddingTop: Platform.OS === "ios" ? 50 : 16,
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        padding: 8,
    },
    backText: {
        marginLeft: 4,
        fontSize: 16,
    },
    title: {
        fontSize: 20,
        textAlign: "center",
    },
    placeholder: {
        width: 50,
    },
}) 