import { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useThemeStore } from '@/store/useThemeStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Goal = 'Weight Loss' | 'Muscle Gain' | 'Maintenance' | 'General Health';

interface FormData {
    weight: number;
    height: number;
    gender: 'male' | 'female' | 'other' | '';
    age: number;
    goal: Goal | '';
    targetWeight: number;
    allergies: string[];
    preferredTasks: string[];
}

// Simple Scroll Number Picker (no FlatList)
const ScrollPicker = ({
    min,
    max,
    value,
    onChange,
    suffix = '',
    colors,
}: {
    min: number;
    max: number;
    value: number;
    onChange: (val: number) => void;
    suffix?: string;
    colors: any;
}) => {
    const scrollRef = useRef<ScrollView>(null);
    const ITEM_HEIGHT = 50;
    const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

    const handleScroll = useCallback((event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        const newValue = numbers[Math.min(Math.max(index, 0), numbers.length - 1)];
        if (newValue !== value) {
            onChange(newValue);
        }
    }, [value, onChange, numbers]);

    return (
        <View style={{ height: ITEM_HEIGHT * 3, overflow: 'hidden' }}>
            {/* Selection highlight */}
            <View
                style={{
                    position: 'absolute',
                    top: ITEM_HEIGHT,
                    left: 0,
                    right: 0,
                    height: ITEM_HEIGHT,
                    backgroundColor: colors.primary + '20',
                    borderRadius: 12,
                    zIndex: 1,
                }}
                pointerEvents="none"
            />

            <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleScroll}
                contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
                nestedScrollEnabled
            >
                {numbers.map((num) => {
                    const isSelected = num === value;
                    return (
                        <TouchableOpacity
                            key={num}
                            onPress={() => {
                                onChange(num);
                                scrollRef.current?.scrollTo({
                                    y: (num - min) * ITEM_HEIGHT,
                                    animated: true,
                                });
                            }}
                            style={{
                                height: ITEM_HEIGHT,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: isSelected ? 28 : 18,
                                    fontWeight: isSelected ? 'bold' : '400',
                                    color: isSelected ? colors.primary : colors.mutedForeground,
                                }}
                            >
                                {num}{suffix}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

// Selection Card
const SelectionCard = ({
    label,
    isSelected,
    onPress,
    colors,
    icon,
}: {
    label: string;
    isSelected: boolean;
    onPress: () => void;
    colors: any;
    icon?: string;
}) => (
    <TouchableOpacity
        onPress={onPress}
        style={{
            flex: 1,
            paddingVertical: 16,
            paddingHorizontal: 12,
            borderRadius: 16,
            backgroundColor: isSelected ? colors.primary : colors.secondary,
            alignItems: 'center',
            marginHorizontal: 4,
        }}
    >
        {icon && <Text style={{ fontSize: 24, marginBottom: 4 }}>{icon}</Text>}
        <Text
            style={{
                fontSize: 14,
                fontWeight: '600',
                color: isSelected ? '#ffffff' : colors.foreground,
                textTransform: 'capitalize',
            }}
        >
            {label}
        </Text>
    </TouchableOpacity>
);

// Allergy Chip
const AllergyChip = ({
    label,
    isSelected,
    onPress,
    colors,
}: {
    label: string;
    isSelected: boolean;
    onPress: () => void;
    colors: any;
}) => (
    <TouchableOpacity
        onPress={onPress}
        style={{
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 20,
            backgroundColor: isSelected ? colors.primary : colors.secondary,
            margin: 4,
        }}
    >
        <Text style={{ fontSize: 13, fontWeight: '500', color: isSelected ? '#ffffff' : colors.foreground }}>
            {label}
        </Text>
    </TouchableOpacity>
);

export default function OnboardingScreen() {
    const { colors } = useThemeStore();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const totalSteps = 5;

    const [formData, setFormData] = useState<FormData>({
        weight: 70,
        height: 170,
        gender: '',
        age: 25,
        goal: '',
        targetWeight: 65,
        allergies: [],
        preferredTasks: [],
    });

    const goals: { value: Goal; icon: string }[] = [
        { value: 'Weight Loss', icon: '🔥' },
        { value: 'Muscle Gain', icon: '💪' },
        { value: 'Maintenance', icon: '⚖️' },
        { value: 'General Health', icon: '❤️' },
    ];

    const commonAllergies = ['Dairy', 'Eggs', 'Peanuts', 'Gluten', 'Soy', 'Fish', 'Shellfish', 'None'];

    const genderOptions = [
        { value: 'male' as const, icon: '👨' },
        { value: 'female' as const, icon: '👩' },
        { value: 'other' as const, icon: '🧑' },
    ];

    const preferredTaskOptions = [
        { value: 'walking', label: 'Walking', icon: '🚶' },
        { value: 'running', label: 'Running', icon: '🏃' },
        { value: 'cycling', label: 'Cycling', icon: '🚴' },
        { value: 'swimming', label: 'Swimming', icon: '🏊' },
        { value: 'gym', label: 'Gym Workout', icon: '🏋️' },
        { value: 'yoga', label: 'Yoga', icon: '🧘' },
        { value: 'hiit', label: 'HIIT', icon: '⚡' },
    ];

    const canProceed = (): boolean => {
        switch (step) {
            case 1: return formData.weight > 0 && formData.height > 0;
            case 2: return formData.gender !== '' && formData.age > 0;
            case 3: return formData.goal !== '';
            case 4: return formData.preferredTasks.length > 0;
            case 5: return true;
            default: return false;
        }
    };

    const handleNext = () => {
        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                weight: formData.weight,
                height: formData.height,
                gender: formData.gender,
                age: formData.age,
                target_goal: formData.goal,
                allergies: formData.allergies.filter(a => a !== 'None'),
                preferred_tasks: formData.preferredTasks,
                daily_calorie_target: calculateCalories(),
            });

            if (error) throw error;
            router.replace('/(tabs)/dashboard');
        } catch (error: any) {
            console.error('Error saving profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateCalories = (): number => {
        const { weight, height, age, gender, goal } = formData;
        let bmr = 10 * weight + 6.25 * height - 5 * age;
        bmr += gender === 'male' ? 5 : -161;
        let tdee = bmr * 1.5;
        if (goal === 'Weight Loss') tdee -= 500;
        else if (goal === 'Muscle Gain') tdee += 300;
        return Math.round(tdee);
    };

    const toggleAllergy = (allergy: string) => {
        if (allergy === 'None') {
            setFormData({ ...formData, allergies: ['None'] });
        } else {
            const newAllergies = formData.allergies.includes(allergy)
                ? formData.allergies.filter(a => a !== allergy)
                : [...formData.allergies.filter(a => a !== 'None'), allergy];
            setFormData({ ...formData, allergies: newAllergies });
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24 }}>
                {/* Progress Bar */}
                <View style={{ marginBottom: 24 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                            Step {step} of {totalSteps}
                        </Text>
                        <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>
                            {Math.round((step / totalSteps) * 100)}%
                        </Text>
                    </View>
                    <View style={{ height: 4, backgroundColor: colors.secondary, borderRadius: 2 }}>
                        <View
                            style={{
                                height: 4,
                                width: `${(step / totalSteps) * 100}%`,
                                backgroundColor: colors.primary,
                                borderRadius: 2,
                            }}
                        />
                    </View>
                </View>

                {/* Step 1: Weight & Height - Side by Side */}
                {step === 1 && (
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 26, fontWeight: 'bold', color: colors.foreground, marginBottom: 4 }}>
                            Body Measurements
                        </Text>
                        <Text style={{ color: colors.mutedForeground, marginBottom: 24 }}>
                            For accurate calorie calculations
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 16 }}>
                            {/* Weight */}
                            <View style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 16, padding: 16 }}>
                                <Text style={{ color: colors.foreground, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
                                    Weight (kg)
                                </Text>
                                <ScrollPicker
                                    min={30}
                                    max={200}
                                    value={formData.weight}
                                    onChange={(val) => setFormData({ ...formData, weight: val })}
                                    colors={colors}
                                />
                            </View>

                            {/* Height */}
                            <View style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 16, padding: 16 }}>
                                <Text style={{ color: colors.foreground, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
                                    Height (cm)
                                </Text>
                                <ScrollPicker
                                    min={100}
                                    max={220}
                                    value={formData.height}
                                    onChange={(val) => setFormData({ ...formData, height: val })}
                                    colors={colors}
                                />
                            </View>
                        </View>

                        {/* Current Selection Display */}
                        <View style={{ alignItems: 'center', marginTop: 24 }}>
                            <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.primary }}>
                                {formData.weight} kg • {formData.height} cm
                            </Text>
                            <Text style={{ color: colors.mutedForeground, marginTop: 4 }}>
                                BMI: {(formData.weight / ((formData.height / 100) ** 2)).toFixed(1)}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Step 2: Gender & Age */}
                {step === 2 && (
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 26, fontWeight: 'bold', color: colors.foreground, marginBottom: 4 }}>
                            About You
                        </Text>
                        <Text style={{ color: colors.mutedForeground, marginBottom: 24 }}>
                            Helps personalize your experience
                        </Text>

                        <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 12 }}>Gender</Text>
                        <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                            {genderOptions.map((option) => (
                                <SelectionCard
                                    key={option.value}
                                    label={option.value}
                                    icon={option.icon}
                                    isSelected={formData.gender === option.value}
                                    onPress={() => setFormData({ ...formData, gender: option.value })}
                                    colors={colors}
                                />
                            ))}
                        </View>

                        <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 12 }}>Age</Text>
                        <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 16 }}>
                            <ScrollPicker
                                min={13}
                                max={90}
                                value={formData.age}
                                onChange={(val) => setFormData({ ...formData, age: val })}
                                suffix=" yrs"
                                colors={colors}
                            />
                        </View>
                    </View>
                )}

                {/* Step 3: Goal */}
                {step === 3 && (
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 26, fontWeight: 'bold', color: colors.foreground, marginBottom: 4 }}>
                            Your Goal
                        </Text>
                        <Text style={{ color: colors.mutedForeground, marginBottom: 24 }}>
                            What would you like to achieve?
                        </Text>

                        {goals.map((goal) => (
                            <TouchableOpacity
                                key={goal.value}
                                onPress={() => setFormData({ ...formData, goal: goal.value })}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingVertical: 18,
                                    paddingHorizontal: 20,
                                    borderRadius: 16,
                                    backgroundColor: formData.goal === goal.value ? colors.primary : colors.secondary,
                                    marginBottom: 12,
                                }}
                            >
                                <Text style={{ fontSize: 28, marginRight: 16 }}>{goal.icon}</Text>
                                <Text
                                    style={{
                                        fontSize: 17,
                                        fontWeight: '600',
                                        color: formData.goal === goal.value ? '#ffffff' : colors.foreground,
                                    }}
                                >
                                    {goal.value}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Step 4: Preferred Tasks */}
                {step === 4 && (
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 26, fontWeight: 'bold', color: colors.foreground, marginBottom: 4 }}>
                            Preferred Activities
                        </Text>
                        <Text style={{ color: colors.mutedForeground, marginBottom: 24 }}>
                            Select activities you enjoy (multi-select)
                        </Text>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            {preferredTaskOptions.map((task) => {
                                const isSelected = formData.preferredTasks.includes(task.value);
                                return (
                                    <TouchableOpacity
                                        key={task.value}
                                        onPress={() => {
                                            const newTasks = isSelected
                                                ? formData.preferredTasks.filter(t => t !== task.value)
                                                : [...formData.preferredTasks, task.value];
                                            setFormData({ ...formData, preferredTasks: newTasks });
                                        }}
                                        style={{
                                            width: '48%',
                                            margin: '1%',
                                            paddingVertical: 16,
                                            paddingHorizontal: 12,
                                            borderRadius: 16,
                                            backgroundColor: isSelected ? colors.primary : colors.secondary,
                                            alignItems: 'center',
                                            marginBottom: 8,
                                        }}
                                    >
                                        <Text style={{ fontSize: 28, marginBottom: 4 }}>{task.icon}</Text>
                                        <Text
                                            style={{
                                                fontSize: 14,
                                                fontWeight: '600',
                                                color: isSelected ? '#ffffff' : colors.foreground,
                                            }}
                                        >
                                            {task.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Step 5: Allergies (optional) */}
                {step === 5 && (
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 26, fontWeight: 'bold', color: colors.foreground, marginBottom: 4 }}>
                            Food Allergies
                        </Text>
                        <Text style={{ color: colors.mutedForeground, marginBottom: 24 }}>
                            Select any allergies (optional)
                        </Text>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            {commonAllergies.map((allergy) => (
                                <AllergyChip
                                    key={allergy}
                                    label={allergy}
                                    isSelected={formData.allergies.includes(allergy)}
                                    onPress={() => toggleAllergy(allergy)}
                                    colors={colors}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {/* Navigation Buttons */}
                <View style={{ marginTop: 'auto', paddingTop: 20 }}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        {step > 1 && (
                            <TouchableOpacity
                                onPress={() => setStep(step - 1)}
                                style={{
                                    flex: 1,
                                    backgroundColor: colors.secondary,
                                    paddingVertical: 16,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: colors.foreground, fontWeight: '600' }}>Back</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={handleNext}
                            disabled={isLoading || !canProceed()}
                            style={{
                                flex: step > 1 ? 1 : undefined,
                                width: step === 1 ? '100%' : undefined,
                                borderRadius: 12,
                                overflow: 'hidden',
                                opacity: canProceed() ? 1 : 0.5,
                            }}
                        >
                            <LinearGradient
                                colors={[colors.gradientStart, colors.gradientEnd]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{ paddingVertical: 16, alignItems: 'center' }}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text style={{ color: '#ffffff', fontWeight: '600' }}>
                                        {step === totalSteps ? 'Get Started' : 'Continue'}
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}
