// lib/auth.ts
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

/**
 * Get the API URL from environment variables or use a default
 * 
 * For Tailscale (VPN) networks:
 * - Ensure your device has Tailscale installed and connected
 * - The device must be on the same Tailnet as the development machine
 * - Verify the API server is listening on 0.0.0.0:3000 (not just localhost)
 * - Check Tailscale ACLs if connection fails
 * 
 * For local network:
 * - Ensure device and computer are on the same Wi-Fi network
 * - Find your local IP with: ipconfig (Windows) or ifconfig (Mac/Linux)
 * - The API server must be listening on 0.0.0.0, not just localhost
 */
/**
 * API URL for Better Auth client
 * Can be overridden by EXPO_PUBLIC_API_URL environment variable
 * 
 * IMPORTANT: Use your Tailscale IP (e.g., 100.110.215.102) or local network IP
 * DO NOT use localhost as it won't work from mobile devices
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://100.110.215.102:3000";

// Log the API URL in development for debugging
if (__DEV__) {
	console.log('[Auth Client] API URL:', API_URL);
}

/**
 * Better Auth client configuration for Expo
 * 
 * The fetchOptions are configured to work with React Native's fetch implementation
 * and Tailscale networks. Credentials are set to 'omit' as Better Auth handles
 * cookies via SecureStore in Expo.
 */
export const authClient = createAuthClient({
	baseURL: API_URL, // Use http, not https for local development
	fetchOptions: {
		// React Native fetch handles credentials differently
		// We'll let better-auth handle cookies via SecureStore
		credentials: 'omit', // Better Auth handles cookies via SecureStore
		// Note: Better Auth automatically sets Content-Type and other headers
		// Only set Accept header, let Better Auth handle Content-Type
		headers: {
			'Accept': 'application/json',
		},
		// Note: React Native's fetch doesn't support timeout directly
		// Better-auth may handle timeout internally
	},
	plugins: [
		expoClient({
			scheme: "nsinventorymngmt",
			storagePrefix: "nsinventorymngmt",
			storage: SecureStore,
		})
	],
	onError: (error: unknown) => {
		console.error("[Auth Client] Error:", error);
		// Log additional error details for debugging
		if (error instanceof Error) {
			console.error("[Auth Client] Error message:", error.message);
			console.error("[Auth Client] Error stack:", error.stack);
		}
	},
	onSuccess: (response: unknown) => {
		if (__DEV__) {
			console.log("[Auth Client] Success:", response);
		}
	},
});

/**
 * Test connectivity to the API server
 * Useful for debugging network issues
 * @returns Promise<boolean> - true if connection is successful
 */
export const testApiConnectivity = async (): Promise<boolean> => {
	try {
		const testUrl = `${API_URL}/health`;
		console.log('[Connectivity Test] Testing connection to:', testUrl);
		
		const response = await fetch(testUrl, {
			method: 'GET',
			headers: {
				'Accept': 'application/json',
			},
			// React Native fetch doesn't support timeout directly
			// but we can use AbortController for timeout
		});
		
		console.log('[Connectivity Test] Response status:', response.status);
		console.log('[Connectivity Test] Response ok:', response.ok);
		
		return response.ok;
	} catch (error) {
		console.error('[Connectivity Test] Failed:', error);
		if (error instanceof Error) {
			console.error('[Connectivity Test] Error message:', error.message);
			console.error('[Connectivity Test] Error name:', error.name);
		}
		return false;
	}
};