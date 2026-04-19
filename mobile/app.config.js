import 'dotenv/config';

export default {
    expo: {
        name: "FitFlow AI",
        slug: "fitflow-ai",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        scheme: "fitflow",
        userInterfaceStyle: "dark",
        newArchEnabled: true,
        splash: {
            image: "./assets/splash-icon.png",
            resizeMode: "contain",
            backgroundColor: "#0a0a1a"
        },
        ios: {
            supportsTablet: true,
            bundleIdentifier: "com.fitflow.ai",
            infoPlist: {
                NSHealthShareUsageDescription: "FitFlow needs access to your health data to track your daily activity and provide personalized recommendations.",
                NSHealthUpdateUsageDescription: "FitFlow needs permission to save your workout data."
            }
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#0a0a1a"
            },
            package: "com.fitflow.ai",
            permissions: [
                "android.permission.ACTIVITY_RECOGNITION",
                "android.permission.health.READ_STEPS",
                "android.permission.health.READ_TOTAL_CALORIES_BURNED",
                "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
                "android.permission.health.READ_DISTANCE"
            ]
        },
        plugins: [
            "expo-router",
            "expo-secure-store",
            "expo-asset",
            "expo-font",
            "expo-splash-screen",
            [
                "expo-build-properties",
                {
                    android: {
                        minSdkVersion: 26,
                        compileSdkVersion: 35,
                        targetSdkVersion: 34,
                        usesCleartextTraffic: true
                    }
                }
            ],
            [
                "expo-image-picker",
                {
                    cameraPermission: "Allow FitFlow AI to access your camera to take meal photos",
                    photosPermission: "Allow FitFlow AI to access your photos to select meal images"
                }
            ],
            [
                "expo-health-connect",
                {
                    permissions: [
                        "android.permission.health.READ_STEPS",
                        "android.permission.health.READ_TOTAL_CALORIES_BURNED",
                        "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
                        "android.permission.health.READ_DISTANCE"
                    ]
                }
            ]
        ],
        experiments: {
            typedRoutes: true
        },
        extra: {
            apiUrl: process.env.EXPO_PUBLIC_API_URL,
            supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
            supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
            eas: {
                projectId: "6a4616e6-0dd2-4c56-b149-76fbf8394f1a"
            }
        }
    }
};
