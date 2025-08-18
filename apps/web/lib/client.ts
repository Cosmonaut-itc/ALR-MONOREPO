import { hc } from 'hono/client';
import type { AppType } from '../node_modules/ns-inventory-api-types/dist/src/index';

export const client = hc<AppType>('');
