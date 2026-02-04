import "zustand/vanilla";

declare module "zustand/vanilla" {
	interface StoreMutators<S, A> {
		"zustand/expo-devtools": S;
	}
}
