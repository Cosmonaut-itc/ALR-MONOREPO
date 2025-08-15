# @ns-inventory/api-types

TypeScript types for NS Inventory Management API, auto-generated from the Hono server's AppType.

## Installation

```bash
npm install @ns-inventory/api-types hono
```

## Usage

### Basic Setup with Hono RPC Client

```typescript
import { hc } from 'hono/client';
import type { AppType } from '@ns-inventory/api-types';

// Create a typed client
const client = hc<AppType>('http://localhost:3000');

// Now you have full type safety!
const response = await client.api.auth['product-stock'].all.$get();
const data = await response.json(); // Fully typed response
```

### Available Types

```typescript
import type {
  AppType,
  ApiResponse,
  ProductStock,
  ProductStockWithEmployee,
  Employee,
  WithdrawOrder,
  WithdrawOrderDetails,
  CreateWithdrawOrderRequest,
  UpdateWithdrawOrderRequest,
} from '@ns-inventory/api-types';
```

### Example Usage

#### Fetching Product Stock

```typescript
const fetchProductStock = async () => {
  const response = await client.api.auth['product-stock'].all.$get();
  const data: ApiResponse<ProductStock[]> = await response.json();
  
  if (data.success) {
    return data.data; // ProductStock[]
  }
  throw new Error(data.message);
};
```

#### Fetching Product Stock with Employee

```typescript
const fetchProductStockWithEmployee = async () => {
  const response = await client.api.auth['product-stock']['with-employee'].$get();
  const data: ApiResponse<ProductStockWithEmployee[]> = await response.json();
  
  return data.data?.map(item => ({
    productStock: item.product_stock,
    employee: item.employee
  })) || [];
};
```

#### Creating a Withdraw Order

```typescript
const createWithdrawOrder = async (orderData: CreateWithdrawOrderRequest) => {
  const response = await client.api.auth['withdraw-orders'].create.$post({
    json: orderData
  });
  
  const data: ApiResponse<WithdrawOrder> = await response.json();
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return data.data;
};

// Usage
const newOrder = await createWithdrawOrder({
  dateWithdraw: '2024-12-20',
  userId: 'user-123',
  numItems: 3,
  isComplete: false
});
```

#### Querying with Parameters

```typescript
const fetchEmployee = async (userId: string) => {
  const response = await client.api.auth.employee.all.$get({
    query: { userId }
  });
  
  const data: ApiResponse<EmployeeWithPermissions[]> = await response.json();
  return data.data;
};
```

### Error Handling

```typescript
const safeApiCall = async () => {
  try {
    const response = await client.api.auth['product-stock'].all.$get();
    const data = await response.json();
    
    if (!data.success) {
      console.error('API Error:', data.message);
      return null;
    }
    
    return data.data;
  } catch (error) {
    console.error('Network Error:', error);
    return null;
  }
};
```

### With React/Next.js

```typescript
import { useState, useEffect } from 'react';
import { hc } from 'hono/client';
import type { AppType, ProductStock } from '@ns-inventory/api-types';

const client = hc<AppType>(process.env.NEXT_PUBLIC_API_URL!);

export function useProductStock() {
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await client.api.auth['product-stock'].all.$get();
        const data = await response.json();
        
        if (data.success) {
          setProducts(data.data || []);
        } else {
          setError(data.message || 'Failed to fetch products');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return { products, loading, error };
}
```

## Features

- ✅ **Full Type Safety**: Every API endpoint is fully typed
- ✅ **Auto-generated**: Types are automatically extracted from your Hono server
- ✅ **IntelliSense**: Complete autocompletion in your IDE
- ✅ **Request/Response Types**: Input and output types for all endpoints
- ✅ **Error Handling**: Typed error responses
- ✅ **Zod Schemas**: Validation schemas for client-side validation

## Development

This package is automatically generated from the NS Inventory API server. When new routes are added to the server, run:

```bash
npm run publish:types
```

This will automatically:
1. Extract the latest AppType
2. Build the types package
3. Increment the version
4. Publish to npm

## License

MIT
