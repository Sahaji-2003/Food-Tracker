import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Droplets, Footprints, Activity, Trash2, CheckCircle, X, Zap } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';
import { router, useFocusEffect } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useThemeStore } from '@/store/useThemeStore';
import { dailyAPI, mealAPI } from '@/lib/api';
import { formatCalories, calculateCaloriePercentage } from '@/lib/utils';

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

export default function DashboardScreen() {
    const { user, profile, dailyLog, setDailyLog, isOnline } = useStore();
    const { colors } = useThemeStore();
    const [refreshing, setRefreshing] = useState(false);
    const [tasks, setTasks] = useState<BurnTask[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<GroupedTask | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [taskActionLoading, setTaskActionLoading] = useState<string | null>(null);

    const fetchDailyData = async () => {
        try {
            const data = await dailyAPI.get();
            setDailyLog(data);
        } catch (error) {
            console.error('Failed to fetch daily data:', error);
        }
    };

    const fetchTasks = async () => {
        try {
            // Fetch all tasks (pending + completed from today)
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

    // Auto-reload when screen gains focus
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

    // Group tasks by name/type
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

    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const totalCount = tasks.length;

    const calorieTarget = profile?.daily_calorie_target || 2000;
    const caloriesIn = dailyLog?.calories_in || 0;
    const caloriesOut = dailyLog?.calories_out || 0;
    const netCalories = caloriesIn - caloriesOut;
    const caloriePercentage = calculateCaloriePercentage(caloriesIn, calorieTarget);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* Header */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.foreground }}>
                        Hello, {user?.email?.split('@')[0] || 'there'}! 👋
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <View
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: isOnline ? '#22c55e' : '#ef4444',
                                marginRight: 8,
                            }}
                        />
                        <Text style={{ color: colors.mutedForeground }}>
                            {isOnline ? 'Online' : 'Offline'}
                        </Text>
                    </View>
                </View>

                {/* Calorie Overview Card */}
                <View
                    style={{
                        backgroundColor: colors.secondary,
                        borderRadius: 20,
                        padding: 20,
                        marginBottom: 16,
                    }}
                >
                    <Text style={{ fontSize: 18, fontWeight: '600', color: colors.foreground, marginBottom: 16 }}>
                        Today's Progress
                    </Text>

                    {/* Calorie Ring */}
                    <View style={{ alignItems: 'center', marginBottom: 16 }}>
                        <View
                            style={{
                                width: 160,
                                height: 160,
                                borderRadius: 80,
                                borderWidth: 8,
                                borderColor: colors.muted,
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                            }}
                        >
                            <LinearGradient
                                colors={[colors.gradientStart, colors.gradientEnd]}
                                style={{
                                    position: 'absolute',
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: 80,
                                    opacity: Math.min(caloriePercentage / 100, 1),
                                }}
                            />
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: 36, fontWeight: 'bold', color: colors.foreground }}>
                                    {formatCalories(caloriesIn)}
                                </Text>
                                <Text style={{ color: colors.mutedForeground }}>
                                    / {formatCalories(calorieTarget)} cal
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Calorie Breakdown */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                        <View style={{ alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Flame size={16} color="#f59e0b" />
                                <Text style={{ color: colors.foreground, fontWeight: '600', marginLeft: 4 }}>
                                    {formatCalories(caloriesIn)}
                                </Text>
                            </View>
                            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Consumed</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Activity size={16} color={colors.primary} />
                                <Text style={{ color: colors.foreground, fontWeight: '600', marginLeft: 4 }}>
                                    {formatCalories(caloriesOut)}
                                </Text>
                            </View>
                            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Burned</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <Text
                                style={{
                                    fontWeight: '600',
                                    color: netCalories > calorieTarget ? '#f59e0b' : colors.primary,
                                }}
                            >
                                {netCalories > 0 ? '+' : ''}{formatCalories(netCalories)}
                            </Text>
                            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Net</Text>
                        </View>
                    </View>
                </View>

                {/* Water & Steps Quick Stats */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                    <View
                        style={{
                            flex: 1,
                            backgroundColor: colors.secondary,
                            borderRadius: 16,
                            padding: 16,
                        }}
                    >
                        <Droplets size={24} color="#3b82f6" />
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.foreground, marginTop: 8 }}>
                            {dailyLog?.water_ml || 0}
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>ml water</Text>
                    </View>
                    <View
                        style={{
                            flex: 1,
                            backgroundColor: colors.secondary,
                            borderRadius: 16,
                            padding: 16,
                        }}
                    >
                        <Footprints size={24} color="#22c55e" />
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.foreground, marginTop: 8 }}>
                            {(dailyLog?.steps || 0).toLocaleString()}
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>steps</Text>
                    </View>
                </View>

                {/* My Tasks Section - Grouped */}
                {tasks.length > 0 && (
                    <View style={{ marginTop: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.foreground, flex: 1 }}>
                                My Tasks
                            </Text>
                            {totalCount > 0 && (
                                <Text style={{ color: colors.mutedForeground }}>
                                    {completedCount}/{totalCount} done
                                </Text>
                            )}
                        </View>
                        {/* Overall Progress Bar */}
                        {totalCount > 0 && (
                            <View style={{ height: 8, backgroundColor: colors.muted, borderRadius: 4, marginBottom: 12 }}>
                                <View
                                    style={{
                                        height: 8,
                                        backgroundColor: colors.primary,
                                        borderRadius: 4,
                                        width: `${(completedCount / totalCount) * 100}%`,
                                    }}
                                />
                            </View>
                        )}

                        {/* Incomplete Tasks */}
                        {groupedTasks.map((group, index) => (
                            <TouchableOpacity
                                key={`pending-${group.name}-${index}`}
                                onPress={() => setSelectedGroup(group)}
                                style={{
                                    backgroundColor: colors.secondary,
                                    borderRadius: 16,
                                    padding: 16,
                                    marginBottom: 8,
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Zap size={20} color={colors.primary} style={{ marginRight: 8 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 15 }}>
                                            {group.name}
                                            {group.tasks.length > 1 && (
                                                <Text style={{ color: colors.primary }}> ({group.tasks.length}x)</Text>
                                            )}
                                        </Text>
                                        <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 4 }}>
                                            {group.total_duration} min • {group.total_calories} cal
                                            {group.total_steps > 0 && ` • ${group.total_steps.toLocaleString()} steps`}
                                        </Text>
                                    </View>
                                    <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Details</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}

                        {/* Completed Tasks (Today) */}
                        {completedCount > 0 && (
                            <>
                                <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 8, marginBottom: 8, fontWeight: '500' }}>
                                    ✓ COMPLETED TODAY
                                </Text>
                                {tasks.filter(t => t.status === 'completed').map((task) => (
                                    <View
                                        key={`completed-${task.id}`}
                                        style={{
                                            backgroundColor: colors.secondary,
                                            borderRadius: 16,
                                            padding: 16,
                                            marginBottom: 8,
                                            opacity: 0.6,
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <CheckCircle size={20} color={colors.primary} style={{ marginRight: 8 }} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 15, textDecorationLine: 'line-through' }}>
                                                    {task.name}
                                                </Text>
                                                <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 4 }}>
                                                    {task.duration_minutes} min • {task.calories_to_burn} cal burned
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </>
                        )}
                    </View>
                )}

                {/* Quick Actions */}
                <TouchableOpacity onPress={() => router.push('/(tabs)/meals')} style={{ marginTop: 16, borderRadius: 16, overflow: 'hidden' }}>
                    <LinearGradient
                        colors={[colors.gradientStart, colors.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ paddingVertical: 16, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 18 }}>
                            📸 Log a Meal
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
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
                            {/* Combined Stats */}
                            <LinearGradient
                                colors={[colors.gradientStart, colors.gradientEnd]}
                                style={{ borderRadius: 16, padding: 16, marginBottom: 16 }}
                            >
                                <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>
                                    {selectedGroup?.total_calories} cal
                                </Text>
                                <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                                    {selectedGroup?.total_duration} minutes total
                                    {selectedGroup && selectedGroup.total_steps > 0 && ` • ${selectedGroup.total_steps.toLocaleString()} steps`}
                                </Text>
                            </LinearGradient>

                            {/* Individual Tasks */}
                            <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 12 }}>
                                {selectedGroup && selectedGroup.tasks.length > 1 ? 'Individual Tasks:' : 'Task Details:'}
                            </Text>
                            {selectedGroup?.tasks.map((task) => (
                                <View
                                    key={task.id}
                                    style={{
                                        backgroundColor: colors.secondary,
                                        borderRadius: 12,
                                        padding: 12,
                                        marginBottom: 12,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: task.description ? 8 : 0 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: colors.foreground, fontWeight: '600' }}>
                                                {task.duration_minutes} min • {task.calories_to_burn} cal
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => {
                                                completeTask(task.id);
                                                if (selectedGroup.tasks.length === 1) setSelectedGroup(null);
                                            }}
                                            style={{ padding: 8 }}
                                        >
                                            <CheckCircle size={24} color={colors.primary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                deleteTask(task.id);
                                                if (selectedGroup.tasks.length === 1) setSelectedGroup(null);
                                            }}
                                            style={{ padding: 8 }}
                                        >
                                            <Trash2 size={20} color={colors.destructive} />
                                        </TouchableOpacity>
                                    </View>
                                    {task.description && (
                                        <Markdown
                                            style={{
                                                body: { color: colors.mutedForeground, fontSize: 14, lineHeight: 20 },
                                                heading1: { color: colors.foreground, fontSize: 18, fontWeight: 'bold', marginTop: 8, marginBottom: 4 },
                                                heading2: { color: colors.foreground, fontSize: 16, fontWeight: '600', marginTop: 6, marginBottom: 3 },
                                                strong: { fontWeight: 'bold', color: colors.foreground },
                                                bullet_list: { marginLeft: 8 },
                                                ordered_list: { marginLeft: 8 },
                                                list_item: { marginBottom: 2 },
                                            }}
                                        >
                                            {task.description}
                                        </Markdown>
                                    )}
                                </View>
                            ))}

                            {/* Complete All Button */}
                            {selectedGroup && selectedGroup.tasks.length > 1 && (
                                <TouchableOpacity
                                    onPress={() => completeAllInGroup(selectedGroup)}
                                    style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 16, marginTop: 16, alignItems: 'center' }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                                        Complete All {selectedGroup.tasks.length} Tasks
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
