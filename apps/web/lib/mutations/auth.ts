import { useMutation } from '@tanstack/react-query';
import type { LoginType, SignUpType } from '@/types';
import { authClient } from '../auth-client';

/**
 * Custom React Query mutation hook for logging in a user.
 *
 * This hook should be called inside a client component to obtain the mutation object
 * for performing a login operation. It handles error normalization and throws
 * a descriptive error if the login fails.
 *
 * @returns {ReturnType<typeof useMutation>} The mutation object for login.
 *
 * @example
 * const { mutateAsync, isPending, isSuccess } = useLoginMutation();
 * await mutateAsync({ email: 'user@example.com', password: 'password123' });
 */
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

/**
 * Custom React Query mutation hook for logging out a user.
 *
 * This hook should be called inside a client component to obtain the mutation object
 * for performing a logout operation. It handles error normalization and throws
 * a descriptive error if the logout fails.
 *
 * @returns {ReturnType<typeof useMutation>} The mutation object for logout.
 *
 * @example
 * const { mutateAsync, isPending, isSuccess } = useLogoutMutation();
 * await mutateAsync();
 */
export const useLogoutMutation = () =>
	useMutation({
		mutationKey: ['logout'],
		mutationFn: async () => {
			const response = await authClient.signOut();
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
								: undefined) || 'Error al cerrar sesión';
				throw new Error(message);
			}
			return response;
		},
	});

/**
 * Custom React Query mutation hook for creating a new user (sign-up).
 *
 * Uses Better Auth `signUp.email` on the client.
 */
export const useSignUpMutation = () =>
	useMutation({
		mutationKey: ['signup'],
		mutationFn: async ({ email, password, name }: SignUpType) => {
			const response = await authClient.signUp.email({ email, password, name });
			type MaybeError = {
				ok?: boolean;
				success?: boolean;
				status?: number;
				error?: string | { message?: string };
				errors?: unknown;
				data?: { error?: string | { message?: string } };
			};
			const r = response as unknown as MaybeError;
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
								: undefined) || 'No se pudo crear el usuario';
				throw new Error(message);
			}
			return response;
		},
	});
