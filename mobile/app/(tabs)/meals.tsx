import { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ScrollView,
    ActivityIndicator,
    Alert,
    TextInput,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, X, Flame, Zap, Check, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useThemeStore } from '@/store/useThemeStore';
import { mealAPI } from '@/lib/api';

interface MealItem {
    name: string;
    calories: number;
    quantity?: string;
}

interface BurnTask {
    type: string;
    name: string;
    duration_minutes: number;
    calories_to_burn: number;
    distance_km?: number;
    steps?: number;
}

interface MealAnalysis {
    food: string;
    image_description?: string;
    items?: MealItem[];
    total_calories?: number;
    calories?: number;
    macros: { p: number; c: number; f: number };
    plate_grade: string;
    reasoning: string;
    ingredients: string;
    excess_calories?: number;
    tasks?: BurnTask[];
    meal_id?: string;
}

interface MealHistoryItem {
    id: string;
    food_name: string;
    calories: number;
    macros: { p: number; c: number; f: number };
    plate_grade: string;
    created_at: string;
    image_description?: string;
}

export default function MealsScreen() {
    const { colors } = useThemeStore();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [mealHistory, setMealHistory] = useState<MealHistoryItem[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    const formatMealTime = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        if (isToday) return `Today, ${time}`;
        if (isYesterday) return `Yesterday, ${time}`;
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + `, ${time}`;
    };
    useEffect(() => {
        loadMealHistory();
    }, []);

    const loadMealHistory = async () => {
        try {
            const data = await mealAPI.getHistory(10, 0);
            setMealHistory(data.meals || []);
        } catch (error) {
            console.error('Failed to load meal history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const pickImage = async (useCamera: boolean) => {
        let result;

        if (useCamera) {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Camera access is required to take photos');
                return;
            }
            result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Gallery access is required to select photos');
                return;
            }
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });
        }

        if (!result.canceled && result.assets[0]) {
            setSelectedImage(result.assets[0].uri);
            analyzeImage(result.assets[0].uri);
        }
    };

    const analyzeImage = async (imageUri: string) => {
        setIsAnalyzing(true);
        setShowResultModal(true);

        try {
            const formData = new FormData();
            formData.append('file', {
                uri: imageUri,
                type: 'image/jpeg',
                name: 'meal.jpg',
            } as any);

            const result = await mealAPI.analyze(formData);
            setAnalysis(result);
            loadMealHistory(); // Refresh history
        } catch (error: any) {
            console.error('Analysis failed:', error);
            Alert.alert('Analysis Failed', error.message || 'Failed to analyze meal. Please try again.');
            setShowResultModal(false);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const analyzeText = async () => {
        if (!textInput.trim()) return;

        setIsAnalyzing(true);
        setShowResultModal(true);

        try {
            const result = await mealAPI.analyzeText(textInput);
            setAnalysis(result);
            setTextInput('');
            loadMealHistory();
        } catch (error: any) {
            console.error('Analysis failed:', error);
            Alert.alert('Analysis Failed', error.message || 'Failed to analyze meal. Please try again.');
            setShowResultModal(false);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getGradeColor = (grade: string) => {
        const gradeColors: Record<string, string> = {
            'A+': '#22c55e',
            'A': '#4ade80',
            'B': '#facc15',
            'C': '#fb923c',
            'D': '#f87171',
            'F': '#ef4444',
        };
        return gradeColors[grade] || colors.primary;
    };

    const closeModal = () => {
        setShowResultModal(false);
        setAnalysis(null);
        setSelectedImage(null);
    };

    const deleteMeal = async (mealId: string) => {
        Alert.alert(
            'Delete Meal',
            'Are you sure you want to delete this meal?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await mealAPI.deleteMeal(mealId);
                            loadMealHistory();
                        } catch (error) {
                            console.error('Failed to delete meal:', error);
                            Alert.alert('Error', 'Failed to delete meal');
                        }
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                {/* Header */}
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.foreground, marginBottom: 24 }}>
                    Log a Meal 🍽️
                </Text>

                {/* Image Capture Options */}
                <View style={{ flexDirection: 'row', marginBottom: 24, gap: 12 }}>
                    <TouchableOpacity
                        onPress={() => pickImage(true)}
                        style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}
                    >
                        <LinearGradient
                            colors={[colors.gradientStart, colors.gradientEnd]}
                            style={{ paddingVertical: 24, alignItems: 'center' }}
                        >
                            <Camera size={32} color="#ffffff" />
                            <Text style={{ color: '#ffffff', fontWeight: '600', marginTop: 8 }}>
                                Take Photo
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => pickImage(false)}
                        style={{
                            flex: 1,
                            backgroundColor: colors.secondary,
                            borderRadius: 16,
                            paddingVertical: 24,
                            alignItems: 'center',
                        }}
                    >
                        <ImageIcon size={32} color={colors.primary} />
                        <Text style={{ color: colors.foreground, fontWeight: '600', marginTop: 8 }}>
                            From Gallery
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Text Input Option */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 8 }}>
                        Or describe your meal:
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TextInput
                            style={{
                                flex: 1,
                                backgroundColor: colors.secondary,
                                borderRadius: 12,
                                paddingHorizontal: 16,
                                paddingVertical: 14,
                                color: colors.foreground,
                                fontSize: 16,
                            }}
                            placeholder="e.g., 2 eggs, toast, and orange juice"
                            placeholderTextColor={colors.mutedForeground}
                            value={textInput}
                            onChangeText={setTextInput}
                        />
                        <TouchableOpacity
                            onPress={analyzeText}
                            disabled={!textInput.trim() || isAnalyzing}
                            style={{
                                backgroundColor: colors.primary,
                                borderRadius: 12,
                                paddingHorizontal: 20,
                                justifyContent: 'center',
                                opacity: textInput.trim() ? 1 : 0.5,
                            }}
                        >
                            <Text style={{ color: '#ffffff', fontWeight: '600' }}>Analyze</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Meal History */}
                <View>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.foreground, marginBottom: 16 }}>
                        Recent Meals
                    </Text>

                    {isLoadingHistory ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : mealHistory.length === 0 ? (
                        <View
                            style={{
                                backgroundColor: colors.secondary,
                                borderRadius: 16,
                                padding: 24,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ fontSize: 48, marginBottom: 12 }}>🥗</Text>
                            <Text style={{ color: colors.mutedForeground, textAlign: 'center' }}>
                                No meals logged yet.{'\n'}Take a photo to get started!
                            </Text>
                        </View>
                    ) : (
                        mealHistory.map((meal) => (
                            <TouchableOpacity
                                key={meal.id}
                                onPress={() => router.push(`/(tabs)/meal-detail?id=${meal.id}`)}
                                style={{
                                    backgroundColor: colors.secondary,
                                    borderRadius: 16,
                                    padding: 16,
                                    marginBottom: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                }}
                            >
                                {/* Grade Badge */}
                                <View
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 24,
                                        backgroundColor: getGradeColor(meal.plate_grade),
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 12,
                                    }}
                                >
                                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>
                                        {meal.plate_grade}
                                    </Text>
                                </View>

                                {/* Meal Info */}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 16 }}>
                                        {meal.food_name}
                                    </Text>
                                    <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>
                                        {formatMealTime(meal.created_at)}
                                    </Text>
                                    <View style={{ flexDirection: 'row', marginTop: 4 }}>
                                        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                                            {meal.calories} cal • P: {meal.macros?.p || 0}g • C: {meal.macros?.c || 0}g • F: {meal.macros?.f || 0}g
                                        </Text>
                                    </View>
                                </View>

                                {/* Delete Button */}
                                <TouchableOpacity
                                    onPress={(e) => { e.stopPropagation(); deleteMeal(meal.id); }}
                                    style={{ padding: 8 }}
                                >
                                    <Trash2 size={20} color={colors.destructive} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Analysis Result Modal */}
            <Modal
                visible={showResultModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={closeModal}
            >
                <View style={{ flex: 1, backgroundColor: colors.background }}>
                    <SafeAreaView style={{ flex: 1 }}>
                        {/* Header */}
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: 16,
                                paddingVertical: 12,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border,
                            }}
                        >
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.foreground }}>
                                Meal Analysis
                            </Text>
                            <TouchableOpacity onPress={closeModal}>
                                <X size={24} color={colors.foreground} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                            {isAnalyzing ? (
                                <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                                    <ActivityIndicator size="large" color={colors.primary} />
                                    <Text style={{ color: colors.foreground, marginTop: 16, fontSize: 18 }}>
                                        Analyzing your meal...
                                    </Text>
                                    <Text style={{ color: colors.mutedForeground, marginTop: 8 }}>
                                        This may take a few seconds
                                    </Text>
                                </View>
                            ) : analysis ? (
                                <View>
                                    {/* Food Image */}
                                    {selectedImage && (
                                        <Image
                                            source={{ uri: selectedImage }}
                                            style={{
                                                width: '100%',
                                                height: 200,
                                                borderRadius: 16,
                                                marginBottom: 16,
                                            }}
                                            resizeMode="cover"
                                        />
                                    )}

                                    {/* Food Name & Grade */}
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: 16,
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.foreground }}>
                                                {analysis.food}
                                            </Text>
                                        </View>
                                        <View
                                            style={{
                                                paddingHorizontal: 20,
                                                paddingVertical: 10,
                                                borderRadius: 20,
                                                backgroundColor: getGradeColor(analysis.plate_grade),
                                            }}
                                        >
                                            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 20 }}>
                                                {analysis.plate_grade}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Calories */}
                                    <View
                                        style={{
                                            backgroundColor: colors.secondary,
                                            borderRadius: 16,
                                            padding: 20,
                                            marginBottom: 16,
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Flame size={32} color="#f59e0b" />
                                        <Text style={{ fontSize: 48, fontWeight: 'bold', color: colors.foreground, marginTop: 8 }}>
                                            {analysis.total_calories || analysis.calories}
                                        </Text>
                                        <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>total calories</Text>
                                        {analysis.excess_calories !== undefined && analysis.excess_calories > 0 && (
                                            <Text style={{ color: '#f59e0b', fontSize: 14, marginTop: 4 }}>
                                                +{analysis.excess_calories} excess calories to burn
                                            </Text>
                                        )}
                                    </View>

                                    {/* Per-Item Breakdown */}
                                    {analysis.items && analysis.items.length > 0 && (
                                        <View
                                            style={{
                                                backgroundColor: colors.secondary,
                                                borderRadius: 16,
                                                padding: 16,
                                                marginBottom: 16,
                                            }}
                                        >
                                            <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 12 }}>
                                                Calorie Breakdown
                                            </Text>
                                            {analysis.items.map((item, index) => (
                                                <View
                                                    key={index}
                                                    style={{
                                                        flexDirection: 'row',
                                                        justifyContent: 'space-between',
                                                        paddingVertical: 8,
                                                        borderBottomWidth: index < analysis.items!.length - 1 ? 1 : 0,
                                                        borderBottomColor: colors.border,
                                                    }}
                                                >
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ color: colors.foreground }}>{item.name}</Text>
                                                        {item.quantity && (
                                                            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                                                                {item.quantity}
                                                            </Text>
                                                        )}
                                                    </View>
                                                    <Text style={{ color: colors.primary, fontWeight: '600' }}>
                                                        {item.calories} cal
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Macros */}
                                    <View style={{ flexDirection: 'row', marginBottom: 16, gap: 12 }}>
                                        <View
                                            style={{
                                                flex: 1,
                                                backgroundColor: colors.secondary,
                                                borderRadius: 12,
                                                padding: 16,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Text style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: 24 }}>
                                                {analysis.macros.p}g
                                            </Text>
                                            <Text style={{ color: colors.mutedForeground }}>Protein</Text>
                                        </View>
                                        <View
                                            style={{
                                                flex: 1,
                                                backgroundColor: colors.secondary,
                                                borderRadius: 12,
                                                padding: 16,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Text style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: 24 }}>
                                                {analysis.macros.c}g
                                            </Text>
                                            <Text style={{ color: colors.mutedForeground }}>Carbs</Text>
                                        </View>
                                        <View
                                            style={{
                                                flex: 1,
                                                backgroundColor: colors.secondary,
                                                borderRadius: 12,
                                                padding: 16,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 24 }}>
                                                {analysis.macros.f}g
                                            </Text>
                                            <Text style={{ color: colors.mutedForeground }}>Fat</Text>
                                        </View>
                                    </View>

                                    {/* Reasoning */}
                                    <View
                                        style={{
                                            backgroundColor: colors.secondary,
                                            borderRadius: 16,
                                            padding: 16,
                                            marginBottom: 16,
                                        }}
                                    >
                                        <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 8 }}>
                                            Why this grade?
                                        </Text>
                                        <Text style={{ color: colors.mutedForeground, lineHeight: 22 }}>
                                            {analysis.reasoning}
                                        </Text>
                                    </View>

                                    {/* Ingredients */}
                                    <View
                                        style={{
                                            backgroundColor: colors.secondary,
                                            borderRadius: 16,
                                            padding: 16,
                                            marginBottom: 16,
                                        }}
                                    >
                                        <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 8 }}>
                                            Ingredients
                                        </Text>
                                        <Text style={{ color: colors.mutedForeground }}>
                                            {analysis.ingredients}
                                        </Text>
                                    </View>

                                    {/* Burn Tasks - Multiple */}
                                    {analysis.tasks && analysis.tasks.length > 0 && (
                                        <View style={{ marginBottom: 16 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                                <Zap size={20} color={colors.primary} />
                                                <Text style={{ color: colors.foreground, fontWeight: '600', marginLeft: 8, fontSize: 16 }}>
                                                    {analysis.excess_calories && analysis.excess_calories > 0
                                                        ? 'Burn the excess calories!'
                                                        : 'Suggested Activities'}
                                                </Text>
                                            </View>
                                            {analysis.tasks.map((task, index) => (
                                                <View
                                                    key={index}
                                                    style={{
                                                        borderRadius: 16,
                                                        overflow: 'hidden',
                                                        marginBottom: 8,
                                                    }}
                                                >
                                                    <LinearGradient
                                                        colors={[colors.gradientStart, colors.gradientEnd]}
                                                        style={{ padding: 16 }}
                                                    >
                                                        <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>
                                                            {task.name}
                                                        </Text>
                                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                                                            <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
                                                                {task.duration_minutes} min
                                                            </Text>
                                                            <Text style={{ color: 'rgba(255,255,255,0.7)', marginHorizontal: 8 }}>•</Text>
                                                            <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
                                                                {task.calories_to_burn} cal
                                                            </Text>
                                                            {task.steps && task.steps > 0 && (
                                                                <>
                                                                    <Text style={{ color: 'rgba(255,255,255,0.7)', marginHorizontal: 8 }}>•</Text>
                                                                    <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
                                                                        {task.steps.toLocaleString()} steps
                                                                    </Text>
                                                                </>
                                                            )}
                                                            {task.distance_km && task.distance_km > 0 && (
                                                                <>
                                                                    <Text style={{ color: 'rgba(255,255,255,0.7)', marginHorizontal: 8 }}>•</Text>
                                                                    <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
                                                                        {task.distance_km.toFixed(1)} km
                                                                    </Text>
                                                                </>
                                                            )}
                                                        </View>
                                                    </LinearGradient>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* No Tasks Needed - Healthy Meal */}
                                    {analysis && (!analysis.tasks || analysis.tasks.length === 0) && (
                                        <View style={{
                                            backgroundColor: '#22c55e20',
                                            borderRadius: 16,
                                            padding: 16,
                                            marginBottom: 16,
                                            alignItems: 'center',
                                        }}>
                                            <Text style={{ fontSize: 32 }}>🎉</Text>
                                            <Text style={{ color: '#22c55e', fontWeight: '600', fontSize: 16, marginTop: 8 }}>
                                                Great Choice!
                                            </Text>
                                            <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 4 }}>
                                                This meal is well balanced. No extra activities needed!
                                            </Text>
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        onPress={closeModal}
                                        style={{
                                            backgroundColor: colors.primary,
                                            borderRadius: 12,
                                            paddingVertical: 16,
                                            alignItems: 'center',
                                            flexDirection: 'row',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Check size={20} color="#ffffff" />
                                        <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                                            Done
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                        </ScrollView>
                    </SafeAreaView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
