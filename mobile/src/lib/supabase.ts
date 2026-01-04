import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    'https://placeholder.supabase.co';

const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-key';

// Custom storage adapter using expo-secure-store
const ExpoSecureStoreAdapter = {
    getItem: async (key: string): Promise<string | null> => {
        try {
            return await SecureStore.getItemAsync(key);
        } catch {
            return null;
        }
    },
    setItem: async (key: string, value: string): Promise<void> => {
        try {
            await SecureStore.setItemAsync(key, value);
        } catch (error) {
            console.error('Error storing session:', error);
        }
    },
    removeItem: async (key: string): Promise<void> => {
        try {
            await SecureStore.deleteItemAsync(key);
        } catch (error) {
            console.error('Error removing session:', error);
        }
    },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // No URL detection in React Native
    },
});

// Database types (same as web frontend)
export type Profile = {
    id: string;
    age: number | null;
    gender: 'male' | 'female' | 'other' | null;
    weight: number | null;
    height: number | null;
    medical_conditions: string[];
    allergies: string[];
    preferences: string[];
    target_goal: 'Weight Loss' | 'Muscle Gain' | 'Maintenance' | null;
    daily_calorie_target: number;
    daily_water_target: number;
    notification_enabled: boolean;
    created_at: string;
    updated_at: string;
};

export type DailyLog = {
    id: string;
    user_id: string;
    date: string;
    calories_in: number;
    calories_out: number;
    water_ml: number;
    steps: number;
    active_minutes: number;
    google_fit_data: Record<string, unknown>;
    created_at: string;
    updated_at: string;
};

export type MealHistory = {
    id: string;
    user_id: string;
    image_url: string | null;
    image_hash: string | null;
    food_name: string;
    ingredients: string | null;
    calories: number;
    macros: {
        p: number;
        c: number;
        f: number;
    };
    plate_grade: string;
    reasoning: string | null;
    assigned_task_id: string | null;
    source: 'photo' | 'text' | 'voice';
    created_at: string;
};

export type BurnTask = {
    id: string;
    user_id: string;
    meal_id: string | null;
    name: string;
    duration_minutes: number;
    calories_to_burn: number;
    distance_km: number | null;
    steps: number | null;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    completed_at: string | null;
    due_by: string | null;
    created_at: string;
};

export type GroceryItem = {
    id: string;
    user_id: string;
    item_name: string;
    quantity: string | null;
    category: string;
    suggested_by_ai: boolean;
    recipe_context: string | null;
    is_purchased: boolean;
    created_at: string;
};
