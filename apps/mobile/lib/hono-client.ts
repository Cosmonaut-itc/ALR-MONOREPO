import { hc } from 'hono/client';
import type { AppType } from '@ns-inventory/api-contract';
import { authClient } from './auth';

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
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://100.110.215.102:3000';

/**
 * Custom fetch function that includes authentication cookies from better-auth
 * This ensures all requests made through the Hono client are authenticated
 * 
 * According to better-auth-expo documentation, we need to:
 * 1. Get cookies using authClient.getCookie()
 * 2. Include them in the Cookie header
 * 3. Set credentials: "omit" to prevent conflicts with manually set cookies
 * 
 * @param input - The URL or Request object
 * @param init - Optional fetch init options
 * @returns Promise<Response>
 */
const authenticatedFetch = async (
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> => {
	// Get session cookies from better-auth client
	const cookies = authClient.getCookie();
	
	// Merge existing headers with cookies
	const headers = new Headers(init?.headers);
	
	// Add cookies to headers if available
	if (cookies) {
		headers.set('Cookie', cookies);
	}
	
	// Create new init object with updated headers and credentials
	const newInit: RequestInit = {
		...init,
		headers,
		// Set credentials to "omit" as recommended by better-auth-expo docs
		// This prevents conflicts with manually set cookies
		credentials: 'omit',
	};
	
	// Use the global fetch (React Native's fetch)
	return fetch(input, newInit);
};

/**
 * Create Hono RPC client with type safety and authentication support
 * This bypasses the Hono app constraint while maintaining type safety for API calls
 * 
 * The Hono client uses a custom fetch function that automatically includes
 * authentication cookies from better-auth for all requests.
 * 
 * For Tailscale connections, ensure your device can reach the Tailscale IP.
 */
const client = hc<AppType>(API_URL, {
	fetch: authenticatedFetch,
});

// Log the API URL in development for debugging (will be stripped in production)
if (__DEV__) {
	console.log('[Hono Client] API URL:', API_URL);
}

export default client;
