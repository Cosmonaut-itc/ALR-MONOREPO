import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface ThemeState {
	isDark: boolean;
	toggleTheme: () => void;
	setTheme: (isDark: boolean) => void;
	initializeTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
	devtools(
		persist(
			(set, get) => ({
				isDark: false,
				toggleTheme: () => {
					const newTheme = !get().isDark;
					set({ isDark: newTheme });
					if (typeof window !== 'undefined') {
						if (newTheme) {
							document.documentElement.classList.add('dark');
						} else {
							document.documentElement.classList.remove('dark');
						}
					}
				},
				setTheme: (isDark: boolean) => {
					set({ isDark });
					if (typeof window !== 'undefined') {
						if (isDark) {
							document.documentElement.classList.add('dark');
						} else {
							document.documentElement.classList.remove('dark');
						}
					}
				},
				initializeTheme: () => {
					if (typeof window !== 'undefined') {
						const isDark = get().isDark;
						if (isDark) {
							document.documentElement.classList.add('dark');
						} else {
							document.documentElement.classList.remove('dark');
						}
					}
				},
			}),
			{
				name: 'theme-storage',
			},
		),
		{ name: 'theme-store' },
	),
);
