/**
 * Standard API response structure for consistent client-server communication
 * This interface ensures all API responses follow the same format
 */
export interface ApiResponse<T = unknown> {
	/** Indicates if the request was successful */
	success: boolean;
	/** Response data payload */
	data?: T;
	/** Error message when success is false */
	message?: string;
	/** Additional metadata for pagination, etc. */
	meta?: unknown[];
}

/**
 * Helper function to log detailed error information
 */
export function logErrorDetails(error: unknown, method: string, path: string): void {
	// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
	console.error('\n🚨 API ERROR DETAILS:');
	// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
	console.error('📍 Route:', method, path);
	// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
	console.error('🕐 Timestamp:', new Date().toISOString());

	if (error instanceof Error) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error('❌ Error Name:', error.name);
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error('💬 Error Message:', error.message);
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error('📚 Stack Trace:');
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error(error.stack);
	} else {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error('🔍 Raw Error:', error);
	}
	// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
	console.error('🔚 END ERROR DETAILS\n');
}

/**
 * Helper function to handle database errors with specific patterns
 */
export function handleDatabaseError(
	error: Error,
): { response: ApiResponse; status: number } | null {
	const errorMessage = error.message.toLowerCase();

	// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging database error patterns
	console.error('🔍 Database Error Analysis:', {
		message: errorMessage,
		name: error.name,
		fullMessage: error.message,
	});

	if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error('🗃️ Database: Duplicate key violation');
		return {
			response: {
				success: false,
				message: 'Duplicate record - resource already exists',
			},
			status: 409,
		};
	}

	// Enhanced foreign key constraint detection for both direct PostgreSQL and Drizzle errors
	const isForeignKeyError =
		errorMessage.includes('foreign key') ||
		errorMessage.includes('foreign key constraint') ||
		errorMessage.includes('violates foreign key') ||
		errorMessage.includes('still referenced') ||
		(errorMessage.includes('constraint') && errorMessage.includes('violates')) ||
		errorMessage.includes('referenced') ||
		errorMessage.includes('restrict') ||
		errorMessage.includes('23503') || // PostgreSQL foreign key violation code
		errorMessage.includes('_fk'); // Foreign key constraint naming pattern

	if (isForeignKeyError) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error('🔗 Database: Foreign key constraint violation');
		return {
			response: {
				success: false,
				message: 'Cannot delete record because it is referenced by other records',
			},
			status: 409, // Changed to 409 for consistency with delete operations
		};
	}

	if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
		// biome-ignore lint/suspicious/noConsole: Error logging is essential for debugging API issues
		console.error('🔌 Database: Connection issue');
		return {
			response: {
				success: false,
				message: 'Database connection error',
			},
			status: 503,
		};
	}

	return null;
}
