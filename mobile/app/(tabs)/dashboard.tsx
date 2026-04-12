import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Modal, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Trash2, CheckCircle, X, Zap, ChevronRight, TrendingUp, Target, AlertCircle,
    Footprints, Timer, Dumbbell, Bike, PersonStanding, Heart, Flame,
    CircleCheck, User, Users,
    Droplets, RefreshCw
} from 'lucide-react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Rect, Path, G } from 'react-native-svg';
import Markdown from 'react-native-markdown-display';
import { router, useFocusEffect } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useThemeStore } from '@/store/useThemeStore';
import { dailyAPI, mealAPI } from '@/lib/api';
import { formatCalories } from '@/lib/utils';
import Confetti from '@/components/Confetti';
import SmartNotifications from '@/components/SmartNotifications';
import { Platform } from 'react-native';
import { performSync, initializeHealthConnect } from '@/lib/healthConnect';
import { useAlert } from '@/components/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Modern Avatar component - clean gradient with initials
const Avatar = ({
    gender,
    age,
    size = 56,
    name = '',
}: {
    gender: string | null | undefined;
    age: number | null | undefined;
    size?: number;
    name?: string;
}) => {
    // Generate colors based on name
    const gradientPairs = [
        ['#22c55e', '#14b8a6'], // Green-Teal
        ['#3b82f6', '#6366f1'], // Blue-Indigo
        ['#8b5cf6', '#a855f7'], // Purple
        ['#ec4899', '#f43f5e'], // Pink-Rose
        ['#f59e0b', '#f97316'], // Amber-Orange
        ['#06b6d4', '#0ea5e9'], // Cyan-Sky
        ['#10b981', '#059669'], // Emerald
        ['#6366f1', '#8b5cf6'], // Indigo-Purple
    ];

    const colorIndex = (name?.length || 0) % gradientPairs.length;
    const [color1, color2] = gradientPairs[colorIndex];

    // Get initials from email/name
    const getInitials = () => {
        if (!name) return '?';
        const parts = name.split('@')[0].split(/[._-]/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    const initials = getInitials();
    const fontSize = size * 0.4;

    return (
        <LinearGradient
            colors={[color1, color2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text style={{
                color: '#fff',
                fontSize,
                fontWeight: '700',
                letterSpacing: 0.5,
            }}>
                {initials}
            </Text>
        </LinearGradient>
    );
};

// Skeleton shimmer animation component with smooth animation
const SkeletonBox = ({
    width,
    height,
    borderRadius = 8,
    style = {}
}: {
    width: number | string;
    height: number;
    borderRadius?: number;
    style?: any;
}) => {
    const { colors } = useThemeStore();
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const shimmerLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        );
        shimmerLoop.start();
        return () => shimmerLoop.stop();
    }, [shimmerAnim]);

    const opacity = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    backgroundColor: colors.muted,
                    borderRadius,
                    opacity,
                },
                style,
            ]}
        />
    );
};

// Dashboard Skeleton Loading Component
const DashboardSkeleton = ({ colors }: { colors: any }) => {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* Header Skeleton */}
                <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        {/* Avatar Skeleton */}
                        <SkeletonBox width={56} height={56} borderRadius={28} />

                        {/* Greeting Skeleton */}
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <SkeletonBox width={150} height={22} style={{ marginBottom: 8 }} />
                            <SkeletonBox width={180} height={14} />
                        </View>

                        {/* Online Status Skeleton */}
                        <SkeletonBox width={70} height={28} borderRadius={14} />
                    </View>

                    {/* Calorie Progress Card Skeleton */}
                    <View style={{ backgroundColor: colors.secondary, borderRadius: 20, padding: 20 }}>
                        {/* Title */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <SkeletonBox width={18} height={18} borderRadius={9} />
                            <SkeletonBox width={150} height={16} style={{ marginLeft: 8 }} />
                        </View>

                        {/* Circular Progress Skeleton */}
                        <View style={{ alignItems: 'center' }}>
                            <SkeletonBox width={160} height={160} borderRadius={80} />
                        </View>

                        {/* Stats Cards Skeleton */}
                        <View style={{ flexDirection: 'row', marginTop: 20, gap: 8 }}>
                            <View style={{ flex: 1, backgroundColor: colors.muted, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                                <SkeletonBox width={18} height={18} borderRadius={9} style={{ marginBottom: 4 }} />
                                <SkeletonBox width={50} height={20} style={{ marginBottom: 4 }} />
                                <SkeletonBox width={40} height={12} />
                            </View>
                            <View style={{ flex: 1, backgroundColor: colors.muted, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                                <SkeletonBox width={18} height={18} borderRadius={9} style={{ marginBottom: 4 }} />
                                <SkeletonBox width={50} height={20} style={{ marginBottom: 4 }} />
                                <SkeletonBox width={40} height={12} />
                            </View>
                            <View style={{ flex: 1, backgroundColor: colors.muted, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                                <SkeletonBox width={18} height={18} borderRadius={9} style={{ marginBottom: 4 }} />
                                <SkeletonBox width={50} height={20} style={{ marginBottom: 4 }} />
                                <SkeletonBox width={40} height={12} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Activity Stats Skeleton */}
                <View style={{ marginTop: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
                        <SkeletonBox width={18} height={18} borderRadius={9} />
                        <SkeletonBox width={120} height={16} style={{ marginLeft: 8 }} />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                        {[1, 2, 3, 4].map((i) => (
                            <View key={i} style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 16, width: 120, marginRight: 12, alignItems: 'center' }}>
                                <SkeletonBox width={44} height={44} borderRadius={22} style={{ marginBottom: 10 }} />
                                <SkeletonBox width={50} height={18} style={{ marginBottom: 4 }} />
                                <SkeletonBox width={40} height={12} />
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Tasks Skeleton */}
                <View style={{ marginTop: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
                        <SkeletonBox width={18} height={18} borderRadius={9} />
                        <SkeletonBox width={100} height={16} style={{ marginLeft: 8 }} />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                        {[1, 2, 3].map((i) => (
                            <View key={i} style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 14, width: 150, marginRight: 12 }}>
                                <SkeletonBox width={100} height={16} style={{ marginBottom: 8 }} />
                                <SkeletonBox width={80} height={12} style={{ marginBottom: 8 }} />
                                <SkeletonBox width={60} height={14} style={{ marginBottom: 8 }} />
                                <SkeletonBox width={'100%' as any} height={28} borderRadius={8} />
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Macros Skeleton */}
                <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <SkeletonBox width={18} height={18} borderRadius={9} />
                        <SkeletonBox width={140} height={16} style={{ marginLeft: 8 }} />
                    </View>
                    <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                        <View style={{ flex: 1, marginHorizontal: 4, backgroundColor: colors.secondary, borderRadius: 12, padding: 12 }}>
                            <SkeletonBox width={60} height={14} style={{ marginBottom: 8 }} />
                            <SkeletonBox width={'100%' as any} height={10} borderRadius={5} style={{ marginBottom: 6 }} />
                            <SkeletonBox width={40} height={14} />
                        </View>
                        <View style={{ flex: 1, marginHorizontal: 4, backgroundColor: colors.secondary, borderRadius: 12, padding: 12 }}>
                            <SkeletonBox width={50} height={14} style={{ marginBottom: 8 }} />
                            <SkeletonBox width={'100%' as any} height={10} borderRadius={5} style={{ marginBottom: 6 }} />
                            <SkeletonBox width={40} height={14} />
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                        <View style={{ flex: 1, marginHorizontal: 4, backgroundColor: colors.secondary, borderRadius: 12, padding: 12 }}>
                            <SkeletonBox width={35} height={14} style={{ marginBottom: 8 }} />
                            <SkeletonBox width={'100%' as any} height={10} borderRadius={5} style={{ marginBottom: 6 }} />
                            <SkeletonBox width={40} height={14} />
                        </View>
                        <View style={{ flex: 1, marginHorizontal: 4, backgroundColor: colors.secondary, borderRadius: 12, padding: 12 }}>
                            <SkeletonBox width={50} height={14} style={{ marginBottom: 8 }} />
                            <SkeletonBox width={'100%' as any} height={10} borderRadius={5} style={{ marginBottom: 6 }} />
                            <SkeletonBox width={40} height={14} />
                        </View>
                    </View>
                </View>

                {/* Weekly Overview Skeleton */}
                <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                    <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <SkeletonBox width={18} height={18} borderRadius={9} />
                            <SkeletonBox width={120} height={16} style={{ marginLeft: 8 }} />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 6 }}>
                            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                                    <SkeletonBox width={'80%' as any} height={20 + Math.random() * 60} borderRadius={4} />
                                    <SkeletonBox width={25} height={10} style={{ marginTop: 6 }} />
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Log Meal Button Skeleton */}
                <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                    <SkeletonBox width={'100%' as any} height={52} borderRadius={16} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

interface BurnTask {
    meal_id: string;
    id: string;
    task_type: string;
    name: string;
    description?: string;
    duration_minutes: number;
    calories_to_burn: number;
    steps?: number;
    distance_km?: number;
    status: string;
    date: string;
}

interface GroupedTask {
    name: string;
    task_type: string;
    total_duration: number;
    total_calories: number;
    total_steps: number;
    tasks: BurnTask[];
}

interface MealItem {
    id: string;
    food_name: string;
    calories: number;
    macros: { p: number; c: number; f: number };
    created_at: string;
}

// Enhanced 3-Ring Animated Circular Progress Component
const CircularProgress = ({
    consumed,
    target,
    burned,
    restingCal = 0,
    exerciseCal = 0,
    size,
    strokeWidth,
    colors,
}: {
    consumed: number;
    target: number;
    burned: number;
    restingCal?: number;
    exerciseCal?: number;
    size: number;
    strokeWidth: number;
    colors: any;
}) => {
    const [showDetail, setShowDetail] = useState(false);

    // State for animated stroke offsets
    const [animatedOuter, setAnimatedOuter] = useState(1);
    const [animatedMiddle, setAnimatedMiddle] = useState(1);
    const [animatedInner, setAnimatedInner] = useState(1);

    // Animation refs for glow effect
    const glowAnim = useRef(new Animated.Value(0.3)).current;

    // Thicker rings closer together
    const ringWidth = 10;
    const gap = 2;

    const outerRadius = (size - ringWidth) / 2;
    const middleRadius = outerRadius - ringWidth - gap;
    const innerRadius = middleRadius - ringWidth - gap;

    const outerCircumference = outerRadius * 2 * Math.PI;
    const middleCircumference = middleRadius * 2 * Math.PI;
    const innerCircumference = innerRadius * 2 * Math.PI;

    // Percentages for all 3 rings
    const eatenPercent = Math.min((consumed / Math.max(target, 1)) * 100, 100);
    const burnedPercent = Math.min((burned / Math.max(target, 1)) * 100, 100);
    const remaining = Math.max(target - consumed + burned, 0);
    const remainingPercent = Math.min((remaining / Math.max(target, 1)) * 100, 100);

    // Animation for ring fill + subtle pulse
    useEffect(() => {
        // Reset to full circle (empty)
        setAnimatedOuter(1);
        setAnimatedMiddle(1);
        setAnimatedInner(1);

        // Calculate target percentages (inverted for strokeDashoffset)
        const outerTarget = 1 - (eatenPercent / 100);
        const middleTarget = 1 - (burnedPercent / 100);
        const innerTarget = 1 - (remainingPercent / 100);

        // Animate with timing
        const outerAnimValue = new Animated.Value(1);
        const middleAnimValue = new Animated.Value(1);
        const innerAnimValue = new Animated.Value(1);

        // Add listeners to update state
        outerAnimValue.addListener(({ value }) => setAnimatedOuter(value));
        middleAnimValue.addListener(({ value }) => setAnimatedMiddle(value));
        innerAnimValue.addListener(({ value }) => setAnimatedInner(value));

        // Sequential fill animation - slower timing
        Animated.stagger(400, [
            Animated.timing(outerAnimValue, {
                toValue: outerTarget,
                duration: 2200,
                useNativeDriver: false,
            }),
            Animated.timing(middleAnimValue, {
                toValue: middleTarget,
                duration: 2000,
                useNativeDriver: false,
            }),
            Animated.timing(innerAnimValue, {
                toValue: innerTarget,
                duration: 1800,
                useNativeDriver: false,
            }),
        ]).start();

        // Continuous glow pulse animation
        const glow = Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 0.8,
                    duration: 1500,
                    useNativeDriver: false,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0.3,
                    duration: 1500,
                    useNativeDriver: false,
                }),
            ])
        );
        glow.start();

        return () => {
            outerAnimValue.removeAllListeners();
            middleAnimValue.removeAllListeners();
            innerAnimValue.removeAllListeners();
            glow.stop();
        };
    }, [consumed, burned, target]);

    // Calculate stroke offsets from animated state
    const outerOffset = animatedOuter * outerCircumference;
    const middleOffset = animatedMiddle * middleCircumference;
    const innerOffset = animatedInner * innerCircumference;

    const netCalories = consumed - burned;
    const isOver = netCalories > target;

    // Calculate position for percentage labels on the ring
    const getPercentPosition = (percent: number, radius: number) => {
        const displayPercent = Math.max(percent, 5);
        const angle = ((displayPercent / 100) * 360 - 90) * (Math.PI / 180);
        return {
            x: size / 2 + radius * Math.cos(angle),
            y: size / 2 + radius * Math.sin(angle),
        };
    };

    // Animated Circle component using native SVG
    const AnimatedCircle = Animated.createAnimatedComponent(Circle);

    return (
        <>
            <TouchableOpacity
                onPress={() => setShowDetail(true)}
                activeOpacity={0.8}
                style={{ alignItems: 'center' }}
            >
                {/* Glow effect container */}
                <Animated.View style={{
                    position: 'relative',
                    width: size,
                    height: size,
                    shadowColor: '#14b8a6',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: glowAnim,
                    shadowRadius: 15,
                    elevation: 8,
                }}>
                    <Svg width={size} height={size}>
                        <Defs>
                            {/* Eaten Gradient - Teal to Cyan */}
                            <SvgLinearGradient id="eatenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#06b6d4" />
                                <Stop offset="50%" stopColor="#14b8a6" />
                                <Stop offset="100%" stopColor="#0d9488" />
                            </SvgLinearGradient>
                            {/* Burned Gradient - Orange to Red */}
                            <SvgLinearGradient id="burnedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#fbbf24" />
                                <Stop offset="50%" stopColor="#f59e0b" />
                                <Stop offset="100%" stopColor="#ea580c" />
                            </SvgLinearGradient>
                            {/* Remaining Gradient - Green to Emerald */}
                            <SvgLinearGradient id="remainingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#4ade80" />
                                <Stop offset="50%" stopColor="#22c55e" />
                                <Stop offset="100%" stopColor="#16a34a" />
                            </SvgLinearGradient>
                        </Defs>

                        {/* Background rings - very light/transparent */}
                        <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={outerRadius}
                            stroke="rgba(150,150,150,0.1)"
                            strokeWidth={ringWidth}
                            fill="transparent"
                        />
                        <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={middleRadius}
                            stroke="rgba(150,150,150,0.1)"
                            strokeWidth={ringWidth}
                            fill="transparent"
                        />
                        <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={innerRadius}
                            stroke="rgba(150,150,150,0.1)"
                            strokeWidth={ringWidth}
                            fill="transparent"
                        />

                        {/* Outer Ring - EATEN with Gradient */}
                        <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={outerRadius}
                            stroke="url(#eatenGradient)"
                            strokeWidth={ringWidth}
                            fill="transparent"
                            strokeDasharray={outerCircumference}
                            strokeDashoffset={outerOffset}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${size / 2} ${size / 2})`}
                        />

                        {/* Middle Ring - BURNED with Gradient */}
                        <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={middleRadius}
                            stroke="url(#burnedGradient)"
                            strokeWidth={ringWidth}
                            fill="transparent"
                            strokeDasharray={middleCircumference}
                            strokeDashoffset={middleOffset}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${size / 2} ${size / 2})`}
                        />

                        {/* Inner Ring - REMAINING with Gradient */}
                        <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={innerRadius}
                            stroke="url(#remainingGradient)"
                            strokeWidth={ringWidth}
                            fill="transparent"
                            strokeDasharray={innerCircumference}
                            strokeDashoffset={innerOffset}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${size / 2} ${size / 2})`}
                        />
                    </Svg>

                    {/* Percentage label for Eaten (outer) */}
                    <View style={{
                        position: 'absolute',
                        left: getPercentPosition(eatenPercent, outerRadius).x - 16,
                        top: getPercentPosition(eatenPercent, outerRadius).y - 9,
                        backgroundColor: '#14b8a6',
                        paddingHorizontal: 4,
                        paddingVertical: 1,
                        borderRadius: 4,
                    }}>
                        <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>
                            {Math.round(eatenPercent)}%
                        </Text>
                    </View>

                    {/* Percentage label for Burned (middle) */}
                    <View style={{
                        position: 'absolute',
                        left: getPercentPosition(burnedPercent, middleRadius).x - 16,
                        top: getPercentPosition(burnedPercent, middleRadius).y - 9,
                        backgroundColor: '#f59e0b',
                        paddingHorizontal: 4,
                        paddingVertical: 1,
                        borderRadius: 4,
                    }}>
                        <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>
                            {Math.round(burnedPercent)}%
                        </Text>
                    </View>

                    {/* Percentage label for Remaining (inner) */}
                    <View style={{
                        position: 'absolute',
                        left: getPercentPosition(remainingPercent, innerRadius).x - 16,
                        top: getPercentPosition(remainingPercent, innerRadius).y - 9,
                        backgroundColor: '#22c55e',
                        paddingHorizontal: 4,
                        paddingVertical: 1,
                        borderRadius: 4,
                    }}>
                        <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>
                            {Math.round(remainingPercent)}%
                        </Text>
                    </View>

                    {/* Center Content - Remaining Goal + Tap for details */}
                    <View style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                        <Text style={{
                            color: isOver ? '#f59e0b' : '#22c55e',
                            fontSize: 22,
                            fontWeight: 'bold'
                        }}>
                            {formatCalories(remaining)}
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>Cal left</Text>
                        <Text style={{ color: colors.primary, fontSize: 10, marginTop: 4 }}>
                            Tap for details
                        </Text>
                    </View>
                </Animated.View>

                {/* Legend OUTSIDE the circle */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#14b8a6', marginRight: 3 }} />
                        <Text style={{ color: colors.foreground, fontSize: 10 }}>Intake</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b', marginRight: 3 }} />
                        <Text style={{ color: colors.foreground, fontSize: 10 }}>Burned</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginRight: 3 }} />
                        <Text style={{ color: colors.foreground, fontSize: 10 }}>Goal Left</Text>
                    </View>
                </View>
            </TouchableOpacity>

            {/* Detail Modal */}
            <Modal
                visible={showDetail}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDetail(false)}
            >
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
                    activeOpacity={1}
                    onPress={() => setShowDetail(false)}
                >
                    <View style={{
                        backgroundColor: colors.card,
                        borderRadius: 24,
                        padding: 24,
                        width: SCREEN_WIDTH - 48,
                        alignItems: 'center'
                    }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.foreground, marginBottom: 20 }}>
                            Today's Calorie Breakdown
                        </Text>

                        {/* Intake */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, width: '100%' }}>
                            <View style={{
                                width: 40, height: 40, borderRadius: 20,
                                backgroundColor: '#14b8a6',
                                justifyContent: 'center', alignItems: 'center'
                            }}>
                                <Flame size={20} color="#fff" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Calorie Intake</Text>
                                <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: 'bold' }}>{formatCalories(consumed)} Cal</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: '#14b8a6', fontSize: 16, fontWeight: '600' }}>{Math.round(eatenPercent)}%</Text>
                                <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>of goal</Text>
                            </View>
                        </View>

                        {/* Burned - with BMR breakdown */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, width: '100%' }}>
                            <View style={{
                                width: 40, height: 40, borderRadius: 20,
                                backgroundColor: '#f59e0b',
                                justifyContent: 'center', alignItems: 'center'
                            }}>
                                <Zap size={20} color="#fff" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Calories Burned</Text>
                                <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: 'bold' }}>{formatCalories(burned)} Cal</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: '#f59e0b', fontSize: 16, fontWeight: '600' }}>{Math.round(burnedPercent)}%</Text>
                                <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>of goal</Text>
                            </View>
                        </View>

                        {/* BMR vs Exercise mini-breakdown */}
                        <View style={{
                            width: '100%',
                            backgroundColor: colors.secondary,
                            borderRadius: 16,
                            paddingVertical: 14,
                            paddingHorizontal: 12,
                            marginBottom: 24,
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: colors.border,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 3,
                            elevation: 2,
                        }}>
                            <View style={{ alignItems: 'center', flex: 1 }}>
                                <Text style={{ color: colors.mutedForeground, fontSize: 11, marginBottom: 4 }}>🏠 Resting (BMR)</Text>
                                <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: 'bold' }}>
                                    {formatCalories(restingCal)} <Text style={{ fontSize: 12, fontWeight: '500' }}>Cal</Text>
                                </Text>
                                <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 2 }}>breathing, digestion</Text>
                            </View>
                            <View style={{ width: 1, height: '80%', backgroundColor: colors.border, marginHorizontal: 8 }} />
                            <View style={{ alignItems: 'center', flex: 1 }}>
                                <Text style={{ color: colors.mutedForeground, fontSize: 11, marginBottom: 4 }}>🏃 Active Exercise</Text>
                                <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: 'bold' }}>
                                    {formatCalories(exerciseCal)} <Text style={{ fontSize: 12, fontWeight: '500' }}>Cal</Text>
                                </Text>
                                <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 2 }}>walking, workouts</Text>
                            </View>
                        </View>

                        {/* Goal Left */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, width: '100%' }}>
                            <View style={{
                                width: 40, height: 40, borderRadius: 20,
                                backgroundColor: '#22c55e',
                                justifyContent: 'center', alignItems: 'center'
                            }}>
                                <Target size={20} color="#fff" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Goal Left</Text>
                                <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: 'bold' }}>{formatCalories(remaining)} Cal</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: '#22c55e', fontSize: 16, fontWeight: '600' }}>{Math.round((remaining / target) * 100)}%</Text>
                                <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>left</Text>
                            </View>
                        </View>

                        {/* Divider */}
                        <View style={{ width: '100%', height: 1, backgroundColor: colors.border, marginBottom: 16 }} />

                        {/* Summary */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Daily Goal</Text>
                                <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: 'bold' }}>{formatCalories(target)}</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Net</Text>
                                <Text style={{
                                    color: isOver ? '#f59e0b' : '#22c55e',
                                    fontSize: 18,
                                    fontWeight: 'bold'
                                }}>
                                    {formatCalories(netCalories)}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Status</Text>
                                <Text style={{
                                    color: isOver ? '#f59e0b' : '#22c55e',
                                    fontSize: 14,
                                    fontWeight: '600'
                                }}>
                                    {isOver ? 'Over' : 'On Track'}
                                </Text>
                            </View>
                        </View>

                        {/* Close Button */}
                        <TouchableOpacity
                            onPress={() => setShowDetail(false)}
                            style={{
                                marginTop: 20,
                                backgroundColor: colors.primary,
                                paddingHorizontal: 32,
                                paddingVertical: 12,
                                borderRadius: 12
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Got it!</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

// Weekly bar chart
const WeeklyBarChart = ({ data, target, colors }: { data: number[]; target: number; colors: any }) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxValue = Math.max(...data, target) * 1.2;
    const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    return (
        <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <TrendingUp size={18} color={colors.primary} />
                <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 15, marginLeft: 8 }}>Weekly Overview</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 6 }}>
                {data.map((value, index) => {
                    const height = Math.max((value / maxValue) * 85, 4);
                    const isToday = index === todayIndex;
                    const isOverTarget = value > target;
                    return (
                        <View key={index} style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{ color: colors.mutedForeground, fontSize: 9, marginBottom: 4 }}>
                                {value > 0 ? formatCalories(value) : ''}
                            </Text>
                            <View
                                style={{
                                    width: '80%',
                                    height: height,
                                    backgroundColor: isOverTarget ? '#f59e0b' : '#22c55e',
                                    borderRadius: 4,
                                    opacity: isToday ? 1 : 0.6,
                                    borderWidth: isToday ? 2 : 0,
                                    borderColor: '#fff',
                                }}
                            />
                            <Text style={{
                                color: isToday ? colors.foreground : colors.mutedForeground,
                                fontSize: 10,
                                marginTop: 6,
                                fontWeight: isToday ? '600' : '400',
                            }}>
                                {days[index]}
                            </Text>
                        </View>
                    );
                })}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
                <View style={{ width: 10, height: 10, backgroundColor: '#22c55e', borderRadius: 2, marginRight: 4 }} />
                <Text style={{ color: colors.mutedForeground, fontSize: 10, marginRight: 16 }}>Under target</Text>
                <View style={{ width: 10, height: 10, backgroundColor: '#f59e0b', borderRadius: 2, marginRight: 4 }} />
                <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Over target</Text>
            </View>
        </View>
    );
};

// Activity stat card
const ActivityStatCard = ({
    icon: Icon,
    value,
    label,
    color,
    colors
}: {
    icon: any;
    value: string;
    label: string;
    color: string;
    colors: any;
}) => (
    <View style={{
        backgroundColor: colors.secondary,
        borderRadius: 16,
        padding: 16,
        width: 120,
        marginRight: 12,
        alignItems: 'center',
    }}>
        <View style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: color + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
        }}>
            <Icon size={24} color={color} />
        </View>
        <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 18 }}>{value}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>{label}</Text>
    </View>
);

// Task card for horizontal scroll
const TaskCard = ({ task, onPress, colors }: { task: GroupedTask; onPress: () => void; colors: any }) => (
    <TouchableOpacity
        onPress={onPress}
        style={{
            backgroundColor: colors.secondary,
            borderRadius: 16,
            padding: 14,
            width: 150,
            marginRight: 12,
        }}
    >
        <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 14, marginBottom: 4 }} numberOfLines={2}>
            {task.name}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 8 }}>
            {task.total_steps > 0 ? `${task.total_steps.toLocaleString()} steps · ` : ''}{task.total_duration} min
        </Text>
        <Text style={{ color: '#f59e0b', fontSize: 13, fontWeight: '600' }}>
            {task.total_calories} cal
        </Text>
        <TouchableOpacity
            onPress={onPress}
            style={{ marginTop: 8, paddingVertical: 6, backgroundColor: colors.muted, borderRadius: 8, alignItems: 'center' }}
        >
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '500' }}>View</Text>
        </TouchableOpacity>
    </TouchableOpacity>
);

// Enhanced Macro progress bar with gradient
const ProgressBar = ({
    label,
    value,
    max,
    color,
    gradientColors,
    Icon,
    unit = 'g',
    colors
}: {
    label: string;
    value: number;
    max: number;
    color: string;
    gradientColors: [string, string];
    Icon: any;
    unit?: string;
    colors: any;
}) => {
    const percentage = Math.min((value / max) * 100, 100);

    return (
        <View style={{
            flex: 1,
            marginHorizontal: 4,
            backgroundColor: colors.secondary,
            borderRadius: 12,
            padding: 12,
        }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: color + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 6,
                }}>
                    <Icon size={14} color={color} />
                </View>
                <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 13 }}>{label}</Text>
            </View>
            <View style={{ height: 10, backgroundColor: colors.muted, borderRadius: 5, overflow: 'hidden' }}>
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                        height: 10,
                        width: `${percentage}%`,
                        borderRadius: 5,
                    }}
                />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ color: color, fontSize: 14, fontWeight: '600' }}>
                    {Math.round(value)}{unit}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                    {Math.round(percentage)}%
                </Text>
            </View>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 2 }}>
                Goal: {max}{unit}
            </Text>
        </View>
    );
};

export default function DashboardScreen() {
    const { user, profile, dailyLog, setDailyLog, isOnline } = useStore();
    const { colors } = useThemeStore();
    const { showAlert } = useAlert();
    const [refreshing, setRefreshing] = useState(false);
    const [tasks, setTasks] = useState<BurnTask[]>([]);
    const [meals, setMeals] = useState<MealItem[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<GroupedTask | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [taskActionLoading, setTaskActionLoading] = useState<string | null>(null);
    const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
    const [isSyncing, setIsSyncing] = useState(false);

    const fetchDailyData = async () => {
        try {
            const data = await dailyAPI.get();
            setDailyLog(data);

            const dayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
            setWeeklyData(prev => {
                const newData = [...prev];
                newData[dayIndex] = data.calories_in || 0;
                return newData;
            });
        } catch (error) {
            console.error('Failed to fetch daily data:', error);
        }
    };

    const fetchTasks = async () => {
        try {
            const data = await mealAPI.getTasks(undefined, true);
            setTasks(data.tasks || []);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        }
    };

    const fetchMeals = async () => {
        try {
            const data = await mealAPI.getHistory(50, 0);
            // Filter today's meals
            const today = new Date().toDateString();
            const todayMeals = (data.meals || []).filter((meal: MealItem) =>
                new Date(meal.created_at).toDateString() === today
            );
            setMeals(todayMeals);
        } catch (error) {
            console.error('Failed to fetch meals:', error);
        }
    };

    // Health Connect Sync
    const handleHealthSync = async () => {
        if (Platform.OS !== 'android') {
            showAlert({
                title: 'Not Supported',
                message: 'Health Connect is only available on Android.',
                type: 'warning',
            });
            return;
        }

        setIsSyncing(true);
        try {
            // Initialize first
            await initializeHealthConnect();

            const result = await performSync();

            if (result.success && result.data) {
                // Refresh daily data to show updated steps/calories
                await fetchDailyData();

                showAlert({
                    title: 'Sync Complete',
                    message: `Synced ${result.data.steps.toLocaleString()} steps, ${result.data.caloriesBurned} cal burned`,
                    type: 'success',
                });
            } else {
                showAlert({
                    title: 'Sync Failed',
                    message: result.error || 'Unable to sync health data.',
                    type: 'error',
                });
            }
        } catch (error) {
            console.error('Health sync failed:', error);
            showAlert({
                title: 'Sync Failed',
                message: 'An error occurred during sync.',
                type: 'error',
            });
        } finally {
            setIsSyncing(false);
        }
    };

    const deleteTask = async (taskId: string) => {
        setTaskActionLoading(taskId);
        try {
            await mealAPI.deleteTask(taskId);
            await Promise.all([fetchTasks(), fetchDailyData()]);
        } catch (error) {
            console.error('Failed to delete task:', error);
        } finally {
            setTaskActionLoading(null);
        }
    };

    const completeTask = async (taskId: string) => {
        setTaskActionLoading(taskId);
        try {
            await mealAPI.updateTask(taskId, 'completed');
            await Promise.all([fetchTasks(), fetchDailyData()]);
        } catch (error) {
            console.error('Failed to complete task:', error);
        } finally {
            setTaskActionLoading(null);
        }
    };

    const completeAllInGroup = async (group: GroupedTask) => {
        setTaskActionLoading('all');
        try {
            for (const task of group.tasks) {
                await mealAPI.updateTask(task.id, 'completed');
            }
            setSelectedGroup(null);
            await Promise.all([fetchTasks(), fetchDailyData()]);
        } catch (error) {
            console.error('Failed to complete tasks:', error);
        } finally {
            setTaskActionLoading(null);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (user) {
                setIsLoading(true);
                Promise.all([fetchDailyData(), fetchTasks(), fetchMeals()]).finally(() => setIsLoading(false));
            }
        }, [user])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchDailyData(), fetchTasks(), fetchMeals()]);
        setRefreshing(false);
    };

    const groupedTasks: GroupedTask[] = tasks
        .filter(t => t.status !== 'completed')
        .reduce((groups: GroupedTask[], task) => {
            const existingGroup = groups.find(g => g.name === task.name);
            if (existingGroup) {
                existingGroup.tasks.push(task);
                existingGroup.total_duration += task.duration_minutes;
                existingGroup.total_calories += task.calories_to_burn;
                existingGroup.total_steps += task.steps || 0;
            } else {
                groups.push({
                    name: task.name,
                    task_type: task.task_type,
                    total_duration: task.duration_minutes,
                    total_calories: task.calories_to_burn,
                    total_steps: task.steps || 0,
                    tasks: [task],
                });
            }
            return groups;
        }, []);

    const completedTasks = tasks.filter(t => t.status === 'completed');
    const calorieTarget = profile?.daily_calorie_target || 2000;
    const caloriesIn = dailyLog?.calories_in || 0;
    const caloriesOut = dailyLog?.calories_out || 0;
    const netCalories = caloriesIn - caloriesOut;
    const remaining = Math.max(calorieTarget - netCalories, 0);
    const overCalories = Math.max(netCalories - calorieTarget, 0);
    const isOverTarget = netCalories > calorieTarget;

    // Extract active vs total calories from google_fit_data for BMR breakdown
    const googleFitData = dailyLog?.google_fit_data as any;
    const activeCalories = googleFitData?.active_calories || 0;
    const totalCaloriesBurned = caloriesOut;
    const restingCalories = Math.max(totalCaloriesBurned - activeCalories, 0);

    // Check if user met their goal (within 50 cal tolerance)
    const goalMet = netCalories >= calorieTarget - 50 && netCalories <= calorieTarget + 50 && caloriesIn > 0;

    // Confetti once-per-day tracking
    const [confettiShown, setConfettiShown] = useState(false);
    const showConfetti = goalMet && !confettiShown;

    useEffect(() => {
        const todayKey = `confetti_shown_${new Date().toISOString().split('T')[0]}`;
        AsyncStorage.getItem(todayKey).then((val) => {
            if (val === 'true') setConfettiShown(true);
        });
    }, []);

    useEffect(() => {
        if (goalMet && !confettiShown) {
            const todayKey = `confetti_shown_${new Date().toISOString().split('T')[0]}`;
            AsyncStorage.setItem(todayKey, 'true');
            setConfettiShown(true);
        }
    }, [goalMet]);

    // Stat card info popup
    const [statCardInfo, setStatCardInfo] = useState<{
        visible: boolean;
        title: string;
        description: string;
        color: string;
    }>({ visible: false, title: '', description: '', color: '' });

    const showStatCardInfo = (type: 'intake' | 'burned' | 'goal_left') => {
        const infos = {
            intake: {
                title: 'Calorie Intake',
                description: `Total calories from food & drinks today — ${formatCalories(caloriesIn)} Cal so far. Log meals to keep this accurate!`,
                color: '#22c55e',
            },
            burned: {
                title: 'Calories Burned',
                description: `Your body burned ${formatCalories(caloriesOut)} Cal today — even at rest!\n\n🏠 Resting: ${formatCalories(restingCalories)} Cal (breathing, digestion)\n🏃 Exercise: ${formatCalories(activeCalories)} Cal (walking, workouts)`,
                color: '#f59e0b',
            },
            goal_left: {
                title: 'Calories You Can Still Eat',
                description: `You can eat ${formatCalories(remaining)} Cal more and stay within your ${formatCalories(calorieTarget)} Cal goal.`,
                color: isOverTarget ? '#d97706' : colors.primary,
            },
        };
        setStatCardInfo({ visible: true, ...infos[type] });
    };

    // Calculate macros from today's meals
    const totalMacros = meals.reduce((acc, meal) => ({
        protein: acc.protein + (meal.macros?.p || 0),
        carbs: acc.carbs + (meal.macros?.c || 0),
        fat: acc.fat + (meal.macros?.f || 0),
    }), { protein: 0, carbs: 0, fat: 0 });

    // Macro targets
    const macroTargets = {
        protein: Math.round((calorieTarget * 0.3) / 4),
        carbs: Math.round((calorieTarget * 0.4) / 4),
        fat: Math.round((calorieTarget * 0.3) / 9),
    };

    const waterTarget = profile?.daily_water_target || 2500;
    const waterMl = dailyLog?.water_ml || 0;

    // Calculate activity stats
    const totalSteps = dailyLog?.steps || 0;
    const totalActiveMinutes = dailyLog?.active_minutes || 0;
    const totalWorkoutMinutes = completedTasks.reduce((sum, t) => sum + t.duration_minutes, 0);

    const markdownStyles = {
        body: { color: colors.mutedForeground, fontSize: 14, lineHeight: 20 },
        heading1: { color: colors.foreground, fontSize: 18, fontWeight: 'bold' as const },
        heading2: { color: colors.foreground, fontSize: 16, fontWeight: '600' as const },
        strong: { fontWeight: 'bold' as const, color: colors.foreground },
    };

    if (isLoading) {
        return <DashboardSkeleton colors={colors} />;
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Confetti celebration when goal is met - once per day */}
            <Confetti visible={showConfetti} />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 24 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                {/* Header with Avatar - Compact */}
                <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        {/* Avatar */}
                        <TouchableOpacity
                            onPress={() => router.push('/(tabs)/profile')}
                            style={{
                                marginRight: 10,
                                borderRadius: 20,
                                overflow: 'hidden',
                                borderWidth: 2,
                                borderColor: colors.primary,
                            }}
                        >
                            <Avatar
                                gender={profile?.gender}
                                age={profile?.age}
                                size={40}
                                name={user?.email || ''}
                            />
                        </TouchableOpacity>

                        {/* Greeting */}
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.foreground }}>
                                {user?.email?.split('@')[0] || 'Welcome'}!
                            </Text>
                            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 1 }}>
                                Track your progress
                            </Text>
                        </View>

                        {/* Online Status */}
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: colors.secondary,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 16
                        }}>
                            <View style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: isOnline ? '#22c55e' : '#ef4444',
                                marginRight: 6
                            }} />
                            <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '500' }}>
                                {isOnline ? 'Online' : 'Offline'}
                            </Text>
                        </View>

                        {/* Health Sync Button */}
                        {Platform.OS === 'android' && (
                            <TouchableOpacity
                                onPress={handleHealthSync}
                                disabled={isSyncing}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: colors.primary,
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 16,
                                    marginLeft: 8,
                                    opacity: isSyncing ? 0.7 : 1,
                                }}
                            >
                                {isSyncing ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <RefreshCw size={14} color="#fff" />
                                )}
                                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', marginLeft: 4 }}>
                                    Sync
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Smart Notifications */}
                    <SmartNotifications
                        data={{
                            caloriesIn,
                            caloriesOut,
                            calorieTarget,
                            steps: totalSteps,
                            waterMl,
                            waterTarget,
                            userName: user?.email || '',
                            activeCalories,
                            totalCalories: totalCaloriesBurned,
                        }}
                        colors={colors}
                    />

                    {/* Calorie Progress Card */}
                    <View style={{ backgroundColor: colors.secondary, borderRadius: 20, padding: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Target size={18} color={colors.primary} />
                            <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 15, marginLeft: 8 }}>
                                Today's Calorie Goal
                            </Text>
                        </View>

                        {/* Circular Progress - Now uses NET calories (eaten - burned) */}
                        <CircularProgress
                            consumed={caloriesIn}
                            target={calorieTarget}
                            burned={caloriesOut}
                            restingCal={restingCalories}
                            exerciseCal={activeCalories}
                            size={160}
                            strokeWidth={14}
                            colors={colors}
                        />

                        {/* Stats Cards - Clickable with descriptions */}
                        <View style={{ flexDirection: 'row', marginTop: 20, gap: 8 }}>
                            {/* Intake */}
                            <TouchableOpacity
                                onPress={() => showStatCardInfo('intake')}
                                activeOpacity={0.7}
                                style={{
                                    flex: 1,
                                    backgroundColor: colors.muted,
                                    borderRadius: 12,
                                    padding: 12,
                                    alignItems: 'center',
                                }}
                            >
                                <Zap size={18} color="#22c55e" style={{ marginBottom: 4 }} />
                                <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 18 }}>
                                    {formatCalories(caloriesIn)}
                                </Text>
                                <Text style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 1 }}>Cal</Text>
                                <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Intake</Text>
                            </TouchableOpacity>

                            {/* Burned */}
                            <TouchableOpacity
                                onPress={() => showStatCardInfo('burned')}
                                activeOpacity={0.7}
                                style={{
                                    flex: 1,
                                    backgroundColor: colors.muted,
                                    borderRadius: 12,
                                    padding: 12,
                                    alignItems: 'center',
                                }}
                            >
                                <Flame size={18} color="#f59e0b" style={{ marginBottom: 4 }} />
                                <Text style={{ color: '#f59e0b', fontWeight: '700', fontSize: 18 }}>
                                    {formatCalories(caloriesOut)}
                                </Text>
                                <Text style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 1 }}>Cal</Text>
                                <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Burned</Text>
                            </TouchableOpacity>

                            {/* Goal Left or Exceeded */}
                            <TouchableOpacity
                                onPress={() => showStatCardInfo('goal_left')}
                                activeOpacity={0.7}
                                style={{
                                    flex: 1,
                                    backgroundColor: isOverTarget ? '#fef3c7' : colors.muted,
                                    borderRadius: 12,
                                    padding: 12,
                                    alignItems: 'center',
                                }}
                            >
                                {isOverTarget ? (
                                    <AlertCircle size={18} color="#d97706" style={{ marginBottom: 4 }} />
                                ) : (
                                    <Target size={18} color={colors.primary} style={{ marginBottom: 4 }} />
                                )}
                                <Text style={{
                                    color: isOverTarget ? '#d97706' : colors.primary,
                                    fontWeight: '700',
                                    fontSize: 18
                                }}>
                                    {isOverTarget ? `+${formatCalories(overCalories)}` : formatCalories(remaining)}
                                </Text>
                                <Text style={{ color: isOverTarget ? '#92400e' : colors.mutedForeground, fontSize: 9, marginTop: 1 }}>Cal</Text>
                                <Text style={{
                                    color: isOverTarget ? '#92400e' : colors.mutedForeground,
                                    fontSize: 11
                                }}>
                                    {isOverTarget ? 'Exceeded' : 'Goal Left'}
                                </Text>
                            </TouchableOpacity>
                        </View>


                        {/* Explanation Text */}
                        {isOverTarget && (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#fef3c7',
                                borderRadius: 8,
                                padding: 10,
                                marginTop: 12
                            }}>
                                <AlertCircle size={16} color="#d97706" />
                                <Text style={{ color: '#92400e', fontSize: 12, marginLeft: 8, flex: 1 }}>
                                    You've exceeded your daily goal by {formatCalories(overCalories)} Cal. Consider a walk or lighter dinner!
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Activity Stats - Horizontal Scrollable */}
                <View style={{ marginTop: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
                        <Dumbbell size={18} color={colors.primary} />
                        <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                            Today's Activity
                        </Text>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16 }}
                    >
                        <ActivityStatCard
                            icon={Footprints}
                            value={totalSteps.toLocaleString()}
                            label="Steps"
                            color="#22c55e"
                            colors={colors}
                        />
                        <ActivityStatCard
                            icon={Timer}
                            value={`${totalActiveMinutes}`}
                            label="Active Min"
                            color="#3b82f6"
                            colors={colors}
                        />
                        <ActivityStatCard
                            icon={Dumbbell}
                            value={`${totalWorkoutMinutes}`}
                            label="Workout Min"
                            color="#f59e0b"
                            colors={colors}
                        />
                        <ActivityStatCard
                            icon={Heart}
                            value={formatCalories(caloriesOut)}
                            label="Cal Burned"
                            color="#ef4444"
                            colors={colors}
                        />
                        <ActivityStatCard
                            icon={Bike}
                            value={`${((totalSteps * 0.0008).toFixed(1))}`}
                            label="Km Walked"
                            color="#8b5cf6"
                            colors={colors}
                        />
                    </ScrollView>
                </View>

                {/* Today's Tasks */}
                {groupedTasks.length > 0 && (
                    <View style={{ marginTop: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
                            <Zap size={18} color={colors.primary} />
                            <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 16, marginLeft: 8, flex: 1 }}>
                                Pending Tasks
                            </Text>
                            <ChevronRight size={20} color={colors.mutedForeground} />
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 16 }}
                        >
                            {groupedTasks.map((group, index) => (
                                <TaskCard
                                    key={`task-${group.name}-${index}`}
                                    task={group}
                                    onPress={() => setSelectedGroup(group)}
                                    colors={colors}
                                />
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Completed Today - Using icons instead of emojis */}
                {completedTasks.length > 0 && (
                    <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <CircleCheck size={18} color={colors.primary} />
                            <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                                Completed Today
                            </Text>
                        </View>
                        {completedTasks.map((task) => (
                            <View
                                key={`completed-${task.id}`}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: colors.secondary,
                                    borderRadius: 12,
                                    padding: 12,
                                    marginBottom: 8,
                                }}
                            >
                                <View style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: colors.primary + '20',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 10,
                                }}>
                                    <CheckCircle size={18} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.foreground, fontWeight: '500', fontSize: 14 }}>
                                        {task.name}
                                    </Text>
                                    <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>
                                        {task.calories_to_burn} cal · {task.duration_minutes} min
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Macros & Hydration - Calculated from today's meals */}
                <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <PersonStanding size={18} color={colors.primary} />
                        <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                            Macros & Hydration
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 12, marginLeft: 'auto' }}>
                            From {meals.length} meal{meals.length !== 1 ? 's' : ''} today
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                        <ProgressBar
                            label="Protein"
                            value={totalMacros.protein}
                            max={macroTargets.protein}
                            color="#8b5cf6"
                            gradientColors={['#a78bfa', '#8b5cf6']}
                            Icon={Dumbbell}
                            colors={colors}
                        />
                        <ProgressBar
                            label="Carbs"
                            value={totalMacros.carbs}
                            max={macroTargets.carbs}
                            color="#22c55e"
                            gradientColors={['#4ade80', '#22c55e']}
                            Icon={Zap}
                            colors={colors}
                        />
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                        <ProgressBar
                            label="Fat"
                            value={totalMacros.fat}
                            max={macroTargets.fat}
                            color="#f59e0b"
                            gradientColors={['#fbbf24', '#f59e0b']}
                            Icon={Heart}
                            colors={colors}
                        />
                        <ProgressBar
                            label="Water"
                            value={Math.round(waterMl / 100) / 10}
                            max={waterTarget / 1000}
                            color="#3b82f6"
                            gradientColors={['#60a5fa', '#3b82f6']}
                            Icon={Droplets}
                            unit="L"
                            colors={colors}
                        />
                    </View>
                </View>

                {/* Weekly Overview - Moved after Macros */}
                <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                    <WeeklyBarChart data={weeklyData} target={calorieTarget} colors={colors} />
                </View>

                {/* Log Meal Button */}
                <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/meals')} style={{ borderRadius: 16, overflow: 'hidden' }}>
                        <LinearGradient
                            colors={['#22c55e', '#16a34a']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                        >
                            <Zap size={20} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16, marginLeft: 8 }}>Log a Meal</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Task Detail Modal */}
            <Modal visible={!!selectedGroup} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                            <Zap size={24} color={colors.primary} />
                            <Text style={{ flex: 1, fontSize: 18, fontWeight: 'bold', color: colors.foreground, marginLeft: 8 }}>
                                {selectedGroup?.name}
                                {selectedGroup && selectedGroup.tasks.length > 1 && ` (${selectedGroup.tasks.length} tasks)`}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedGroup(null)}>
                                <X size={24} color={colors.mutedForeground} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ padding: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
                            <LinearGradient colors={['#22c55e', '#16a34a']} style={{ borderRadius: 16, padding: 16, marginBottom: 16 }}>
                                <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>{selectedGroup?.total_calories} cal</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                                    {selectedGroup?.total_duration} minutes total
                                    {selectedGroup && selectedGroup.total_steps > 0 && ` · ${selectedGroup.total_steps.toLocaleString()} steps`}
                                </Text>
                            </LinearGradient>

                            <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 12 }}>
                                {selectedGroup && selectedGroup.tasks.length > 1 ? 'Individual Tasks:' : 'Task Details:'}
                            </Text>
                            {selectedGroup?.tasks.map((task) => (
                                <View key={task.id} style={{ backgroundColor: colors.secondary, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: task.description ? 8 : 0 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: colors.foreground, fontWeight: '600' }}>{task.duration_minutes} min · {task.calories_to_burn} cal</Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => { completeTask(task.id); if (selectedGroup.tasks.length === 1) setSelectedGroup(null); }}
                                            style={{ padding: 8 }}
                                            disabled={taskActionLoading === task.id}
                                        >
                                            {taskActionLoading === task.id ? (
                                                <ActivityIndicator size="small" color={colors.primary} />
                                            ) : (
                                                <CheckCircle size={24} color={colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => { deleteTask(task.id); if (selectedGroup.tasks.length === 1) setSelectedGroup(null); }}
                                            style={{ padding: 8 }}
                                        >
                                            <Trash2 size={20} color={colors.destructive} />
                                        </TouchableOpacity>
                                    </View>
                                    {task.description && (
                                        <Markdown style={markdownStyles}>{task.description}</Markdown>
                                    )}
                                </View>
                            ))}

                            {selectedGroup && selectedGroup.tasks.length > 1 && (
                                <TouchableOpacity
                                    onPress={() => completeAllInGroup(selectedGroup)}
                                    disabled={taskActionLoading === 'all'}
                                    style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 16, marginTop: 8, alignItems: 'center' }}
                                >
                                    {taskActionLoading === 'all' ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Complete All {selectedGroup.tasks.length} Tasks</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Stat Card Info Popup */}
            <Modal
                visible={statCardInfo.visible}
                transparent
                animationType="fade"
                onRequestClose={() => setStatCardInfo(prev => ({ ...prev, visible: false }))}
            >
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}
                    activeOpacity={1}
                    onPress={() => setStatCardInfo(prev => ({ ...prev, visible: false }))}
                >
                    <View style={{
                        backgroundColor: colors.card,
                        borderRadius: 20,
                        padding: 24,
                        borderTopWidth: 3,
                        borderTopColor: statCardInfo.color,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <View style={{
                                width: 40, height: 40, borderRadius: 20,
                                backgroundColor: statCardInfo.color + '20',
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                {statCardInfo.title === 'Calorie Intake' && <Zap size={20} color={statCardInfo.color} />}
                                {statCardInfo.title === 'Calories Burned' && <Flame size={20} color={statCardInfo.color} />}
                                {statCardInfo.title === 'Calories You Can Still Eat' && <Target size={20} color={statCardInfo.color} />}
                            </View>
                            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: 'bold', marginLeft: 12, flex: 1 }}>
                                {statCardInfo.title}
                            </Text>
                            <TouchableOpacity onPress={() => setStatCardInfo(prev => ({ ...prev, visible: false }))}>
                                <X size={20} color={colors.mutedForeground} />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 22 }}>
                            {statCardInfo.description}
                        </Text>
                        <TouchableOpacity
                            onPress={() => setStatCardInfo(prev => ({ ...prev, visible: false }))}
                            style={{
                                marginTop: 20,
                                backgroundColor: statCardInfo.color,
                                paddingVertical: 12,
                                borderRadius: 12,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Got it!</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}
