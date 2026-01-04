import { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Modal, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Droplets, Trash2, CheckCircle, X, Zap, ChevronRight, Eye } from 'lucide-react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import Markdown from 'react-native-markdown-display';
import { router, useFocusEffect } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useThemeStore } from '@/store/useThemeStore';
import { dailyAPI, mealAPI } from '@/lib/api';
import { formatCalories } from '@/lib/utils';

const SCREEN_WIDTH = Dimensions.get('window').width;

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

// Circular progress component with SVG
const CircularProgress = ({ percentage, size, strokeWidth, colors }: { percentage: number; size: number; strokeWidth: number; colors: any }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;

    return (
        <Svg width={size} height={size}>
            <Defs>
                <SvgLinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#22c55e" />
                    <Stop offset="100%" stopColor="#16a34a" />
                </SvgLinearGradient>
            </Defs>
            {/* Background circle */}
            <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#2a3a2a"
                strokeWidth={strokeWidth}
                fill="transparent"
            />
            {/* Progress circle */}
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
    );
};

// Weekly bar chart component
const WeeklyBarChart = ({ data, colors }: { data: number[]; colors: any }) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxValue = Math.max(...data, 1) * 1.2;
    const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    return (
        <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 14, marginBottom: 8 }}>Weekly Overview</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 4 }}>
                {data.map((value, index) => {
                    const height = Math.max((value / maxValue) * 70, 4);
                    const isToday = index === todayIndex;
                    return (
                        <View key={index} style={{ flex: 1, alignItems: 'center' }}>
                            <View
                                style={{
                                    width: '100%',
                                    height: height,
                                    backgroundColor: isToday ? '#f59e0b' : '#22c55e',
                                    borderRadius: 4,
                                    opacity: isToday ? 1 : 0.7,
                                }}
                            />
                            <Text style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 4 }}>{days[index]}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

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

// Macro/Hydration progress bar
const ProgressBar = ({ label, value, max, color, unit = 'g', colors }: { label: string; value: number; max: number; color: string; unit?: string; colors: any }) => {
    const percentage = Math.min((value / max) * 100, 100);
    return (
        <View style={{ flex: 1, marginHorizontal: 4 }}>
            <Text style={{ color: colors.foreground, fontWeight: '500', fontSize: 13, marginBottom: 6 }}>{label}</Text>
            <View style={{ height: 8, backgroundColor: colors.muted, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ height: 8, width: `${percentage}%`, backgroundColor: color, borderRadius: 4 }} />
            </View>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>
                {value}{unit} / {max}{unit}
            </Text>
        </View>
    );
};

export default function DashboardScreen() {
    const { user, profile, dailyLog, setDailyLog, isOnline } = useStore();
    const { colors } = useThemeStore();
    const [refreshing, setRefreshing] = useState(false);
    const [tasks, setTasks] = useState<BurnTask[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<GroupedTask | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [taskActionLoading, setTaskActionLoading] = useState<string | null>(null);
    const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

    const fetchDailyData = async () => {
        try {
            const data = await dailyAPI.get();
            setDailyLog(data);

            // Update today's value in weekly data
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
                Promise.all([fetchDailyData(), fetchTasks()]).finally(() => setIsLoading(false));
            }
        }, [user])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchDailyData(), fetchTasks()]);
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
    const overCalories = Math.max(caloriesIn - calorieTarget, 0);
    const caloriePercentage = (caloriesIn / calorieTarget) * 100;

    // Macro targets
    const macroTargets = {
        protein: Math.round((calorieTarget * 0.3) / 4),
        carbs: Math.round((calorieTarget * 0.4) / 4),
        fat: Math.round((calorieTarget * 0.3) / 9),
    };

    const waterTarget = profile?.daily_water_target || 2500;
    const waterMl = dailyLog?.water_ml || 0;

    const markdownStyles = {
        body: { color: colors.mutedForeground, fontSize: 14, lineHeight: 20 },
        heading1: { color: colors.foreground, fontSize: 18, fontWeight: 'bold' as const },
        heading2: { color: colors.foreground, fontSize: 16, fontWeight: '600' as const },
        strong: { fontWeight: 'bold' as const, color: colors.foreground },
    };

    if (isLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Loading dashboard...</Text>
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
                {/* Header Section */}
                <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                    {/* Greeting & Online Status */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <View>
                            <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.foreground }}>
                                Hi, {user?.email?.split('@')[0] || 'there'}!
                            </Text>
                            <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 2 }}>
                                {formatCalories(caloriesIn)} / {formatCalories(calorieTarget)} cal
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isOnline ? '#22c55e' : '#ef4444', marginRight: 6 }} />
                            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '500' }}>{isOnline ? 'Online' : 'Offline'}</Text>
                        </View>
                    </View>

                    {/* Main Stats Card */}
                    <View style={{ backgroundColor: colors.secondary, borderRadius: 20, padding: 16, marginTop: 16 }}>
                        <View style={{ flexDirection: 'row' }}>
                            {/* Circular Progress */}
                            <View style={{ alignItems: 'center', marginRight: 16 }}>
                                <View style={{ position: 'relative', width: 130, height: 130 }}>
                                    <CircularProgress percentage={caloriePercentage} size={130} strokeWidth={12} colors={colors} />
                                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#22c55e' }}>
                                            {formatCalories(caloriesIn)}
                                        </Text>
                                        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Consumed</Text>
                                    </View>
                                </View>

                                {/* Burned & Over stats */}
                                <View style={{ flexDirection: 'row', marginTop: 12, gap: 16 }}>
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 16 }}>{formatCalories(caloriesOut)}</Text>
                                        <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Burned</Text>
                                    </View>
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ color: overCalories > 0 ? '#f59e0b' : colors.foreground, fontWeight: '600', fontSize: 16 }}>
                                            +{formatCalories(overCalories)}
                                        </Text>
                                        <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Over</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Weekly Chart */}
                            <WeeklyBarChart data={weeklyData} colors={colors} />
                        </View>

                        {/* View Weekly Review Button */}
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#22c55e',
                                borderRadius: 12,
                                paddingVertical: 12,
                                marginTop: 16,
                            }}
                        >
                            <Eye size={18} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 8 }}>View Weekly Review</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Today's Activity & Tasks */}
                {groupedTasks.length > 0 && (
                    <View style={{ marginTop: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
                            <Zap size={18} color={colors.primary} />
                            <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 16, marginLeft: 8, flex: 1 }}>
                                Today's Activity & Tasks
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

                {/* Completed Today */}
                {completedTasks.length > 0 && (
                    <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                        <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 16, marginBottom: 12 }}>
                            Completed Today
                        </Text>
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
                                <CheckCircle size={20} color={colors.primary} style={{ marginRight: 10 }} />
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

                {/* Macros & Hydration */}
                <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 16, marginBottom: 12 }}>
                        Macros & Hydration
                    </Text>
                    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <ProgressBar
                            label="Protein"
                            value={dailyLog?.protein || 0}
                            max={macroTargets.protein}
                            color="#8b5cf6"
                            colors={colors}
                        />
                        <ProgressBar
                            label="Carbs"
                            value={dailyLog?.carbs || 0}
                            max={macroTargets.carbs}
                            color="#22c55e"
                            colors={colors}
                        />
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                        <ProgressBar
                            label="Fat"
                            value={dailyLog?.fat || 0}
                            max={macroTargets.fat}
                            color="#f59e0b"
                            colors={colors}
                        />
                        <ProgressBar
                            label="Water"
                            value={Math.round(waterMl / 1000 * 10) / 10}
                            max={waterTarget / 1000}
                            color="#3b82f6"
                            unit="L"
                            colors={colors}
                        />
                    </View>
                </View>

                {/* Log Meal Button */}
                <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/meals')} style={{ borderRadius: 16, overflow: 'hidden' }}>
                        <LinearGradient
                            colors={['#22c55e', '#16a34a']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ paddingVertical: 16, alignItems: 'center' }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>📸 Log a Meal</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Task Detail Modal - keeping existing functionality */}
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
