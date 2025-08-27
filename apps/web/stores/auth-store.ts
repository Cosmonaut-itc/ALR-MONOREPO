import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ExtendedUser } from '@/types/auth';

interface AuthState {
	user: ExtendedUser | null;
	isAuthenticated: boolean;

	// Actions
	login: (user: ExtendedUser) => void;
	logout: () => void;
	getUserData: () => ExtendedUser | null;
}

export const useAuthStore = create<AuthState>()(
	devtools(
		persist(
			(set, get) => ({
				user: null,
				isAuthenticated: false,

				login: (user: ExtendedUser) => {
					try {
						set({
							user,
							isAuthenticated: true,
						});
					} catch (error) {
						// biome-ignore lint/suspicious/noConsole: Needed for error logging
						console.error('Error al iniciar sesión:', error);
					}
				},

				logout: () => {
					set({
						user: null,
						isAuthenticated: false,
					});
				},

				getUserData: (): ExtendedUser | null => {
					const user = get().user;
					if (!user) {
						return null;
					}
					return user;
				},
			}),
			{
				name: 'auth-storage',
				partialize: (state) => ({
					user: state.user,
					isAuthenticated: state.isAuthenticated,
				}),
			},
		),
		{ name: 'auth-store' },
	),
);
