import AsyncStorage from '@react-native-async-storage/async-storage';

// Offline meal log interface
export interface OfflineMeal {
    id: string;
    imageUri?: string;
    foodText?: string;
    source: 'photo' | 'text' | 'voice';
    timestamp: number;
    synced: boolean;
}

// Sync queue interface
export interface SyncQueueItem {
    id: string;
    type: 'meal' | 'water' | 'task_complete';
    data: unknown;
    timestamp: number;
    retryCount: number;
}

// Keys for storage
const KEYS = {
    OFFLINE_MEALS: 'offline_meals',
    SYNC_QUEUE: 'sync_queue',
    CACHED_IMAGES: 'cached_images',
};

// Helper to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Offline meals functions
export async function addOfflineMeal(meal: Omit<OfflineMeal, 'id' | 'synced' | 'timestamp'>): Promise<string> {
    const meals = await getOfflineMeals();
    const newMeal: OfflineMeal = {
        ...meal,
        id: generateId(),
        timestamp: Date.now(),
        synced: false,
    };
    meals.push(newMeal);
    await AsyncStorage.setItem(KEYS.OFFLINE_MEALS, JSON.stringify(meals));
    return newMeal.id;
}

export async function getOfflineMeals(): Promise<OfflineMeal[]> {
    const data = await AsyncStorage.getItem(KEYS.OFFLINE_MEALS);
    return data ? JSON.parse(data) : [];
}

export async function getUnsyncedMeals(): Promise<OfflineMeal[]> {
    const meals = await getOfflineMeals();
    return meals.filter((meal) => !meal.synced);
}

export async function markMealAsSynced(id: string): Promise<void> {
    const meals = await getOfflineMeals();
    const updatedMeals = meals.map((meal) =>
        meal.id === id ? { ...meal, synced: true } : meal
    );
    await AsyncStorage.setItem(KEYS.OFFLINE_MEALS, JSON.stringify(updatedMeals));
}

// Sync queue functions
export async function addToSyncQueue(type: SyncQueueItem['type'], data: unknown): Promise<string> {
    const queue = await getSyncQueue();
    const item: SyncQueueItem = {
        id: generateId(),
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0,
    };
    queue.push(item);
    await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
    return item.id;
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
    const data = await AsyncStorage.getItem(KEYS.SYNC_QUEUE);
    return data ? JSON.parse(data) : [];
}

export async function removeSyncQueueItem(id: string): Promise<void> {
    const queue = await getSyncQueue();
    const filtered = queue.filter((item) => item.id !== id);
    await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(filtered));
}

export async function incrementRetryCount(id: string): Promise<void> {
    const queue = await getSyncQueue();
    const updated = queue.map((item) =>
        item.id === id ? { ...item, retryCount: item.retryCount + 1 } : item
    );
    await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(updated));
}

// Clean up old data (older than 7 days)
export async function cleanupOldData(): Promise<void> {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Clean synced meals older than 7 days
    const meals = await getOfflineMeals();
    const recentMeals = meals.filter(
        (meal) => !meal.synced || meal.timestamp > sevenDaysAgo
    );
    await AsyncStorage.setItem(KEYS.OFFLINE_MEALS, JSON.stringify(recentMeals));
}

// Zustand persistence adapter (AsyncStorage-based)
export const zustandStorage = {
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
