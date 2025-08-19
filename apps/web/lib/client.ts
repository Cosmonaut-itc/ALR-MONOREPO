import 'client-only';
import { hc } from 'hono/client';
import type { AppType } from '../node_modules/ns-inventory-api-types/dist/src/index';

// Use absolute base on the client so Hono can construct a valid URL
const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
export const client = hc<AppType>(base);
