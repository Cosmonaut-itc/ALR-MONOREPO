import { create } from 'zustand';
import { devtools } from '@csark0812/zustand-expo-devtools';
import type { NumpadValueType } from "@/types/types";

export const useNumpadStore = create<NumpadValueType>()(
  devtools(
    (set) => ({
      value: "",
      setValue: (newValue: string) => 
        set((state) => ({ value: state.value + newValue })),
      deleteValue: () => 
        set((state) => ({ value: state.value.slice(0, -1) })),
      clearValue: () => set({ value: "" }),
    }),
    {
      name: 'numpad-value',
    }
  )
);