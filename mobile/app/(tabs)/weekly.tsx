import { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { TrendingUp, TrendingDown, Target, Flame, Footprints, CheckCircle, AlertCircle } from 'lucide-react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useStore } from '@/store/useStore';
import { useThemeStore } from '@/store/useThemeStore';
import { dailyAPI } from '@/lib/api';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface WeeklyData {
    totalCaloriesIn: number;
    totalCaloriesOut: number;
    totalSteps: number;
    dailyData: {
        date: string;
        day: string;
        caloriesIn: number;
        caloriesOut: number;
        steps: number;
    }[];
    weeklyGoal: number;
    averageCaloriesIn: number;
    averageCaloriesOut: number;
}

// Nested Circular Progress Component
const NestedCircularProgress = ({
    innerValue,
    innerMax,
    innerLabel,
    innerColor,
    outerValue,
    outerMax,
    outerLabel,
    outerColor,
    size = 180,
    colors,
}: {
    innerValue: number;
    innerMax: number;
    innerLabel: string;
    innerColor: string;
    outerValue: number;
    outerMax: number;
    outerLabel: string;
    outerColor: string;
    size?: number;
    colors: any;
}) => {
    const outerStrokeWidth = 16;
    const innerStrokeWidth = 12;
    const gap = 8;

    const outerRadius = (size - outerStrokeWidth) / 2;
    const innerRadius = outerRadius - outerStrokeWidth - gap;

    const outerCircumference = 2 * Math.PI * outerRadius;
    const innerCircumference = 2 * Math.PI * innerRadius;

    const outerProgress = Math.min(outerValue / outerMax, 1);
    const innerProgress = Math.min(innerValue / innerMax, 1);

    const outerStrokeDashoffset = outerCircumference * (1 - outerProgress);
    const innerStrokeDashoffset = innerCircumference * (1 - innerProgress);

    return (
        <View style={{ alignItems: 'center' }}>
            <Svg width={size} height={size}>
                <Defs>
                    <LinearGradient id="outerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor={outerColor} />
                        <Stop offset="100%" stopColor={outerColor} stopOpacity="0.7" />
                    </LinearGradient>
                    <LinearGradient id="innerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor={innerColor} />
                        <Stop offset="100%" stopColor={innerColor} stopOpacity="0.7" />
                    </LinearGradient>
                </Defs>

                {/* Outer Background */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={outerRadius}
                    stroke={colors.muted}
                    strokeWidth={outerStrokeWidth}
                    fill="none"
                />
                {/* Outer Progress */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={outerRadius}
                    stroke="url(#outerGrad)"
                    strokeWidth={outerStrokeWidth}
                    fill="none"
                    strokeDasharray={outerCircumference}
                    strokeDashoffset={outerStrokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90, ${size / 2}, ${size / 2})`}
                />

                {/* Inner Background */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={innerRadius}
                    stroke={colors.muted}
                    strokeWidth={innerStrokeWidth}
                    fill="none"
                />
                {/* Inner Progress */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={innerRadius}
                    stroke="url(#innerGrad)"
                    strokeWidth={innerStrokeWidth}
                    fill="none"
                    strokeDasharray={innerCircumference}
                    strokeDashoffset={innerStrokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90, ${size / 2}, ${size / 2})`}
                />
            </Svg>

            {/* Center Text */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.foreground }}>
                    {Math.round((outerValue - innerValue))}
                </Text>
                <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Net Cal</Text>
            </View>

            {/* Legend */}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: outerColor }} />
                    <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{outerLabel}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: innerColor }} />
                    <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{innerLabel}</Text>
                </View>
            </View>
        </View>
    );
};

// Simple Bar Chart
const SimpleBarChart = ({
    data,
    barColor,
    label,
    colors,
}: {
    data: { label: string; value: number }[];
    barColor: string;
    label: string;
    colors: any;
}) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const barWidth = (SCREEN_WIDTH - 80) / data.length - 6;

    return (
        <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground, marginBottom: 12 }}>
                {label}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 }}>
                {data.map((item, index) => {
                    const height = Math.max((item.value / maxValue) * 80, 4);
                    return (
                        <View key={index} style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 9, color: colors.mutedForeground, marginBottom: 4 }}>
                                {item.value > 999 ? `${(item.value / 1000).toFixed(1)}k` : item.value}
                            </Text>
                            <View
                                style={{
                                    width: barWidth,
                                    height: height,
                                    backgroundColor: barColor,
                                    borderRadius: 4,
                                }}
                            />
                            <Text style={{ fontSize: 9, color: colors.mutedForeground, marginTop: 4 }}>
                                {item.label}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

export default function WeeklyScreen() {
    const { profile } = useStore();
    const { colors } = useThemeStore();
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);

    const calorieGoal = profile?.daily_calorie_target || 2000;
    const weeklyGoal = calorieGoal * 7;

    const fetchWeeklyData = async () => {
        try {
            // Get last 7 days of data
            const days = [];
            const dailyDataArray = [];

            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const dayName = date.toLocaleDateString('en', { weekday: 'short' });
                days.push({ date: dateStr, day: dayName });
            }

            let totalIn = 0;
            let totalOut = 0;
            let totalSteps = 0;

            for (const day of days) {
                try {
                    const data = await dailyAPI.get(day.date);
                    const caloriesIn = data?.calories_in || 0;
                    const caloriesOut = data?.calories_out || 0;
                    const steps = data?.steps || 0;

                    totalIn += caloriesIn;
                    totalOut += caloriesOut;
                    totalSteps += steps;

                    dailyDataArray.push({
                        date: day.date,
                        day: day.day,
                        caloriesIn,
                        caloriesOut,
                        steps,
                    });
                } catch (e) {
                    dailyDataArray.push({
                        date: day.date,
                        day: day.day,
                        caloriesIn: 0,
                        caloriesOut: 0,
                        steps: 0,
                    });
                }
            }

            setWeeklyData({
                totalCaloriesIn: totalIn,
                totalCaloriesOut: totalOut,
                totalSteps: totalSteps,
                dailyData: dailyDataArray,
                weeklyGoal: weeklyGoal,
                averageCaloriesIn: Math.round(totalIn / 7),
                averageCaloriesOut: Math.round(totalOut / 7),
            });
        } catch (error) {
            console.error('Failed to fetch weekly data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchWeeklyData();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchWeeklyData();
        setRefreshing(false);
    };

    const netCalories = (weeklyData?.totalCaloriesIn || 0) - (weeklyData?.totalCaloriesOut || 0);
    const goalDifference = netCalories - weeklyGoal;
    const isOnTrack = goalDifference <= weeklyGoal * 0.1; // Within 10% of goal

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                {/* Header */}
                <View style={{ paddingTop: 8, paddingBottom: 16 }}>
                    <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.foreground }}>
                        Weekly Overview
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                        Last 7 days analytics
                    </Text>
                </View>

                {/* Main Circular Progress */}
                <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 16 }}>
                    <NestedCircularProgress
                        outerValue={weeklyData?.totalCaloriesIn || 0}
                        outerMax={weeklyGoal}
                        outerLabel="Intake"
                        outerColor={colors.primary}
                        innerValue={weeklyData?.totalCaloriesOut || 0}
                        innerMax={weeklyGoal * 0.3}
                        innerLabel="Burned"
                        innerColor="#f97316"
                        size={180}
                        colors={colors}
                    />

                    {/* Goal Status */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: isOnTrack ? '#dcfce7' : '#fef3c7',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                        marginTop: 16,
                    }}>
                        {isOnTrack ? (
                            <CheckCircle size={16} color="#22c55e" />
                        ) : (
                            <AlertCircle size={16} color="#f59e0b" />
                        )}
                        <Text style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: isOnTrack ? '#15803d' : '#b45309',
                            marginLeft: 6,
                        }}>
                            {isOnTrack ? 'On Track!' : goalDifference > 0 ? `${goalDifference} cal over goal` : `${Math.abs(goalDifference)} cal under goal`}
                        </Text>
                    </View>
                </View>

                {/* Stats Cards */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                    {/* Total Intake */}
                    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Flame size={16} color={colors.primary} />
                            <Text style={{ fontSize: 11, color: colors.mutedForeground, marginLeft: 6 }}>Total Intake</Text>
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.foreground }}>
                            {(weeklyData?.totalCaloriesIn || 0).toLocaleString()}
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.mutedForeground }}>cal this week</Text>
                    </View>

                    {/* Total Burned */}
                    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <TrendingDown size={16} color="#f97316" />
                            <Text style={{ fontSize: 11, color: colors.mutedForeground, marginLeft: 6 }}>Total Burned</Text>
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.foreground }}>
                            {(weeklyData?.totalCaloriesOut || 0).toLocaleString()}
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.mutedForeground }}>cal this week</Text>
                    </View>
                </View>

                {/* More Stats */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                    {/* Total Steps */}
                    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Footprints size={16} color="#06b6d4" />
                            <Text style={{ fontSize: 11, color: colors.mutedForeground, marginLeft: 6 }}>Total Steps</Text>
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.foreground }}>
                            {(weeklyData?.totalSteps || 0).toLocaleString()}
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.mutedForeground }}>steps this week</Text>
                    </View>

                    {/* Weekly Goal */}
                    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Target size={16} color="#8b5cf6" />
                            <Text style={{ fontSize: 11, color: colors.mutedForeground, marginLeft: 6 }}>Weekly Goal</Text>
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.foreground }}>
                            {weeklyGoal.toLocaleString()}
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.mutedForeground }}>cal target</Text>
                    </View>
                </View>

                {/* Daily Intake Chart */}
                <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                    <SimpleBarChart
                        data={(weeklyData?.dailyData || []).map(d => ({ label: d.day, value: d.caloriesIn }))}
                        barColor={colors.primary}
                        label="📊 Daily Calorie Intake"
                        colors={colors}
                    />
                </View>

                {/* Daily Steps Chart */}
                <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                    <SimpleBarChart
                        data={(weeklyData?.dailyData || []).map(d => ({ label: d.day, value: d.steps }))}
                        barColor="#06b6d4"
                        label="🚶 Daily Steps"
                        colors={colors}
                    />
                </View>

                {/* Daily Averages */}
                <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground, marginBottom: 12 }}>
                        📈 Daily Averages
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
                                {weeklyData?.averageCaloriesIn || 0}
                            </Text>
                            <Text style={{ fontSize: 10, color: colors.mutedForeground }}>Avg Intake</Text>
                        </View>
                        <View style={{ width: 1, backgroundColor: colors.border }} />
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#f97316' }}>
                                {weeklyData?.averageCaloriesOut || 0}
                            </Text>
                            <Text style={{ fontSize: 10, color: colors.mutedForeground }}>Avg Burned</Text>
                        </View>
                        <View style={{ width: 1, backgroundColor: colors.border }} />
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#06b6d4' }}>
                                {Math.round((weeklyData?.totalSteps || 0) / 7).toLocaleString()}
                            </Text>
                            <Text style={{ fontSize: 10, color: colors.mutedForeground }}>Avg Steps</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
