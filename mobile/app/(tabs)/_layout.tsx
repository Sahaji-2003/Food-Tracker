import { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { View, Animated, Text } from 'react-native';
import { LayoutDashboard, UserCircle, BarChart3, Plus, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/useThemeStore';

// Animated Plus Button for Add Meal (Center)
const AnimatedPlusButton = ({ focused }: { focused: boolean }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.12,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );

        const glow = Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 0.6,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0.2,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        );

        pulse.start();
        glow.start();

        return () => {
            pulse.stop();
            glow.stop();
        };
    }, []);

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: -12 }}>
            {/* Outer glow ring */}
            <Animated.View style={{
                position: 'absolute',
                top: -13,
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#22c55e',
                opacity: glowAnim,
                transform: [{ scale: pulseAnim }],
            }} />
            {/* Button */}
            <LinearGradient
                colors={['#22c55e', '#16a34a']}
                style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#22c55e',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.5,
                    shadowRadius: 10,
                    elevation: 10,
                }}
            >
                <Animated.View style={{ transform: [{ scale: focused ? 1.1 : 1 }] }}>
                    <Plus size={28} color="#fff" strokeWidth={2.5} />
                </Animated.View>
            </LinearGradient>
            {/* Label */}
            <Text style={{ color: focused ? '#22c55e' : '#a7adb9ff', fontSize: 11, marginTop: 10 }}>Meal</Text>
        </View>
    );
};

// Animated AI Icon for Chat (slow rotating sparkle effect every 3.5s)
const AnimatedAIIcon = ({ color, focused }: { color: string; focused: boolean }) => {
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        // Slow rotation animation every 3.5 seconds
        const rotate = Animated.loop(
            Animated.sequence([
                Animated.delay(3500),
                Animated.parallel([
                    Animated.timing(rotateAnim, {
                        toValue: 1,
                        duration: 2000, // Even slower rotation
                        useNativeDriver: true,
                    }),
                    Animated.sequence([
                        Animated.timing(scaleAnim, {
                            toValue: 1.2,
                            duration: 750,
                            useNativeDriver: true,
                        }),
                        Animated.timing(scaleAnim, {
                            toValue: 1,
                            duration: 750,
                            useNativeDriver: true,
                        }),
                    ]),
                ]),
                Animated.timing(rotateAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        );

        // Continuous glow
        const glow = Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0.5,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        );

        rotate.start();
        glow.start();

        return () => {
            rotate.stop();
            glow.stop();
        };
    }, []);

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{
                opacity: focused ? glowAnim : 1,
                transform: [
                    { scale: focused ? scaleAnim : 1 },
                    { rotate: rotation },
                ],
            }}>
                <Sparkles
                    size={22}
                    color={focused ? '#22c55e' : color}
                    fill={focused ? '#4ade80' : 'transparent'}
                />
            </Animated.View>
        </View>
    );
};

export default function TabsLayout() {
    const { colors } = useThemeStore();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.background,
                    borderTopColor: colors.border,
                    borderTopWidth: 0.5,
                    height: 70,
                    paddingBottom: 12,
                    paddingTop: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 10,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.mutedForeground,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '500',
                    marginTop: 2,
                },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Today',
                    tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={22} />,
                }}
            />
            <Tabs.Screen
                name="weekly"
                options={{
                    title: 'Weekly',
                    tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={22} />,
                }}
            />
            <Tabs.Screen
                name="meals"
                options={{
                    title: '',
                    tabBarIcon: ({ focused }) => <AnimatedPlusButton focused={focused} />,
                    tabBarLabel: () => null,
                }}
            />
            <Tabs.Screen
                name="chat"
                options={{
                    title: 'AI',
                    tabBarIcon: ({ color, focused }) => <AnimatedAIIcon color={color} focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => <UserCircle color={color} size={22} />,
                }}
            />
            <Tabs.Screen
                name="meal-detail"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}
