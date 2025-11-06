// components/generic-boundary-wrapper.tsx
'use memo';
'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { GenericErrorBoundary } from './generic-error-boundary';

interface GenericBoundaryWrapperProps {
	children: React.ReactNode;
	fallbackComponent: React.ReactNode;
	errorSubtitle?: string;
}

export function GenericBoundaryWrapper({
	children,
	fallbackComponent,
	errorSubtitle = 'Ocurrió un error al cargar la página.',
}: GenericBoundaryWrapperProps) {
	return (
		<ErrorBoundary
			FallbackComponent={(props) => (
				<GenericErrorBoundary {...props} subtitle={errorSubtitle} />
			)}
		>
			<Suspense fallback={fallbackComponent}>{children}</Suspense>
		</ErrorBoundary>
	);
}
