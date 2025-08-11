// lib/auth-client.ts
import { createAuthClient } from 'better-auth/react';

// Use same-origin relative paths so cookies are set on your app domain
export const authClient = createAuthClient();
