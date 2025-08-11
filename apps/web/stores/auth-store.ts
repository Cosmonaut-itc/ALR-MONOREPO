import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface User {
	id: string;
	email: string;
	name: string;
	role: string;
}

interface AuthState {
	user: User | null;
	isAuthenticated: boolean;

	// Actions
	login: (id: string, email: string, name: string, role: string) => void;
	logout: () => void;
}

export const useAuthStore = create<AuthState>()(
	devtools(
		persist(
			(set, get) => ({
				user: null,
				isAuthenticated: false,

				login: (id: string, email: string, name: string, role: string) => {
					try {
						const user: User = {
							id,
							email,
							name,
							role,
						};

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

				getUserData: () => {
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
