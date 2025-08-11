import { useMutation } from '@tanstack/react-query';
import type { LoginType } from '@/types';
import { authClient } from '../auth-client';

// Call this inside a client component to get the mutation object
export const useLoginMutation = () =>
	useMutation({
		mutationKey: ['login'],
		mutationFn: async ({ email, password }: LoginType) => {
			const response = await authClient.signIn.email({ email, password });
			type MaybeError = {
				ok?: boolean;
				success?: boolean;
				status?: number;
				error?: string | { message?: string };
				errors?: unknown;
				data?: { error?: string | { message?: string } };
			};
			const r = response as unknown as MaybeError;
			// Normalize failures returned inside a successful HTTP response
			const hasError =
				(r?.error as string | { message?: string } | undefined) ||
				(r?.errors as unknown) ||
				(r?.data?.error as string | { message?: string } | undefined);
			const notOk =
				r?.ok === false ||
				r?.success === false ||
				(typeof r?.status === 'number' && r.status >= 400);
			if (hasError || notOk) {
				const message =
					typeof hasError === 'string'
						? hasError
						: (hasError && typeof hasError === 'object' && 'message' in hasError
								? (hasError as { message?: string }).message
								: undefined) || 'Error al iniciar sesión';
				throw new Error(message);
			}
			return response;
		},
	});
