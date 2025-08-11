'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

interface AuthGuardProps {
	children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
	const router = useRouter();
	const { isAuthenticated, isLoading } = useAuthStore();

	useEffect(() => {
		if (!(isLoading || isAuthenticated)) {
			router.push('/login');
		}
	}, [isAuthenticated, isLoading, router]);

	// Show loading or redirect while checking auth
	if (isLoading || !isAuthenticated) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#151718]">
				<div className="text-center">
					<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#0a7ea4] border-t-transparent" />
					<p className="text-[#687076] dark:text-[#9BA1A6]">
						Verificando autenticación...
					</p>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
