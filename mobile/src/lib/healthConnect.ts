/**
 * Health Connect Integration for Android
 * Fetches ALL available data from Google Fit / Health Connect
 */

import { Platform } from 'react-native';
import { healthConnectAPI } from './api';

// Lazy load Health Connect to prevent crash in Expo Go
let healthConnectModule: any = null;

const getHealthConnectModule = async () => {
    if (Platform.OS !== 'android') return null;
    if (healthConnectModule) return healthConnectModule;

    try {
        healthConnectModule = await import('react-native-health-connect');
        return healthConnectModule;
    } catch (e) {
        console.warn('Health Connect not available (requires development build):', e);
        return null;
    }
};

export interface HealthData {
    steps: number;
    caloriesBurned: number;
    activeMinutes: number;
    distanceKm: number;
}

export interface FullHealthData {
    // Activity
    steps: number;
    stepsRecords: any[];
    activeCaloriesBurned: number;
    activeCaloriesRecords: any[];
    totalCaloriesBurned: number;
    totalCaloriesRecords: any[];
    distance: number;
    distanceRecords: any[];

    // Heart
    heartRate: number;
    heartRateRecords: any[];

    // Body
    weight: number;
    weightRecords: any[];
    height: number;
    heightRecords: any[];

    // Exercise
    exerciseSessions: any[];

    // Sleep
    sleepSessions: any[];

    // Nutrition
    nutritionRecords: any[];
    hydration: number;
    hydrationRecords: any[];

    // Other
    floorsClimbed: number;
    floorsClimbedRecords: any[];

    // Metadata
    fetchedAt: string;
    timeRange: { startTime: string; endTime: string };
}

export interface SyncStatus {
    syncEnabled: boolean;
    lastSyncTime: string | null;
    syncData: HealthData[];
}

let isInitialized = false;

// Check if Health Connect is available
export const isHealthConnectAvailable = (): boolean => {
    return Platform.OS === 'android';
};

// Initialize Health Connect SDK
export const initializeHealthConnect = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;
    if (isInitialized) return true;

    try {
        const hc = await getHealthConnectModule();
        if (!hc) return false;

        const result = await hc.initialize();
        isInitialized = result;
        return result;
    } catch (error) {
        console.error('Failed to initialize Health Connect:', error);
        return false;
    }
};

// Check availability
export const checkHealthConnectAvailability = async (): Promise<{
    available: boolean;
    status: string;
}> => {
    if (Platform.OS !== 'android') {
        return { available: false, status: 'Not Android' };
    }

    try {
        const hc = await getHealthConnectModule();
        if (!hc) {
            return { available: false, status: 'Health Connect not available (requires development build)' };
        }

        await initializeHealthConnect();
        const status = await hc.getSdkStatus();

        if (status === hc.SdkAvailabilityStatus.SDK_AVAILABLE) {
            return { available: true, status: 'Available' };
        } else if (status === hc.SdkAvailabilityStatus.SDK_UNAVAILABLE) {
            return { available: false, status: 'Health Connect not installed' };
        } else if (status === hc.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
            return { available: false, status: 'Health Connect needs update' };
        }

        return { available: false, status: 'Unknown status' };
    } catch (error) {
        console.error('Error checking Health Connect availability:', error);
        return { available: false, status: 'Health Connect not available' };
    }
};

// Request ALL permissions
export const requestHealthPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;

    try {
        const hc = await getHealthConnectModule();
        if (!hc) return false;

        const initialized = await initializeHealthConnect();
        if (!initialized) {
            console.error('Failed to initialize Health Connect');
            return false;
        }

        // Request permissions for ALL data types we want to read
        const granted = await hc.requestPermission([
            { accessType: 'read', recordType: 'Steps' },
            { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
            { accessType: 'read', recordType: 'TotalCaloriesBurned' },
            { accessType: 'read', recordType: 'Distance' },
            { accessType: 'read', recordType: 'HeartRate' },
            { accessType: 'read', recordType: 'Weight' },
            { accessType: 'read', recordType: 'Height' },
            { accessType: 'read', recordType: 'ExerciseSession' },
            { accessType: 'read', recordType: 'SleepSession' },
            { accessType: 'read', recordType: 'Nutrition' },
            { accessType: 'read', recordType: 'Hydration' },
            { accessType: 'read', recordType: 'FloorsClimbed' },
        ]);

        return granted && granted.length > 0;
    } catch (error) {
        console.error('Failed to request Health Connect permissions:', error);
        return false;
    }
};

// Get today's date range
const getTodayRange = (): { startTime: string; endTime: string } => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    return {
        startTime: startOfDay.toISOString(),
        endTime: now.toISOString(),
    };
};

// Helper to safely read records
const safeReadRecords = async (recordType: string, timeRange: any): Promise<any[]> => {
    try {
        const hc = await getHealthConnectModule();
        if (!hc) return [];

        const result = await hc.readRecords(recordType as any, {
            timeRangeFilter: { operator: 'between', ...timeRange },
        });
        return result.records || [];
    } catch (e) {
        console.log(`No ${recordType} data available:`, e);
        return [];
    }
};

// Fetch ALL health data from Health Connect
export const fetchAllHealthData = async (): Promise<FullHealthData> => {
    const emptyData: FullHealthData = {
        steps: 0, stepsRecords: [],
        activeCaloriesBurned: 0, activeCaloriesRecords: [],
        totalCaloriesBurned: 0, totalCaloriesRecords: [],
        distance: 0, distanceRecords: [],
        heartRate: 0, heartRateRecords: [],
        weight: 0, weightRecords: [],
        height: 0, heightRecords: [],
        exerciseSessions: [],
        sleepSessions: [],
        nutritionRecords: [],
        hydration: 0, hydrationRecords: [],
        floorsClimbed: 0, floorsClimbedRecords: [],
        fetchedAt: new Date().toISOString(),
        timeRange: { startTime: '', endTime: '' },
    };

    if (Platform.OS !== 'android') return emptyData;

    try {
        await initializeHealthConnect();
        const timeRange = getTodayRange();

        console.log('\n' + '='.repeat(60));
        console.log('FETCHING ALL DATA FROM HEALTH CONNECT');
        console.log('='.repeat(60));
        console.log('Time Range:', timeRange.startTime, 'to', timeRange.endTime);
        console.log('='.repeat(60) + '\n');

        // Fetch Steps
        const stepsRecords = await safeReadRecords('Steps', timeRange);
        const steps = stepsRecords.reduce((sum: number, r: any) => sum + (r.count || 0), 0);
        console.log('📊 STEPS:', steps, '| Records:', stepsRecords.length);
        stepsRecords.forEach((r: any, i: number) => console.log(`  Record ${i + 1}:`, JSON.stringify(r)));

        // Fetch Active Calories
        const activeCaloriesRecords = await safeReadRecords('ActiveCaloriesBurned', timeRange);
        const activeCaloriesBurned = activeCaloriesRecords.reduce((sum: number, r: any) => sum + (r.energy?.inKilocalories || 0), 0);
        console.log('🔥 ACTIVE CALORIES:', Math.round(activeCaloriesBurned), '| Records:', activeCaloriesRecords.length);
        activeCaloriesRecords.forEach((r: any, i: number) => console.log(`  Record ${i + 1}:`, JSON.stringify(r)));

        // Fetch Total Calories
        const totalCaloriesRecords = await safeReadRecords('TotalCaloriesBurned', timeRange);
        const totalCaloriesBurned = totalCaloriesRecords.reduce((sum: number, r: any) => sum + (r.energy?.inKilocalories || 0), 0);
        console.log('🔥 TOTAL CALORIES (including BMR):', Math.round(totalCaloriesBurned), '| Records:', totalCaloriesRecords.length);
        totalCaloriesRecords.forEach((r: any, i: number) => console.log(`  Record ${i + 1}:`, JSON.stringify(r)));

        // Fetch Distance
        const distanceRecords = await safeReadRecords('Distance', timeRange);
        const distance = distanceRecords.reduce((sum: number, r: any) => sum + (r.distance?.inKilometers || 0), 0);
        console.log('📏 DISTANCE (km):', Math.round(distance * 100) / 100, '| Records:', distanceRecords.length);
        distanceRecords.forEach((r: any, i: number) => console.log(`  Record ${i + 1}:`, JSON.stringify(r)));

        // Fetch Heart Rate
        const heartRateRecords = await safeReadRecords('HeartRate', timeRange);
        const heartRate = heartRateRecords.length > 0
            ? heartRateRecords.reduce((sum: number, r: any) => {
                const samples = r.samples || [];
                return sum + samples.reduce((s: number, sample: any) => s + (sample.beatsPerMinute || 0), 0) / (samples.length || 1);
            }, 0) / heartRateRecords.length
            : 0;
        console.log('❤️ HEART RATE (avg bpm):', Math.round(heartRate), '| Records:', heartRateRecords.length);
        heartRateRecords.forEach((r: any, i: number) => console.log(`  Record ${i + 1}:`, JSON.stringify(r)));

        // Fetch Weight
        const weightRecords = await safeReadRecords('Weight', timeRange);
        const weight = weightRecords.length > 0 ? (weightRecords[weightRecords.length - 1]?.weight?.inKilograms || 0) : 0;
        console.log('⚖️ WEIGHT (kg):', Math.round(weight * 10) / 10, '| Records:', weightRecords.length);
        weightRecords.forEach((r: any, i: number) => console.log(`  Record ${i + 1}:`, JSON.stringify(r)));

        // Fetch Height
        const heightRecords = await safeReadRecords('Height', timeRange);
        const height = heightRecords.length > 0 ? (heightRecords[heightRecords.length - 1]?.height?.inMeters || 0) : 0;
        console.log('📐 HEIGHT (m):', Math.round(height * 100) / 100, '| Records:', heightRecords.length);
        heightRecords.forEach((r: any, i: number) => console.log(`  Record ${i + 1}:`, JSON.stringify(r)));

        // Fetch Exercise Sessions
        const exerciseSessions = await safeReadRecords('ExerciseSession', timeRange);
        console.log('🏃 EXERCISE SESSIONS:', exerciseSessions.length);
        exerciseSessions.forEach((r: any, i: number) => console.log(`  Session ${i + 1}:`, JSON.stringify(r)));

        // Fetch Sleep Sessions
        const sleepSessions = await safeReadRecords('SleepSession', timeRange);
        console.log('😴 SLEEP SESSIONS:', sleepSessions.length);
        sleepSessions.forEach((r: any, i: number) => console.log(`  Session ${i + 1}:`, JSON.stringify(r)));

        // Fetch Nutrition
        const nutritionRecords = await safeReadRecords('Nutrition', timeRange);
        console.log('🍎 NUTRITION RECORDS:', nutritionRecords.length);
        nutritionRecords.forEach((r: any, i: number) => console.log(`  Record ${i + 1}:`, JSON.stringify(r)));

        // Fetch Hydration
        const hydrationRecords = await safeReadRecords('Hydration', timeRange);
        const hydration = hydrationRecords.reduce((sum: number, r: any) => sum + (r.volume?.inLiters || 0), 0);
        console.log('💧 HYDRATION (liters):', Math.round(hydration * 100) / 100, '| Records:', hydrationRecords.length);
        hydrationRecords.forEach((r: any, i: number) => console.log(`  Record ${i + 1}:`, JSON.stringify(r)));

        // Fetch Floors Climbed
        const floorsClimbedRecords = await safeReadRecords('FloorsClimbed', timeRange);
        const floorsClimbed = floorsClimbedRecords.reduce((sum: number, r: any) => sum + (r.floors || 0), 0);
        console.log('🪜 FLOORS CLIMBED:', floorsClimbed, '| Records:', floorsClimbedRecords.length);
        floorsClimbedRecords.forEach((r: any, i: number) => console.log(`  Record ${i + 1}:`, JSON.stringify(r)));

        console.log('\n' + '='.repeat(60));
        console.log('HEALTH CONNECT DATA FETCH COMPLETE');
        console.log('='.repeat(60) + '\n');

        return {
            steps, stepsRecords,
            activeCaloriesBurned: Math.round(activeCaloriesBurned), activeCaloriesRecords,
            totalCaloriesBurned: Math.round(totalCaloriesBurned), totalCaloriesRecords,
            distance: Math.round(distance * 100) / 100, distanceRecords,
            heartRate: Math.round(heartRate), heartRateRecords,
            weight: Math.round(weight * 10) / 10, weightRecords,
            height: Math.round(height * 100) / 100, heightRecords,
            exerciseSessions,
            sleepSessions,
            nutritionRecords,
            hydration: Math.round(hydration * 100) / 100, hydrationRecords,
            floorsClimbed, floorsClimbedRecords,
            fetchedAt: new Date().toISOString(),
            timeRange,
        };
    } catch (error) {
        console.error('Failed to fetch health data:', error);
        return emptyData;
    }
};

// Legacy function for backward compatibility
export const fetchHealthData = async (): Promise<HealthData> => {
    const fullData = await fetchAllHealthData();
    return {
        steps: fullData.steps,
        caloriesBurned: fullData.activeCaloriesBurned, // Only active calories
        activeMinutes: Math.round(fullData.steps / 100),
        distanceKm: fullData.distance,
    };
};

// Get sync status from backend
export const getSyncStatus = async (): Promise<SyncStatus> => {
    try {
        const response = await healthConnectAPI.getStatus();
        return {
            syncEnabled: response.sync_enabled || false,
            lastSyncTime: response.last_sync_time || null,
            syncData: response.sync_data || [],
        };
    } catch (error) {
        console.error('Failed to get sync status:', error);
        return { syncEnabled: false, lastSyncTime: null, syncData: [] };
    }
};

// Toggle sync on/off
export const toggleSync = async (enabled: boolean): Promise<boolean> => {
    try {
        const response = await healthConnectAPI.toggleSync(enabled);
        return response.success;
    } catch (error) {
        console.error('Failed to toggle sync:', error);
        return false;
    }
};

// Sync ALL health data to backend
export const syncAllHealthData = async (data: FullHealthData): Promise<boolean> => {
    try {
        console.log('\n' + '='.repeat(60));
        console.log('SENDING ALL DATA TO BACKEND');
        console.log('='.repeat(60));
        console.log(JSON.stringify(data, null, 2));
        console.log('='.repeat(60) + '\n');

        const response = await healthConnectAPI.syncFull(data);

        console.log('Backend Response:', JSON.stringify(response, null, 2));
        return response.success;
    } catch (error) {
        console.error('Failed to sync full health data:', error);
        return false;
    }
};

// Legacy sync function
export const syncHealthData = async (data: HealthData): Promise<boolean> => {
    try {
        const payload = {
            steps: data.steps,
            calories_burned: data.caloriesBurned,
            active_minutes: data.activeMinutes,
            distance_km: data.distanceKm,
        };

        console.log('=== SENDING TO BACKEND ===');
        console.log('Payload:', JSON.stringify(payload, null, 2));

        const response = await healthConnectAPI.sync(payload);
        console.log('Response:', JSON.stringify(response, null, 2));

        return response.success;
    } catch (error) {
        console.error('Failed to sync health data:', error);
        return false;
    }
};

// Format last sync time
export const formatLastSyncTime = (isoString: string | null): string => {
    if (!isoString) return 'Never synced';

    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
};

// Main sync function - fetches ALL data and sends to backend
export const performSync = async (): Promise<{ success: boolean; data?: HealthData; fullData?: FullHealthData; error?: string }> => {
    if (Platform.OS !== 'android') {
        return { success: false, error: 'Health Connect is only available on Android' };
    }

    try {
        // Step 1: Initialize
        const initialized = await initializeHealthConnect();
        if (!initialized) {
            return { success: false, error: 'Failed to initialize Health Connect' };
        }

        // Step 2: Check availability
        const availability = await checkHealthConnectAvailability();
        if (!availability.available) {
            return { success: false, error: availability.status };
        }

        // Step 3: Request permissions
        const hasPermissions = await requestHealthPermissions();
        if (!hasPermissions) {
            return { success: false, error: 'Health Connect permissions not granted' };
        }

        // Step 4: Fetch ALL data from Health Connect
        const fullData = await fetchAllHealthData();

        // Step 5: Send ALL data to backend (backend will log and use what it needs)
        const success = await syncAllHealthData(fullData);

        // Also create legacy data format for UI
        const data: HealthData = {
            steps: fullData.steps,
            caloriesBurned: fullData.activeCaloriesBurned,
            activeMinutes: Math.round(fullData.steps / 100),
            distanceKm: fullData.distance,
        };

        if (success) {
            return { success: true, data, fullData };
        }

        return { success: false, error: 'Failed to save data to server' };
    } catch (error) {
        console.error('Sync failed:', error);
        return { success: false, error: 'Sync failed. Please try again.' };
    }
};
