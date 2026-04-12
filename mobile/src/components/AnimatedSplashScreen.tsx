import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { useThemeStore } from '@/store/useThemeStore';

const { width, height } = Dimensions.get('window');

// 30 Health-related ice breakers
const HEALTH_FACTS = [
    "💡 Did you know? Chewing gum can help improve focus and reduce stress!",
    "🥤 Drinking water before meals can help reduce calorie intake by 25%.",
    "🚶 Just 30 minutes of walking daily can add years to your life.",
    "🍎 An apple a day really does help - they're packed with antioxidants!",
    "😴 Getting 7-8 hours of sleep boosts your metabolism by up to 15%.",
    "🧠 Your brain burns about 20% of your daily calories just by thinking!",
    "💪 Muscles burn 3x more calories at rest than fat tissue.",
    "🥗 Eating more fiber can reduce heart disease risk by 40%.",
    "☀️ Just 10 minutes of sunlight daily provides your vitamin D needs.",
    "🏃 Running for just 5 minutes a day can extend your life by 3 years!",
    "🥑 Avocados contain more potassium than bananas!",
    "💧 Being just 2% dehydrated can affect your concentration by 20%.",
    "🍌 Bananas are actually berries, while strawberries are not!",
    "🫁 Deep breathing for 5 minutes can lower blood pressure instantly.",
    "🥜 A handful of nuts daily reduces heart disease risk by 30%.",
    "🧘 Meditation for 10 minutes can reduce cortisol levels by 25%.",
    "🍫 Dark chocolate improves blood flow and brain function!",
    "🦴 Your bones are stronger than steel, ounce for ounce!",
    "❤️ Laughing 15 minutes daily burns up to 40 extra calories.",
    "🥬 Spinach can boost your muscle efficiency by up to 5%.",
    "☕ Coffee before exercise can boost fat burning by 10-29%.",
    "🍇 Red grapes contain resveratrol which supports heart health.",
    "🧅 Onions and garlic can naturally boost your immune system.",
    "🥕 Carrots really do help your eyesight - they're rich in beta-carotene!",
    "🍋 Lemons contain more sugar than strawberries!",
    "🫀 Your heart beats about 100,000 times every single day.",
    "🦠 Your gut contains 70% of your immune system cells.",
    "🌿 Mint tea can naturally soothe an upset stomach.",
    "🍯 Honey never spoils - 3000-year-old honey was found edible!",
    "🧊 Cold showers can boost your metabolism and immunity.",
];

interface SplashScreenProps {
    onFinish?: () => void;
    dataLoaded?: boolean;
}

const AnimatedSplashScreen: React.FC<SplashScreenProps> = ({ onFinish, dataLoaded = false }) => {
    const { mode, colors } = useThemeStore();
    const [progress, setProgress] = useState(0);
    const [minTimeComplete, setMinTimeComplete] = useState(false);
    const progressAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Pick a random fact once on mount
    const randomFact = useMemo(() => {
        return HEALTH_FACTS[Math.floor(Math.random() * HEALTH_FACTS.length)];
    }, []);

    // Gradient colors based on theme
    const gradientColors = mode === 'dark'
        ? ['#0a0a1a', '#1a1a3e', '#2d1f4d', '#1a3a2e'] as const
        : ['#ffffff', '#e8f5e9', '#e3f2fd', '#f0fdf4'] as const;

    useEffect(() => {
        // Fade in animation
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();

        // Simulate loading progress (minimum 5 seconds)
        const duration = 5000; // Total loading time - 5 seconds minimum
        const interval = 50; // Update every 50ms
        const steps = duration / interval;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const newProgress = Math.min((currentStep / steps) * 100, 100);
            setProgress(Math.round(newProgress));

            Animated.timing(progressAnim, {
                toValue: newProgress / 100,
                duration: interval,
                useNativeDriver: false,
            }).start();

            if (currentStep >= steps) {
                clearInterval(timer);
                setMinTimeComplete(true);
            }
        }, interval);

        return () => clearInterval(timer);
    }, [progressAnim, fadeAnim]);

    // Check if both minimum time and data are ready
    useEffect(() => {
        if (minTimeComplete && dataLoaded) {
            // Fade out and finish
            setTimeout(() => {
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => {
                    onFinish?.();
                });
            }, 300);
        }
    }, [minTimeComplete, dataLoaded, fadeAnim, onFinish]);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <LinearGradient
                colors={gradientColors}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Lottie Animation */}
                <View style={styles.animationContainer}>
                    <LottieView
                        source={{ uri: 'https://lottie.host/3e24b3f9-7da1-45e8-a859-d788a388fa06/fLozH5KhTh.lottie' }}
                        style={styles.lottie}
                        autoPlay
                        loop
                    />
                </View>

                {/* App Name */}
                <Text style={[styles.appName, { color: mode === 'dark' ? '#ffffff' : '#1a1a1a' }]}>
                    FitFlow AI
                </Text>
                <Text style={[styles.tagline, { color: mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]}>
                    Your Personal Health Companion
                </Text>

                {/* Progress Bar */}
                <View style={styles.loaderContainer}>
                    <View style={[styles.progressBarBackground, { backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                        <Animated.View
                            style={[
                                styles.progressBarFill,
                                {
                                    width: progressWidth,
                                    backgroundColor: colors.primary,
                                }
                            ]}
                        />
                    </View>
                    <Text style={[styles.progressText, { color: mode === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }]}>
                        {progress}%
                    </Text>
                </View>

                {/* Ice Breaker Fact */}
                <View style={styles.factContainer}>
                    <Text style={[styles.factText, { color: mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]}>
                        {randomFact}
                    </Text>
                </View>
            </LinearGradient>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    animationContainer: {
        width: 280,
        height: 280,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lottie: {
        width: 280,
        height: 280,
    },
    appName: {
        fontSize: 36,
        fontWeight: 'bold',
        marginTop: 24,
        letterSpacing: 1,
    },
    tagline: {
        fontSize: 16,
        marginTop: 8,
        marginBottom: 48,
    },
    loaderContainer: {
        width: '100%',
        maxWidth: 280,
        alignItems: 'center',
    },
    progressBarBackground: {
        width: '100%',
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '600',
    },
    factContainer: {
        position: 'absolute',
        bottom: 60,
        left: 32,
        right: 32,
    },
    factText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
});

export default AnimatedSplashScreen;
