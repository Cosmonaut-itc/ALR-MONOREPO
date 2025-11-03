import { hc } from 'hono/client';
import type { AppType } from 'ns-inventory-api-types/dist/packages/api-types/src';

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
 * Create Hono RPC client with type safety
 * This bypasses the Hono app constraint while maintaining type safety for API calls
 * 
 * The Hono client uses the global fetch API which React Native provides.
 * For Tailscale connections, ensure your device can reach the Tailscale IP.
 */
const client = hc<AppType>(API_URL);

// Log the API URL in development for debugging (will be stripped in production)
if (__DEV__) {
	console.log('[Hono Client] API URL:', API_URL);
}

export default client;