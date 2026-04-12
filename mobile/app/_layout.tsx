import '../global.css';
import { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { weeklyAPI } from '@/lib/api';
import AnimatedSplashScreen from '@/components/AnimatedSplashScreen';
import { AlertProvider } from '@/components/ui';

// Prevent the native splash from auto-hiding
SplashScreen.preventAutoHideAsync();

const CLEANUP_DATE_KEY = 'lastCleanupDate';

export default function RootLayout() {
    const { setUser, setProfile, user } = useStore();
    const [appIsReady, setAppIsReady] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

    // Auto-cleanup old data (runs once per day)
    const runDailyCleanup = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const lastCleanup = await AsyncStorage.getItem(CLEANUP_DATE_KEY);

            if (lastCleanup !== today) {
                console.log('Running daily cleanup for data older than 7 days...');
                await weeklyAPI.cleanup();
                await AsyncStorage.setItem(CLEANUP_DATE_KEY, today);
                console.log('Daily cleanup complete!');
            }
        } catch (e) {
            console.warn('Cleanup failed:', e);
        }
    };

    useEffect(() => {
        async function prepare() {
            try {
                // Check active session on app load
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setUser({ id: session.user.id, email: session.user.email || '' });
                    // Run cleanup for logged-in users
                    runDailyCleanup();
                }
            } catch (e) {
                console.warn(e);
            } finally {
                setAppIsReady(true);
                // Mark data as loaded once auth check completes
                setDataLoaded(true);
            }
        }

        prepare();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser({ id: session.user.id, email: session.user.email || '' });
            } else {
                setUser(null);
                setProfile(null);
            }
        });

        return () => subscription.unsubscribe();
    }, [setUser, setProfile]);

    const onLayoutRootView = useCallback(async () => {
        if (appIsReady) {
            // Hide the native splash screen
            await SplashScreen.hideAsync();
        }
    }, [appIsReady]);

    const handleSplashFinish = useCallback(() => {
        setShowAnimatedSplash(false);
    }, []);

    if (!appIsReady) {
        return null;
    }

    if (showAnimatedSplash) {
        return (
            <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
                <StatusBar style="light" />
                <AnimatedSplashScreen onFinish={handleSplashFinish} dataLoaded={dataLoaded} />
            </View>
        );
    }

    return (
        <AlertProvider>
            <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
                <StatusBar style="light" />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: '#0a0a1a' },
                        animation: 'slide_from_right',
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                </Stack>
            </View>
        </AlertProvider>
    );
}

