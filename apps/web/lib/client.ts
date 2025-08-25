import 'client-only';
import { hc } from 'hono/client';
import type { AppType } from 'ns-inventory-api-types/dist/src';

// Use a relative base on the client so cookies and Next.js rewrites work seamlessly
export const client = hc<AppType>('');
