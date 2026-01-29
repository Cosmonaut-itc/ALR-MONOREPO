/**
 * Color palette for the Inventory ALR app
 * This file defines all colors used throughout the app for both light and dark themes
 */

// Primary brand colors
const primaryLight = "#0a7ea4";
const primaryDark = "#0a7ea4"; // Keeping the same primary color for brand recognition

// Background colors
const backgroundLight = "#ffffff";
const backgroundDark = "#151718";

// Surface/Card/Input colors
const surfaceLight = "#F9FAFB";
const surfaceDark = "#1E1F20";

// Border colors
const borderLight = "#E5E7EB";
const borderDark = "#2D3033";

// Text colors
const textPrimaryLight = "#11181C";
const textSecondaryLight = "#687076";
const textPrimaryDark = "#ECEDEE";
const textSecondaryDark = "#9BA1A6";

// Status colors (consistent across themes)
const success = "#10B981";
const error = "#EF4444";
const warning = "#F59E0B";
const info = "#3B82F6";

export const Colors = {
	light: {
		// Main colors
		text: textPrimaryLight,
		textSecondary: textSecondaryLight,
		background: backgroundLight,
		tint: primaryLight,

		// UI elements
		surface: surfaceLight,
		border: borderLight,
		icon: textSecondaryLight,

		// Tab navigation
		tabIconDefault: textSecondaryLight,
		tabIconSelected: primaryLight,

		// Status colors
		success,
		error,
		warning,
		info,

		// Additional UI colors
		disabled: "#D1D5DB",
		placeholder: "#9CA3AF",
		highlight: "#F3F4F6",
	},
	dark: {
		// Main colors
		text: textPrimaryDark,
		textSecondary: textSecondaryDark,
		background: backgroundDark,
		tint: primaryDark,

		// UI elements
		surface: surfaceDark,
		border: borderDark,
		icon: textSecondaryDark,

		// Tab navigation
		tabIconDefault: textSecondaryDark,
		tabIconSelected: primaryDark,

		// Status colors
		success,
		error,
		warning,
		info,

		// Additional UI colors
		disabled: "#4B5563",
		placeholder: "#6B7280",
		highlight: "#1F2937",
	},
};
export type ColorScheme = keyof typeof Colors;
