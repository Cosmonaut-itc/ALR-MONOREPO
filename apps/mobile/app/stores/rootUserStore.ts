import { create } from "zustand";
import { devtools } from "@csark0812/zustand-expo-devtools";

/**
 * Root user state interface
 * Stores authenticated user information from login mutation
 */
interface RootUserState {
	/** User ID from the login mutation result */
	userId: string | null;
	/** Full user data from the login mutation */
	userData: unknown | null;

	/**
	 * Sets the user ID and user data from login mutation
	 * @param userId - The user ID from the login result
	 * @param userData - The full user data from the login result
	 */
	setUserData: (userId: string, userData: unknown) => void;

	/**
	 * Clears user data on logout
	 */
	clearUserData: () => void;
}

/**
 * RootUserStore - Zustand store for managing authenticated user information
 * Stores login mutation results for use across the application
 */
export const useRootUserStore = create<RootUserState>()(
	devtools(
		(set) => ({
			// Initial State
			userId: null,
			userData: null,

			// Action Implementations
			setUserData: (userId: string, userData: unknown) => {
				set({
					userId,
					userData,
				});
			},

			clearUserData: () => {
				set({
					userId: null,
					userData: null,
				});
			},
		}),
		{
			name: "root-user-store",
		},
	),
);

