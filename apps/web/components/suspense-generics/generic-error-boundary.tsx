'use client';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorFallbackProps {
	error: Error;
	resetErrorBoundary: () => void;
	subtitle?: string;
}

export function GenericErrorBoundary({
	error,
	resetErrorBoundary,
	subtitle = 'An error occurred while loading this page.',
}: ErrorFallbackProps) {
	return (
		<div className="container mx-auto mt-4 flex flex-col items-center justify-center space-y-4 text-center">
			<AlertCircle className="h-16 w-16 text-red-500" />
			<h2 className="font-bold text-2xl">Oops! Algo salio mal</h2>
			<p className="text-gray-600">{subtitle}</p>
			<p className="text-gray-500 text-sm">{error.message}</p>
			<Button onClick={resetErrorBoundary} variant="outline">
				Intenta de nuevo
			</Button>
		</div>
	);
}
