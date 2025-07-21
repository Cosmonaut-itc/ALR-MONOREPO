import client from "./hono-client";
import { validateProductsResponse, type ApiResponse, type DataItemArticulosType, type ProductStockItem } from "../types/types";

/**
 * Fetches all products from the API
 * @returns Promise containing the product data or throws an error
 */
export const getProducts = async (): Promise<DataItemArticulosType[]> => {
    try {
        // Make the API call using the correct Hono RPC client pattern
        const response = await client.api.products.all.$get();
        
        // Check if the response is successful
        if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status}`);
        }
        
        // Parse the JSON response
        const data: ApiResponse<DataItemArticulosType[]> = await response.json();
        
        // Validate the response structure at runtime using ArkType
        const validatedData = validateProductsResponse(data);
        
        // Check if the API call was successful
        if (!validatedData.success) {
            throw new Error('API returned unsuccessful response');
        }
        
        // Return the product data
        return validatedData.data || [];
        
    } catch (error) {
        // Log the error for debugging
        console.error('Error fetching products:', error);
        
        // Re-throw with a more user-friendly message
        throw new Error(
            error instanceof Error 
                ? `Failed to fetch products: ${error.message}`
                : 'Failed to fetch products: Unknown error'
        );
    }
};

export const getProductStock = async (): Promise<ProductStockItem[]> => {
    try {
        const response = await client.api["product-stock"].all.$get();
        if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status}`);
        }
        const data: ApiResponse<ProductStockItem[]> = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Error fetching product stock:', error);
        throw new Error(
            error instanceof Error 
                ? `Failed to fetch product stock: ${error.message}`
                : 'Failed to fetch product stock: Unknown error'
        );
    }
}

/**
 * Checks the health of the database connection
 * @returns Promise containing the health status
 */
export const checkDatabaseHealth = async (): Promise<ApiResponse> => {
    try {
        const response = await client.db.health.$get();
        
        if (!response.ok) {
            throw new Error(`Health check failed with status: ${response.status}`);
        }
        
        const data: ApiResponse = await response.json();
        return data;
        
    } catch (error) {
        console.error('Error checking database health:', error);
        throw new Error(
            error instanceof Error 
                ? `Database health check failed: ${error.message}`
                : 'Database health check failed: Unknown error'
        );
    }
};