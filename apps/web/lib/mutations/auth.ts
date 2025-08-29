import { useMutation } from '@tanstack/react-query';
import type { LoginType, SignUpType } from '@/types';
import type { ExtendedUser, SignUpResponse } from '@/types/auth';
import { authClient } from '../auth-client';

/**
 * Minimal shape we care about from Better Auth responses to detect errors.
 */
type MaybeError = {
	ok?: boolean;
	success?: boolean;
	status?: number;
	error?: string | { message?: string } | null;
	errors?: unknown;
	data?: { error?: string | { message?: string } | null } | null;
};

/**
 * Returns a normalized error message if the response indicates a failure; otherwise null.
 */
const getAuthErrorMessage = (
	response: unknown,
	defaultMessage = 'Error al iniciar sesión',
): string | null => {
	const r = response as MaybeError | null | undefined;
	if (!r) {
		return null;
	}

	const extractMessage = (err: unknown): string | null => {
		if (!err) {
			return null;
		}
		if (typeof err === 'string') {
			return err;
		}
		if (typeof err === 'object' && 'message' in (err as Record<string, unknown>)) {
			const msg = (err as { message?: unknown }).message;
			if (typeof msg === 'string') {
				return msg;
			}
		}
		return null;
	};

	const messageFromError = extractMessage(r.error);
	const messageFromDataError = extractMessage(r.data?.error);
	const message = messageFromError || messageFromDataError;
	const notOk = r.ok === false || r.success === false;
	const httpFailed = typeof r.status === 'number' && r.status >= 400;
	const hasErrorsBag = Boolean(r.errors);

	if (message || notOk || httpFailed || hasErrorsBag) {
		return message ?? defaultMessage;
	}
	return null;
};

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
	useMutation<ExtendedUser, Error, LoginType>({
		mutationKey: ['login'],
		mutationFn: async ({ email, password }: LoginType): Promise<ExtendedUser> => {
			const response = await authClient.signIn.email({ email, password });
			const message = getAuthErrorMessage(response);
			if (message) {
				throw new Error(message);
			}
			// After successful sign-in, resolve the session and return the user object
			const session = await authClient.getSession();
			const user = session?.data?.user as ExtendedUser | undefined;
			if (!user) {
				throw new Error('No se pudo obtener la sesión del usuario');
			}
			return user;
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
			const message = getAuthErrorMessage(response, 'Error al cerrar sesión');
			if (message) {
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
	useMutation<SignUpResponse, Error, SignUpType>({
		mutationKey: ['signup'],
		mutationFn: async ({ email, password, name }: SignUpType): Promise<SignUpResponse> => {
			const response = await authClient.signUp.email({ email, password, name });
			const message = getAuthErrorMessage(response, 'No se pudo crear el usuario');
			if (message) {
				throw new Error(message);
			}
			return response as unknown as SignUpResponse;
		},
	});
