import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import NetInfo from '@react-native-community/netinfo';
import type { Profile, DailyLog, MealHistory, BurnTask } from '@/lib/supabase';
import { zustandStorage } from '@/lib/storage';

interface AuthState {
    user: { id: string; email: string } | null;
    profile: Profile | null;
    setUser: (user: { id: string; email: string } | null) => void;
    setProfile: (profile: Profile | null) => void;
}

interface DailyState {
    dailyLog: DailyLog | null;
    setDailyLog: (log: DailyLog | null) => void;
    updateCaloriesIn: (calories: number) => void;
    updateWater: (ml: number) => void;
    updateSteps: (steps: number) => void;
}

interface MealState {
    meals: MealHistory[];
    setMeals: (meals: MealHistory[]) => void;
    addMeal: (meal: MealHistory) => void;
}

interface TaskState {
    tasks: BurnTask[];
    setTasks: (tasks: BurnTask[]) => void;
    addTask: (task: BurnTask) => void;
    updateTaskStatus: (id: string, status: BurnTask['status']) => void;
}

interface UIState {
    isOnline: boolean;
    setIsOnline: (online: boolean) => void;
    pendingSyncCount: number;
    setPendingSyncCount: (count: number) => void;
}

type Store = AuthState & DailyState & MealState & TaskState & UIState;

export const useStore = create<Store>()(
    persist(
        (set) => ({
            // Auth state
            user: null,
            profile: null,
            setUser: (user) => set({ user }),
            setProfile: (profile) => set({ profile }),

            // Daily state
            dailyLog: null,
            setDailyLog: (dailyLog) => set({ dailyLog }),
            updateCaloriesIn: (calories) =>
                set((state) => ({
                    dailyLog: state.dailyLog
                        ? { ...state.dailyLog, calories_in: state.dailyLog.calories_in + calories }
                        : null,
                })),
            updateWater: (ml) =>
                set((state) => ({
                    dailyLog: state.dailyLog
                        ? { ...state.dailyLog, water_ml: state.dailyLog.water_ml + ml }
                        : null,
                })),
            updateSteps: (steps) =>
                set((state) => ({
                    dailyLog: state.dailyLog
                        ? { ...state.dailyLog, steps }
                        : null,
                })),

            // Meal state
            meals: [],
            setMeals: (meals) => set({ meals }),
            addMeal: (meal) =>
                set((state) => ({
                    meals: [meal, ...state.meals],
                })),

            // Task state
            tasks: [],
            setTasks: (tasks) => set({ tasks }),
            addTask: (task) =>
                set((state) => ({
                    tasks: [task, ...state.tasks],
                })),
            updateTaskStatus: (id, status) =>
                set((state) => ({
                    tasks: state.tasks.map((task) =>
                        task.id === id
                            ? { ...task, status, completed_at: status === 'completed' ? new Date().toISOString() : null }
                            : task
                    ),
                })),

            // UI state
            isOnline: true,
            setIsOnline: (isOnline) => set({ isOnline }),
            pendingSyncCount: 0,
            setPendingSyncCount: (pendingSyncCount) => set({ pendingSyncCount }),
        }),
        {
            name: 'fitflow-storage',
            storage: createJSONStorage(() => zustandStorage),
            partialize: (state) => ({
                user: state.user,
                profile: state.profile,
                dailyLog: state.dailyLog,
            }),
        }
    )
);

// Setup network status listener
NetInfo.addEventListener((state) => {
    useStore.getState().setIsOnline(state.isConnected ?? false);
});
