import { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Modal, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Trash2, CheckCircle, X, Zap, ChevronRight, TrendingUp, Target, AlertCircle,
    Footprints, Timer, Dumbbell, Bike, PersonStanding, Heart, Flame,
    CircleCheck, User, Users,
    Droplets
} from 'lucide-react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Rect, Path, G } from 'react-native-svg';
import Markdown from 'react-native-markdown-display';
import { router, useFocusEffect } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useThemeStore } from '@/store/useThemeStore';
import { dailyAPI, mealAPI } from '@/lib/api';
import { formatCalories } from '@/lib/utils';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Avatar component using SVG - generates unique avatars based on user data
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
    // Generate colors based on name/gender
    const colors = [
        ['#FF6B6B', '#FF8E8E'], // Red
        ['#4ECDC4', '#7EDDD6'], // Teal
        ['#45B7D1', '#6BC5D8'], // Blue
        ['#96CEB4', '#B3DCC7'], // Green
        ['#DDA0DD', '#E8C1E8'], // Plum
        ['#F7DC6F', '#FAE89F'], // Yellow
        ['#BB8FCE', '#D0AEDA'], // Purple
        ['#85C1E9', '#A9D4EE'], // Light Blue
        ['#F8B500', '#FAC842'], // Gold
    ];

    const colorIndex = (name?.length || 0) % colors.length;
    const [bgColor, accentColor] = colors[colorIndex];

    // Determine avatar style based on gender
    const isMale = gender === 'male';
    const isFemale = gender === 'female';

    return (
        <Svg width={size} height={size} viewBox="0 0 100 100">
            <Defs>
                <SvgLinearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={bgColor} />
                    <Stop offset="100%" stopColor={accentColor} />
                </SvgLinearGradient>
            </Defs>
            {/* Background circle */}
            <Circle cx="50" cy="50" r="48" fill="url(#avatarGrad)" />
            {/* Face */}
            <Circle cx="50" cy="42" r="22" fill="#FFE4C4" />
            {/* Hair */}
            {isFemale ? (
                <Path d="M28 35 Q28 15 50 15 Q72 15 72 35 L72 40 Q60 35 50 35 Q40 35 28 40 Z" fill="#4A3728" />
            ) : isMale ? (
                <Path d="M30 32 Q30 18 50 18 Q70 18 70 32 L70 35 Q60 30 50 30 Q40 30 30 35 Z" fill="#3D2914" />
            ) : (
                <Path d="M32 34 Q32 20 50 20 Q68 20 68 34 L68 38 Q58 33 50 33 Q42 33 32 38 Z" fill="#5D4E37" />
            )}
            {/* Eyes */}
            <Circle cx="40" cy="42" r="3" fill="#3D3D3D" />
            <Circle cx="60" cy="42" r="3" fill="#3D3D3D" />
            {/* Smile */}
            <Path d="M40 52 Q50 60 60 52" stroke="#3D3D3D" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Body */}
            <Path d="M30 85 Q30 70 50 68 Q70 70 70 85 L70 100 L30 100 Z" fill={bgColor} />
        </Svg>
    );
};

// Loading animation component
const LoadingAnimation = ({ colors }: { colors: any }) => {
    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={120} height={120} viewBox="0 0 100 100">
                <Defs>
                    <SvgLinearGradient id="loadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#22c55e" />
                        <Stop offset="100%" stopColor="#16a34a" />
                    </SvgLinearGradient>
                </Defs>
                {/* Animated circles */}
                <Circle cx="50" cy="50" r="40" stroke="#1f2937" strokeWidth="8" fill="none" />
                <Circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="url(#loadGrad)"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray="200"
                    strokeDashoffset="150"
                    strokeLinecap="round"
                />
                {/* Center icon */}
                <G transform="translate(35, 35)">
                    <Path
                        d="M15 0 L18 10 L30 10 L20 16 L24 28 L15 20 L6 28 L10 16 L0 10 L12 10 Z"
                        fill="#22c55e"
                    />
                </G>
            </Svg>
            <Text style={{ color: colors.mutedForeground, marginTop: 16, fontSize: 14 }}>
                Loading your dashboard...
            </Text>
        </View>
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

// Enhanced Circular progress component
const CircularProgress = ({
    consumed,
    target,
    burned,
    size,
    strokeWidth,
    colors
}: {
    consumed: number;
    target: number;
    burned: number;
    size: number;
    strokeWidth: number;
    colors: any;
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const netCalories = consumed - burned;
    const percentage = Math.min((netCalories / target) * 100, 100);
    const strokeDashoffset = circumference - (Math.max(percentage, 0) / 100) * circumference;
    const isOver = netCalories > target;

    return (
        <View style={{ alignItems: 'center' }}>
            <View style={{ position: 'relative', width: size, height: size }}>
                <Svg width={size} height={size}>
                    <Defs>
                        <SvgLinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={isOver ? '#f59e0b' : '#22c55e'} />
                            <Stop offset="100%" stopColor={isOver ? '#ea580c' : '#16a34a'} />
                        </SvgLinearGradient>
                    </Defs>
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="#2a3a2a"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="url(#progressGradient)"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                </Svg>
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: isOver ? '#f59e0b' : '#22c55e' }}>
                        {formatCalories(netCalories)}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>
                        Net Calories
                    </Text>
                </View>
            </View>
        </View>
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
    const [refreshing, setRefreshing] = useState(false);
    const [tasks, setTasks] = useState<BurnTask[]>([]);
    const [meals, setMeals] = useState<MealItem[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<GroupedTask | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [taskActionLoading, setTaskActionLoading] = useState<string | null>(null);
    const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

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
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <LoadingAnimation colors={colors} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 24 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                {/* Header with Avatar */}
                <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        {/* Avatar */}
                        <TouchableOpacity
                            onPress={() => router.push('/(tabs)/profile')}
                            style={{
                                marginRight: 12,
                                borderRadius: 28,
                                overflow: 'hidden',
                                borderWidth: 2,
                                borderColor: colors.primary,
                            }}
                        >
                            <Avatar
                                gender={profile?.gender}
                                age={profile?.age}
                                size={56}
                                name={user?.email || ''}
                            />
                        </TouchableOpacity>

                        {/* Greeting */}
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.foreground }}>
                                Hi, {user?.email?.split('@')[0] || 'there'}!
                            </Text>
                            <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 2 }}>
                                Let's track your progress today
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
                    </View>

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
                            size={160}
                            strokeWidth={14}
                            colors={colors}
                        />

                        {/* Stats Cards */}
                        <View style={{ flexDirection: 'row', marginTop: 20, gap: 8 }}>
                            {/* Eaten */}
                            <View style={{
                                flex: 1,
                                backgroundColor: colors.muted,
                                borderRadius: 12,
                                padding: 12,
                                alignItems: 'center',
                            }}>
                                <Zap size={18} color="#22c55e" style={{ marginBottom: 4 }} />
                                <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 18 }}>
                                    {formatCalories(caloriesIn)}
                                </Text>
                                <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Eaten</Text>
                            </View>

                            {/* Burned */}
                            <View style={{
                                flex: 1,
                                backgroundColor: colors.muted,
                                borderRadius: 12,
                                padding: 12,
                                alignItems: 'center',
                            }}>
                                <Flame size={18} color="#f59e0b" style={{ marginBottom: 4 }} />
                                <Text style={{ color: '#f59e0b', fontWeight: '700', fontSize: 18 }}>
                                    {formatCalories(caloriesOut)}
                                </Text>
                                <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Burned</Text>
                            </View>

                            {/* Remaining or Exceeded */}
                            <View style={{
                                flex: 1,
                                backgroundColor: isOverTarget ? '#fef3c7' : colors.muted,
                                borderRadius: 12,
                                padding: 12,
                                alignItems: 'center',
                            }}>
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
                                <Text style={{
                                    color: isOverTarget ? '#92400e' : colors.mutedForeground,
                                    fontSize: 11
                                }}>
                                    {isOverTarget ? 'Exceeded' : 'Remaining'}
                                </Text>
                            </View>
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
                                    You've exceeded your daily goal by {formatCalories(overCalories)} cal (after subtracting burned calories). Consider more exercise!
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
        </SafeAreaView>
    );
}
