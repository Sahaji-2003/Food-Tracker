import { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    ScrollView,
    Animated,
    KeyboardAvoidingView,
    Platform,
    Modal,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { ChevronRight, Check, FastForward, Bot } from 'lucide-react-native';
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

interface Message {
    id: string;
    type: 'bot' | 'user';
    content: string;
    inputType?: 'weight' | 'height' | 'gender' | 'age' | 'goal' | 'targetWeight' | 'activities' | 'allergies' | 'confirm';
}

// Bot Message Bubble - Lottie only for latest, static icon for past messages
const BotBubble = ({
    content,
    showAvatar = true,
    isLatest = false,
    colors,
}: {
    content: string;
    showAvatar?: boolean;
    isLatest?: boolean;
    colors: any;
}) => {
    return (
        <View style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            marginBottom: 12,
        }}>
            {showAvatar ? (
                <View style={{
                    width: 36,
                    height: 36,
                    marginRight: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 18,
                    backgroundColor: isLatest ? 'transparent' : colors.secondary,
                }}>
                    {isLatest ? (
                        <LottieView
                            source={{ uri: 'https://lottie.host/67866d35-74bb-4d0a-82d8-3201d5f54bef/N6cgEFzQDP.lottie' }}
                            style={{ width: 40, height: 40 }}
                            autoPlay
                            loop
                        />
                    ) : (
                        <Bot size={20} color={colors.primary} />
                    )}
                </View>
            ) : (
                <View style={{ width: 44 }} />
            )}
            <View style={{
                backgroundColor: colors.secondary,
                borderRadius: 18,
                borderBottomLeftRadius: 4,
                paddingHorizontal: 16,
                paddingVertical: 12,
                maxWidth: SCREEN_WIDTH * 0.7,
            }}>
                <Text style={{ color: colors.foreground, fontSize: 16, lineHeight: 22 }}>
                    {content}
                </Text>
            </View>
        </View>
    );
};

// User Message Bubble (no animation to prevent flickering)
const UserBubble = ({ content, colors }: { content: string; colors: any }) => {
    return (
        <View style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginBottom: 12,
        }}>
            <LinearGradient
                colors={[colors.gradientStart || '#22c55e', colors.gradientEnd || '#14b8a6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                    borderRadius: 18,
                    borderBottomRightRadius: 4,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    maxWidth: SCREEN_WIDTH * 0.7,
                }}
            >
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '500' }}>
                    {content}
                </Text>
            </LinearGradient>
        </View>
    );
};

// Typing Indicator (simple static dots - no animation to prevent flicker)
const TypingIndicator = ({ colors }: { colors: any }) => {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 }}>
            <View style={{ width: 40, height: 40, marginRight: 8 }}>
                <LottieView
                    source={{ uri: 'https://lottie.host/67866d35-74bb-4d0a-82d8-3201d5f54bef/N6cgEFzQDP.lottie' }}
                    style={{ width: 40, height: 40 }}
                    autoPlay
                    loop
                />
            </View>
            <View style={{
                backgroundColor: colors.secondary,
                borderRadius: 18,
                borderBottomLeftRadius: 4,
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
            }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.mutedForeground, marginHorizontal: 2, opacity: 0.5 }} />
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.mutedForeground, marginHorizontal: 2, opacity: 0.7 }} />
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.mutedForeground, marginHorizontal: 2, opacity: 1 }} />
            </View>
        </View>
    );
};

// Scroll Number Picker
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
    const ITEM_HEIGHT = 44;
    const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

    const handleScroll = useCallback((event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        const newValue = numbers[Math.min(Math.max(index, 0), numbers.length - 1)];
        if (newValue !== value) onChange(newValue);
    }, [value, onChange, numbers]);

    return (
        <View style={{ height: ITEM_HEIGHT * 3, overflow: 'hidden' }}>
            <View style={{
                position: 'absolute',
                top: ITEM_HEIGHT,
                left: 0,
                right: 0,
                height: ITEM_HEIGHT,
                backgroundColor: colors.primary + '25',
                borderRadius: 10,
            }} pointerEvents="none" />
            <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleScroll}
                contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
                nestedScrollEnabled
            >
                {numbers.map((num) => (
                    <TouchableOpacity
                        key={num}
                        onPress={() => {
                            onChange(num);
                            scrollRef.current?.scrollTo({ y: (num - min) * ITEM_HEIGHT, animated: true });
                        }}
                        style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}
                    >
                        <Text style={{
                            fontSize: num === value ? 24 : 16,
                            fontWeight: num === value ? 'bold' : '400',
                            color: num === value ? colors.primary : colors.mutedForeground,
                        }}>
                            {num}{suffix}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

// Selection Option Card
const OptionCard = ({
    label,
    icon,
    isSelected,
    onPress,
    colors,
    small = false,
}: {
    label: string;
    icon?: string;
    isSelected: boolean;
    onPress: () => void;
    colors: any;
    small?: boolean;
}) => (
    <TouchableOpacity
        onPress={onPress}
        style={{
            paddingVertical: small ? 10 : 14,
            paddingHorizontal: small ? 14 : 18,
            borderRadius: 14,
            backgroundColor: isSelected ? colors.primary : colors.secondary,
            marginRight: 8,
            marginBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
        }}
    >
        {icon && <Text style={{ fontSize: small ? 16 : 20, marginRight: 6 }}>{icon}</Text>}
        <Text style={{
            fontSize: small ? 13 : 15,
            fontWeight: '600',
            color: isSelected ? '#ffffff' : colors.foreground,
        }}>
            {label}
        </Text>
        {isSelected && <Check size={14} color="#fff" style={{ marginLeft: 4 }} />}
    </TouchableOpacity>
);

export default function OnboardingScreen() {
    const { colors } = useThemeStore();
    const scrollViewRef = useRef<ScrollView>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showSkipDialog, setShowSkipDialog] = useState(false);

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

    const genderOptions = [
        { value: 'male' as const, label: 'Male', icon: '👨' },
        { value: 'female' as const, label: 'Female', icon: '👩' },
        { value: 'other' as const, label: 'Other', icon: '🧑' },
    ];

    const activityOptions = [
        { value: 'walking', label: 'Walking', icon: '🚶' },
        { value: 'running', label: 'Running', icon: '🏃' },
        { value: 'cycling', label: 'Cycling', icon: '🚴' },
        { value: 'gym', label: 'Gym', icon: '🏋️' },
        { value: 'yoga', label: 'Yoga', icon: '🧘' },
        { value: 'swimming', label: 'Swimming', icon: '🏊' },
    ];

    const allergyOptions = ['Dairy', 'Gluten', 'Peanuts', 'Eggs', 'Soy', 'Fish', 'None'];

    const conversationFlow = [
        { bot: "Hello there! 👋", inputType: null },
        { bot: "I'm Fit Buddy, your personal health assistant!", inputType: null },
        { bot: "Let's create a personalized fitness plan just for you. Ready? 🚀", inputType: null },
        { bot: "First, what's your current weight?", inputType: 'weight' },
        { bot: "Great! And how tall are you?", inputType: 'height' },
        { bot: "Nice! Now, what's your gender?", inputType: 'gender' },
        { bot: "And how old are you?", inputType: 'age' },
        { bot: "What's your main fitness goal?", inputType: 'goal' },
        { bot: "What's your target weight? 🎯", inputType: 'targetWeight' },
        { bot: "What activities do you enjoy? (Select all that apply)", inputType: 'activities' },
        { bot: "Almost done! Any food allergies I should know about?", inputType: 'allergies' },
        { bot: "Perfect! I've got everything I need. Let's start your journey! 🎉", inputType: 'confirm' },
    ];

    useEffect(() => {
        // Start the conversation
        addBotMessage(0);
    }, []);

    useEffect(() => {
        // Auto scroll to bottom when messages change
        if (messages.length > 0) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 150);
        }
    }, [messages.length]);

    const addBotMessage = async (stepIndex: number) => {
        if (stepIndex >= conversationFlow.length) return;

        setIsTyping(true);

        // Simulate typing delay
        await new Promise(resolve => setTimeout(resolve, 800));

        setIsTyping(false);
        setMessages(prev => [...prev, {
            id: `bot-${stepIndex}`,
            type: 'bot',
            content: conversationFlow[stepIndex].bot,
            inputType: conversationFlow[stepIndex].inputType as any,
        }]);

        setCurrentStep(stepIndex);

        // Auto-advance intro messages (first 3 have no inputType)
        if (!conversationFlow[stepIndex].inputType && stepIndex < 3) {
            setTimeout(() => addBotMessage(stepIndex + 1), 600);
        }
    };

    const handleUserResponse = (response: string, nextStep: number) => {
        setMessages(prev => [...prev, {
            id: `user-${nextStep}`,
            type: 'user',
            content: response,
        }]);

        setTimeout(() => addBotMessage(nextStep), 500);
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const calories = calculateCalories();

            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                weight: formData.weight,
                height: formData.height,
                gender: formData.gender,
                age: formData.age,
                target_goal: formData.goal,
                target_weight: formData.targetWeight,
                allergies: formData.allergies.filter(a => a !== 'None'),
                preferred_tasks: formData.preferredTasks,
                daily_calorie_target: calories,
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

    const currentInputType = conversationFlow[currentStep]?.inputType;

    const renderInputArea = () => {
        // Show input area when not typing and current step has an input type
        if (isTyping || !currentInputType) return null;

        switch (currentInputType) {
            case 'weight':
                return (
                    <View style={{ backgroundColor: colors.card || colors.secondary, borderRadius: 16, padding: 16, marginBottom: 16 }}>
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
                        <TouchableOpacity
                            onPress={() => handleUserResponse(`${formData.weight} kg`, currentStep + 1)}
                            style={{ marginTop: 12 }}
                        >
                            <LinearGradient
                                colors={[colors.gradientStart || '#22c55e', colors.gradientEnd || '#14b8a6']}
                                style={{ paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600', marginRight: 6 }}>Continue</Text>
                                <ChevronRight size={18} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                );

            case 'height':
                return (
                    <View style={{ backgroundColor: colors.card || colors.secondary, borderRadius: 16, padding: 16, marginBottom: 16 }}>
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
                        <TouchableOpacity
                            onPress={() => handleUserResponse(`${formData.height} cm`, currentStep + 1)}
                            style={{ marginTop: 12 }}
                        >
                            <LinearGradient
                                colors={[colors.gradientStart || '#22c55e', colors.gradientEnd || '#14b8a6']}
                                style={{ paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600', marginRight: 6 }}>Continue</Text>
                                <ChevronRight size={18} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                );

            case 'gender':
                return (
                    <View style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            {genderOptions.map((option) => (
                                <OptionCard
                                    key={option.value}
                                    label={option.label}
                                    icon={option.icon}
                                    isSelected={formData.gender === option.value}
                                    onPress={() => {
                                        setFormData({ ...formData, gender: option.value });
                                        setTimeout(() => handleUserResponse(option.label, currentStep + 1), 300);
                                    }}
                                    colors={colors}
                                />
                            ))}
                        </View>
                    </View>
                );

            case 'age':
                return (
                    <View style={{ backgroundColor: colors.card || colors.secondary, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                        <Text style={{ color: colors.foreground, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
                            Age (years)
                        </Text>
                        <ScrollPicker
                            min={13}
                            max={90}
                            value={formData.age}
                            onChange={(val) => setFormData({ ...formData, age: val })}
                            suffix=" yrs"
                            colors={colors}
                        />
                        <TouchableOpacity
                            onPress={() => handleUserResponse(`${formData.age} years old`, currentStep + 1)}
                            style={{ marginTop: 12 }}
                        >
                            <LinearGradient
                                colors={[colors.gradientStart || '#22c55e', colors.gradientEnd || '#14b8a6']}
                                style={{ paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600', marginRight: 6 }}>Continue</Text>
                                <ChevronRight size={18} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                );

            case 'goal':
                return (
                    <View style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            {goals.map((goal) => (
                                <OptionCard
                                    key={goal.value}
                                    label={goal.value}
                                    icon={goal.icon}
                                    isSelected={formData.goal === goal.value}
                                    onPress={() => {
                                        setFormData({ ...formData, goal: goal.value });
                                        setTimeout(() => handleUserResponse(goal.value, currentStep + 1), 300);
                                    }}
                                    colors={colors}
                                />
                            ))}
                        </View>
                    </View>
                );

            case 'targetWeight':
                return (
                    <View style={{ backgroundColor: colors.card || colors.secondary, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                        <Text style={{ color: colors.foreground, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
                            Target Weight (kg)
                        </Text>
                        <ScrollPicker
                            min={30}
                            max={200}
                            value={formData.targetWeight}
                            onChange={(val) => setFormData({ ...formData, targetWeight: val })}
                            colors={colors}
                        />
                        <TouchableOpacity
                            onPress={() => handleUserResponse(`${formData.targetWeight} kg`, currentStep + 1)}
                            style={{ marginTop: 12 }}
                        >
                            <LinearGradient
                                colors={[colors.gradientStart || '#22c55e', colors.gradientEnd || '#14b8a6']}
                                style={{ paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600', marginRight: 6 }}>Continue</Text>
                                <ChevronRight size={18} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                );

            case 'activities':
                return (
                    <View style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            {activityOptions.map((activity) => (
                                <OptionCard
                                    key={activity.value}
                                    label={activity.label}
                                    icon={activity.icon}
                                    isSelected={formData.preferredTasks.includes(activity.value)}
                                    onPress={() => {
                                        const newTasks = formData.preferredTasks.includes(activity.value)
                                            ? formData.preferredTasks.filter(t => t !== activity.value)
                                            : [...formData.preferredTasks, activity.value];
                                        setFormData({ ...formData, preferredTasks: newTasks });
                                    }}
                                    colors={colors}
                                    small
                                />
                            ))}
                        </View>
                        {formData.preferredTasks.length > 0 && (
                            <TouchableOpacity
                                onPress={() => handleUserResponse(formData.preferredTasks.map(t =>
                                    activityOptions.find(a => a.value === t)?.label || t
                                ).join(', '), currentStep + 1)}
                                style={{ marginTop: 8 }}
                            >
                                <LinearGradient
                                    colors={[colors.gradientStart || '#22c55e', colors.gradientEnd || '#14b8a6']}
                                    style={{ paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '600', marginRight: 6 }}>Continue</Text>
                                    <ChevronRight size={18} color="#fff" />
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                );

            case 'allergies':
                return (
                    <View style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            {allergyOptions.map((allergy) => (
                                <OptionCard
                                    key={allergy}
                                    label={allergy}
                                    isSelected={formData.allergies.includes(allergy)}
                                    onPress={() => {
                                        if (allergy === 'None') {
                                            setFormData({ ...formData, allergies: ['None'] });
                                        } else {
                                            const newAllergies = formData.allergies.includes(allergy)
                                                ? formData.allergies.filter(a => a !== allergy)
                                                : [...formData.allergies.filter(a => a !== 'None'), allergy];
                                            setFormData({ ...formData, allergies: newAllergies });
                                        }
                                    }}
                                    colors={colors}
                                    small
                                />
                            ))}
                        </View>
                        <TouchableOpacity
                            onPress={() => handleUserResponse(
                                formData.allergies.length > 0 ? formData.allergies.join(', ') : 'No allergies',
                                currentStep + 1
                            )}
                            style={{ marginTop: 8 }}
                        >
                            <LinearGradient
                                colors={[colors.gradientStart || '#22c55e', colors.gradientEnd || '#14b8a6']}
                                style={{ paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600', marginRight: 6 }}>Continue</Text>
                                <ChevronRight size={18} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                );

            case 'confirm':
                return (
                    <View style={{ marginBottom: 16 }}>
                        <TouchableOpacity onPress={handleSubmit} disabled={isLoading}>
                            <LinearGradient
                                colors={[colors.gradientStart || '#22c55e', colors.gradientEnd || '#14b8a6']}
                                style={{
                                    paddingVertical: 18,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    opacity: isLoading ? 0.7 : 1,
                                }}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17 }}>
                                        🚀 Let's Go!
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <LottieView
                                source={{ uri: 'https://lottie.host/67866d35-74bb-4d0a-82d8-3201d5f54bef/N6cgEFzQDP.lottie' }}
                                style={{ width: 50, height: 50 }}
                                autoPlay
                                loop
                            />
                            <View style={{ marginLeft: 10 }}>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.foreground }}>Fit Buddy</Text>
                                <Text style={{ fontSize: 12, color: colors.primary }}>Setting up your profile...</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={() => setShowSkipDialog(true)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 20,
                                backgroundColor: colors.secondary,
                            }}
                        >
                            <Text style={{ color: colors.mutedForeground, fontSize: 13, marginRight: 4 }}>Skip</Text>
                            <FastForward size={16} color={colors.mutedForeground} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Chat Messages with Inline Selectors */}
                <ScrollView
                    ref={scrollViewRef}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === 'ios' ? 24 : 32 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {messages.map((msg, index) => {
                        // Find if this is the last bot message
                        const lastBotIndex = messages.map((m, i) => m.type === 'bot' ? i : -1).filter(i => i !== -1).pop();
                        const isLastBotMessage = msg.type === 'bot' && index === lastBotIndex;

                        return msg.type === 'bot' ? (
                            <BotBubble
                                key={msg.id}
                                content={msg.content}
                                showAvatar={index === 0 || messages[index - 1]?.type !== 'bot'}
                                isLatest={isLastBotMessage}
                                colors={colors}
                            />
                        ) : (
                            <UserBubble key={msg.id} content={msg.content} colors={colors} />
                        );
                    })}

                    {isTyping && <TypingIndicator colors={colors} />}

                    {/* Inline Input Selector - rendered inside chat */}
                    {renderInputArea()}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Skip Confirmation Modal */}
            <Modal
                visible={showSkipDialog}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSkipDialog(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 24,
                }}>
                    <View style={{
                        backgroundColor: colors.card || colors.background,
                        borderRadius: 20,
                        padding: 24,
                        width: '100%',
                        maxWidth: 340,
                    }}>
                        {/* Warning Icon */}
                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontSize: 48 }}>⚠️</Text>
                        </View>

                        {/* Title */}
                        <Text style={{
                            fontSize: 20,
                            fontWeight: 'bold',
                            color: colors.foreground,
                            textAlign: 'center',
                            marginBottom: 12,
                        }}>
                            Skip Setup?
                        </Text>

                        {/* Warning Message */}
                        <Text style={{
                            fontSize: 15,
                            color: colors.mutedForeground,
                            textAlign: 'center',
                            marginBottom: 24,
                            lineHeight: 22,
                        }}>
                            If you skip, we'll use default values for your profile. Your calorie targets and recommendations may not be accurate.{'\n\n'}You can update these later in Settings.
                        </Text>

                        {/* Buttons */}
                        <View style={{ gap: 12 }}>
                            {/* Continue Button - Green */}
                            <TouchableOpacity
                                onPress={() => setShowSkipDialog(false)}
                                style={{
                                    backgroundColor: '#22c55e',
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                                    Continue Setup
                                </Text>
                            </TouchableOpacity>

                            {/* Skip Button - Red */}
                            <TouchableOpacity
                                onPress={() => {
                                    setShowSkipDialog(false);
                                    handleSubmit();
                                }}
                                disabled={isLoading}
                                style={{
                                    backgroundColor: '#ef4444',
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    opacity: isLoading ? 0.7 : 1,
                                }}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                                        Skip for Now
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
