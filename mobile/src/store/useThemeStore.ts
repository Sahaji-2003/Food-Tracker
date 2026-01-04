import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, ThemeColors } from '@/theme/colors';

type ThemeMode = 'light' | 'dark';

interface ThemeState {
    mode: ThemeMode;
    colors: ThemeColors;
    setTheme: (mode: ThemeMode) => void;
    toggleTheme: () => void;
}

// Create async storage adapter for Zustand
const asyncStorage = {
    getItem: async (name: string): Promise<string | null> => {
        return await AsyncStorage.getItem(name);
    },
    setItem: async (name: string, value: string): Promise<void> => {
        await AsyncStorage.setItem(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
        await AsyncStorage.removeItem(name);
    },
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            mode: 'light', // Default to light theme
            colors: lightTheme,

            setTheme: (mode: ThemeMode) => {
                set({
                    mode,
                    colors: mode === 'light' ? lightTheme : darkTheme,
                });
            },

            toggleTheme: () => {
                set((state) => {
                    const newMode = state.mode === 'light' ? 'dark' : 'light';
                    return {
                        mode: newMode,
                        colors: newMode === 'light' ? lightTheme : darkTheme,
                    };
                });
            },
        }),
        {
            name: 'theme-storage',
            storage: createJSONStorage(() => asyncStorage),
            // Only persist the mode, not the colors object
            partialize: (state) => ({ mode: state.mode }),
            // Rehydrate colors based on persisted mode
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.colors = state.mode === 'light' ? lightTheme : darkTheme;
                }
            },
        }
    )
);

export default useThemeStore;
