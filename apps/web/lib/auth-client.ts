// lib/auth-client.ts

import { customSessionClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import type { auth } from 'ns-inventory-api-types/dist/packages/api-types/src';

// Use same-origin relative paths so cookies are set on your app domain
export const authClient = createAuthClient({
	plugins: [customSessionClient<typeof auth>()],
});
