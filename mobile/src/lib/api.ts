import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { router } from 'expo-router';

// For Android emulator, use 10.0.2.2 to access host machine's localhost
// For physical devices, you need to use your computer's actual IP address
const getApiUrl = () => {
    const envUrl = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL;
    console.log('[API] expoConfig.extra:', Constants.expoConfig?.extra);
    console.log('[API] EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
    console.log('[API] Final URL:', envUrl);
    if (envUrl) return envUrl;

    // Default fallbacks
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:8000'; // Android emulator special IP for localhost
    }
    return 'http://localhost:8000';
};

const API_URL = getApiUrl();
console.log('[API] Using API_URL:', API_URL);

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 120000, // 2 minutes for Gemini API calls
});

// Request interceptor to add auth token
api.interceptors.request.use(
    async (config) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Handle unauthorized - navigate to login
            router.replace('/login');
        }
        return Promise.reject(error);
    }
);

// API endpoints
export const mealAPI = {
    analyze: async (formData: FormData) => {
        const response = await api.post('/api/meals/analyze', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    analyzeText: async (text: string) => {
        const response = await api.post('/api/meals/analyze-text', { text });
        return response.data;
    },

    getHistory: async (limit = 20, offset = 0) => {
        const response = await api.get('/api/meals/history', {
            params: { limit, offset },
        });
        return response.data;
    },

    deleteMeal: async (mealId: string) => {
        const response = await api.delete(`/api/meals/${mealId}`);
        return response.data;
    },

    getTasks: async (status?: string, includeYesterday = false) => {
        const response = await api.get('/api/meals/tasks', {
            params: { status, include_yesterday: includeYesterday },
        });
        return response.data;
    },

    deleteTask: async (taskId: string) => {
        const response = await api.delete(`/api/meals/tasks/${taskId}`);
        return response.data;
    },

    updateTask: async (taskId: string, status: string) => {
        const response = await api.patch(`/api/meals/tasks/${taskId}`, null, {
            params: { status },
        });
        return response.data;
    },

    getMeal: async (mealId: string) => {
        const response = await api.get(`/api/meals/${mealId}`);
        return response.data;
    },
};

export const suggestionAPI = {
    fromMenu: async (formData: FormData) => {
        const response = await api.post('/api/suggestions/menu', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    fromPantry: async (formData: FormData) => {
        const response = await api.post('/api/suggestions/cooking', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
};

export const chatAPI = {
    send: async (message: string, imageUri?: string) => {
        if (imageUri) {
            // If image provided, use FormData
            const formData = new FormData();
            formData.append('message', message);
            const filename = imageUri.split('/').pop() || 'image.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';
            formData.append('image', {
                uri: imageUri,
                name: filename,
                type,
            } as any);
            const response = await api.post('/api/chat/vision', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        }
        const response = await api.post('/api/chat', { message });
        return response.data;
    },

    getHistory: async () => {
        const response = await api.get('/api/chat/history');
        return response.data;
    },

    clearHistory: async () => {
        const response = await api.delete('/api/chat/history');
        return response.data;
    },

    confirmMeal: async (data: {
        food_name: string;
        calories: number;
        protein?: number;
        carbs?: number;
        fat?: number;
        plate_grade?: string;
        reasoning?: string;
        source?: string;
    }) => {
        const response = await api.post('/api/chat/confirm-meal', data);
        return response.data;
    },

    confirmGoal: async (data: { new_target: number }) => {
        const response = await api.post('/api/chat/confirm-goal', data);
        return response.data;
    },
};

export const profileAPI = {
    get: async () => {
        const response = await api.get('/api/profile');
        return response.data;
    },

    update: async (profile: Record<string, unknown>) => {
        const response = await api.put('/api/profile', profile);
        return response.data;
    },
};

export const dailyAPI = {
    get: async (date?: string) => {
        const response = await api.get('/api/daily', {
            params: { date },
        });
        return response.data;
    },

    syncGoogleFit: async () => {
        const response = await api.post('/api/daily/sync-google-fit');
        return response.data;
    },
};

export const healthConnectAPI = {
    getStatus: async () => {
        const response = await api.get('/api/google-fit/status');
        return response.data;
    },

    toggleSync: async (enabled: boolean) => {
        const response = await api.post('/api/google-fit/toggle', { enabled });
        return response.data;
    },

    sync: async (data: {
        steps: number;
        calories_burned: number;
        active_minutes: number;
        distance_km: number;
    }) => {
        const response = await api.post('/api/google-fit/sync', data);
        return response.data;
    },

    // Send ALL health data to backend
    syncFull: async (data: any) => {
        const response = await api.post('/api/google-fit/sync-full', data);
        return response.data;
    },

    getLatest: async () => {
        const response = await api.get('/api/google-fit/latest');
        return response.data;
    },
};

export const weeklyAPI = {
    getSummary: async () => {
        const response = await api.get('/api/weekly/summary');
        return response.data;
    },

    cleanup: async () => {
        const response = await api.post('/api/weekly/cleanup');
        return response.data;
    },

    checkCleanup: async (lastCleanupDate: string | null) => {
        const response = await api.get('/api/weekly/check-cleanup', {
            params: { last_cleanup_date: lastCleanupDate },
        });
        return response.data;
    },
};
