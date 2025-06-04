// components/RouteGuard.tsx
import { authClient } from "@/lib/auth"
import { useRouter } from "expo-router"
import { useEffect } from "react"
import { ActivityIndicator, View } from "react-native"

interface RouteGuardProps {
    children: React.ReactNode
    requireAuth?: boolean
    redirectTo?: string
}

export function RouteGuard({
    children,
    requireAuth = true,
    redirectTo = "/"
}: RouteGuardProps) {
    const { data: session, isPending } = authClient.useSession()
    const router = useRouter()

    useEffect(() => {
        if (!isPending) {
            if (requireAuth && !session) {
                router.replace("/")
            } else if (!requireAuth && session) {
                router.replace("/(tabs)")
            }
        }
    }, [session, isPending, requireAuth, redirectTo])

    if (isPending) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        )
    }

    if (requireAuth && !session) {
        return null
    }

    if (!requireAuth && session) {
        return null
    }

    return <>{children}</>
}