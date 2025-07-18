import { hc } from 'hono/client';
import type { AppType } from '../types/types';

const API_URL = 'http://localhost:3000';

// Create client with any type and cast to our AppType interface
// This bypasses the Hono app constraint while maintaining type safety for API calls
const client = hc<any>(API_URL) as unknown as AppType;

export default client;