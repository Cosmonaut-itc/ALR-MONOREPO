// lib/auth.ts
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
    baseURL: process.env.EXPO_PUBLIC_API_URL || "http://100.89.145.51:3000", // Use http, not https
    plugins: [
        expoClient({
            scheme: "nsinventorymngmt",
            storagePrefix: "nsinventorymngmt",
            storage: SecureStore,
        })
    ],   
    onError: (error: any) => {
        console.error("Auth Client Error:", error);
    },
    onSuccess: (response: any) => { 
        console.log("Auth Client Success:", response);
    },
});