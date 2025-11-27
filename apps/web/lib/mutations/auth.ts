import { useMutation } from "@tanstack/react-query";
import type { LoginType, SignUpType } from "@/types";
import type { ExtendedUser, SignUpResponse } from "@/types/auth";
import { authClient } from "../auth-client";
import { client } from "../client";

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
	defaultMessage = "Error al iniciar sesión",
): string | null => {
	const r = response as MaybeError | null | undefined;
	if (!r) {
		return null;
	}

	const extractMessage = (err: unknown): string | null => {
		if (!err) {
			return null;
		}
		if (typeof err === "string") {
			return err;
		}
		if (
			typeof err === "object" &&
			"message" in (err as Record<string, unknown>)
		) {
			const msg = (err as { message?: unknown }).message;
			if (typeof msg === "string") {
				return msg;
			}
		}
		return null;
	};

	const messageFromError = extractMessage(r.error);
	const messageFromDataError = extractMessage(r.data?.error);
	const message = messageFromError || messageFromDataError;
	const notOk = r.ok === false || r.success === false;
	const httpFailed = typeof r.status === "number" && r.status >= 400;
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
		mutationKey: ["login"],
		mutationFn: async ({
			email,
			password,
		}: LoginType): Promise<ExtendedUser> => {
			const response = await authClient.signIn.email({ email, password });
			const message = getAuthErrorMessage(response);
			if (message) {
				throw new Error(message);
			}
			// After successful sign-in, resolve the session and return the user object
			const session = await authClient.getSession();
			const user = session?.data?.user as ExtendedUser | undefined;
			if (!user) {
				throw new Error("No se pudo obtener la sesión del usuario");
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
		mutationKey: ["logout"],
		mutationFn: async () => {
			const response = await authClient.signOut();
			const message = getAuthErrorMessage(response, "Error al cerrar sesión");
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
		mutationKey: ["signup"],
		mutationFn: async ({
			email,
			password,
			name,
		}: SignUpType): Promise<SignUpResponse> => {
			const response = await authClient.signUp.email({ email, password, name });
			const message = getAuthErrorMessage(
				response,
				"No se pudo crear el usuario",
			);
			if (message) {
				throw new Error(message);
			}
			return response as unknown as SignUpResponse;
		},
	});

/**
 * Type for updating user data.
 * Represents the payload required to update a user's role and/or warehouse.
 */
export type UpdateUserType = {
	/**
	 * The ID of the user to update
	 */
	userId: string;
	/**
	 * The new role for the user (optional)
	 */
	role?: "employee" | "encargado";
	/**
	 * The new warehouse ID for the user (optional)
	 */
	warehouseId?: string;
};

/**
 * Custom React Query mutation hook for updating user data.
 *
 * This hook allows updating a user's role and/or warehouse assignment.
 * It calls the `/api/auth/users/update` endpoint with the provided data.
 *
 * @returns {ReturnType<typeof useMutation>} The mutation object for updating users.
 *
 * @example
 * const { mutateAsync, isPending } = useUpdateUserMutation();
 * await mutateAsync({
 *   userId: 'user_abc123',
 *   role: 'encargado',
 *   warehouseId: '123e4567-e89b-12d3-a456-426614174000'
 * });
 */
export const useUpdateUserMutation = () =>
	useMutation<unknown, Error, UpdateUserType>({
		mutationKey: ["update-user"],
		mutationFn: async (payload: UpdateUserType): Promise<unknown> => {
			const response = await client.api.auth.users.update.$post({
				json: payload,
			});

			if (!response.ok) {
				const errorText = await response
					.text()
					.catch(() => "Error desconocido");
				throw new Error(`Error al actualizar usuario: ${errorText}`);
			}

			return response.json();
		},
	});

export type DeleteUserPayload = {
	userId: string;
};

export const useDeleteUserMutation = () =>
	useMutation<unknown, Error, DeleteUserPayload>({
		mutationKey: ["delete-user"],
		mutationFn: async ({ userId }: DeleteUserPayload) => {
			const response = await fetch("/api/auth/users/delete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId }),
			});
			if (!response.ok) {
				const errorText = await response.text().catch(() => "Error desconocido");
				throw new Error(`Error al borrar usuario: ${errorText}`);
			}
			return response.json();
		},
	});
