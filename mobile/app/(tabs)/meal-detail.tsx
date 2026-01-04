import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Flame, Trash2, CheckCircle, Zap } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';
import { useThemeStore } from '@/store/useThemeStore';
import { mealAPI } from '@/lib/api';

interface MealDetail {
    id: string;
    food_name: string;
    calories: number;
    macros: { p: number; c: number; f: number };
    plate_grade: string;
    reasoning: string;
    ingredients: string;
    image_description?: string;
    created_at: string;
    tasks: BurnTask[];
}

interface BurnTask {
    id: string;
    task_type: string;
    name: string;
    description?: string;
    duration_minutes: number;
    calories_to_burn: number;
    steps?: number;
    distance_km?: number;
    status: string;
}

export default function MealDetailScreen() {
    const { colors } = useThemeStore();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [meal, setMeal] = useState<MealDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<BurnTask | null>(null);

    const markdownStyles = {
        body: { color: colors.foreground, fontSize: 15, lineHeight: 24 },
        heading1: { color: colors.foreground, fontSize: 22, fontWeight: 'bold' as const, marginTop: 16, marginBottom: 8 },
        heading2: { color: colors.foreground, fontSize: 18, fontWeight: '600' as const, marginTop: 12, marginBottom: 6 },
        heading3: { color: colors.foreground, fontSize: 16, fontWeight: '600' as const, marginTop: 8, marginBottom: 4 },
        strong: { fontWeight: 'bold' as const, color: colors.foreground },
        bullet_list: { marginLeft: 8 },
        ordered_list: { marginLeft: 8 },
        list_item: { marginBottom: 4 },
    };

    useEffect(() => {
        if (id) loadMeal();
    }, [id]);

    const loadMeal = async () => {
        try {
            const data = await mealAPI.getMeal(id!);
            setMeal(data);
        } catch (error) {
            console.error('Failed to load meal:', error);
            Alert.alert('Error', 'Failed to load meal details');
        } finally {
            setLoading(false);
        }
    };

    const deleteMeal = () => {
        Alert.alert('Delete Meal', 'This will remove the meal and its calories. Continue?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await mealAPI.deleteMeal(id!);
                        router.back();
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete meal');
                    }
                },
            },
        ]);
    };

    const completeTask = async (taskId: string) => {
        try {
            await mealAPI.updateTask(taskId, 'completed');
            loadMeal();
        } catch (error) {
            Alert.alert('Error', 'Failed to complete task');
        }
    };

    const getGradeColor = (grade: string) => {
        const gradeColors: Record<string, string> = {
            'A+': '#22c55e', A: '#4ade80', B: '#facc15', C: '#fb923c', D: '#f87171', F: '#ef4444',
        };
        return gradeColors[grade] || '#6b7280';
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    if (!meal) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: colors.foreground }}>Meal not found</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
                    <ArrowLeft size={24} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={{ flex: 1, fontSize: 18, fontWeight: 'bold', color: colors.foreground }}>
                    Meal Details
                </Text>
                <TouchableOpacity onPress={deleteMeal} style={{ padding: 8 }}>
                    <Trash2 size={20} color={colors.destructive} />
                </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                {/* Meal Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.foreground }}>{meal.food_name}</Text>
                        <Text style={{ color: colors.mutedForeground, marginTop: 4 }}>
                            {new Date(meal.created_at).toLocaleString()}
                        </Text>
                    </View>
                    <View style={{ backgroundColor: getGradeColor(meal.plate_grade), paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{meal.plate_grade}</Text>
                    </View>
                </View>

                {/* Calories */}
                <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center' }}>
                    <Flame size={32} color="#f59e0b" />
                    <Text style={{ fontSize: 48, fontWeight: 'bold', color: colors.foreground, marginTop: 8 }}>{meal.calories}</Text>
                    <Text style={{ color: colors.mutedForeground }}>calories</Text>
                </View>

                {/* Macros */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                    {[
                        { label: 'Protein', value: meal.macros?.p || 0, color: '#3b82f6' },
                        { label: 'Carbs', value: meal.macros?.c || 0, color: '#f59e0b' },
                        { label: 'Fat', value: meal.macros?.f || 0, color: '#ef4444' },
                    ].map((macro) => (
                        <View key={macro.label} style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 12, padding: 16, alignItems: 'center' }}>
                            <Text style={{ color: macro.color, fontWeight: 'bold', fontSize: 20 }}>{macro.value}g</Text>
                            <Text style={{ color: colors.mutedForeground }}>{macro.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Reasoning */}
                <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 8 }}>Analysis</Text>
                    <Text style={{ color: colors.mutedForeground }}>{meal.reasoning}</Text>
                </View>

                {/* Ingredients */}
                {meal.ingredients && (
                    <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                        <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 8 }}>Ingredients</Text>
                        <Text style={{ color: colors.mutedForeground }}>{meal.ingredients}</Text>
                    </View>
                )}

                {/* Tasks */}
                {meal.tasks && meal.tasks.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 18, marginBottom: 12 }}>
                            Burn Tasks
                        </Text>
                        {meal.tasks.map((task) => (
                            <TouchableOpacity
                                key={task.id}
                                onPress={() => setSelectedTask(task)}
                                style={{
                                    backgroundColor: task.status === 'completed' ? colors.primary + '20' : colors.secondary,
                                    borderRadius: 16,
                                    padding: 16,
                                    marginBottom: 8,
                                    borderWidth: task.status === 'completed' ? 2 : 0,
                                    borderColor: colors.primary,
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: colors.foreground, fontWeight: '600' }}>{task.name}</Text>
                                        <Text style={{ color: colors.mutedForeground, marginTop: 4 }}>
                                            {task.duration_minutes} min • {task.calories_to_burn} cal
                                        </Text>
                                    </View>
                                    {task.status === 'completed' ? (
                                        <CheckCircle size={24} color={colors.primary} />
                                    ) : (
                                        <TouchableOpacity onPress={() => completeTask(task.id)} style={{ padding: 4 }}>
                                            <CheckCircle size={24} color={colors.mutedForeground} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <Text style={{ color: colors.primary, fontSize: 12, marginTop: 8 }}>Tap to view details</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Task Detail Modal */}
            {selectedTask && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }}>
                        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center' }}>
                            <Zap size={24} color={colors.primary} />
                            <Text style={{ flex: 1, fontSize: 18, fontWeight: 'bold', color: colors.foreground, marginLeft: 8 }}>
                                {selectedTask.name}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedTask(null)}>
                                <Text style={{ color: colors.primary, fontWeight: '600' }}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ padding: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
                            <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={{ borderRadius: 16, padding: 16, marginBottom: 16 }}>
                                <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{selectedTask.calories_to_burn} cal</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.8)' }}>{selectedTask.duration_minutes} minutes</Text>
                            </LinearGradient>
                            {selectedTask.description ? (
                                <Markdown style={markdownStyles}>
                                    {selectedTask.description}
                                </Markdown>
                            ) : (
                                <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>
                                    No detailed instructions available for this task.
                                </Text>
                            )}
                            {selectedTask.status !== 'completed' && (
                                <TouchableOpacity
                                    onPress={() => {
                                        completeTask(selectedTask.id);
                                        setSelectedTask(null);
                                    }}
                                    style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 16, marginTop: 24, alignItems: 'center' }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Mark as Completed</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}
