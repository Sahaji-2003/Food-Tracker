import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, ScrollView, Dimensions } from 'react-native';
import {
    Sun, Footprints, AlertCircle, Target, Droplets, Dumbbell, Flame, X
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationData {
    caloriesIn: number;
    caloriesOut: number;
    calorieTarget: number;
    steps: number;
    waterMl: number;
    waterTarget: number;
    userName: string;
    activeCalories: number;
    totalCalories: number;
}

interface SmartNotification {
    id: string;
    icon: any;
    iconColor: string;
    bgColor: string;
    message: string;
    priority: number;
}

const DISMISSED_KEY = 'smart_notifs_dismissed';

function getNotifications(data: NotificationData): SmartNotification[] {
    const hour = new Date().getHours();
    const notifs: SmartNotification[] = [];
    const name = data.userName?.split('@')[0] || 'there';

    // Morning motivation — before noon, no meals logged
    if (hour < 12 && data.caloriesIn === 0) {
        notifs.push({
            id: 'morning',
            icon: Sun,
            iconColor: '#f59e0b',
            bgColor: '#fef3c7',
            message: `Good morning, ${name}! 🌅 Log your breakfast to start tracking today!`,
            priority: 1,
        });
    }

    // Low activity — after 3 PM, steps < 2000
    if (hour >= 15 && data.steps < 2000 && data.steps >= 0) {
        notifs.push({
            id: 'low_steps',
            icon: Footprints,
            iconColor: '#22c55e',
            bgColor: '#dcfce7',
            message: `Only ${data.steps.toLocaleString()} steps today. A 10-min walk burns ~50 Cal! 🚶`,
            priority: 3,
        });
    }

    // Over calorie goal
    const netCalories = data.caloriesIn - data.caloriesOut;
    if (netCalories > data.calorieTarget && data.caloriesIn > 0) {
        const over = netCalories - data.calorieTarget;
        notifs.push({
            id: 'over_goal',
            icon: AlertCircle,
            iconColor: '#d97706',
            bgColor: '#fef3c7',
            message: `You're ${over.toLocaleString()} Cal over your goal. A walk or lighter dinner helps! 🏃`,
            priority: 2,
        });
    }

    // Great progress — within 10% of target
    const remaining = Math.max(data.calorieTarget - netCalories, 0);
    if (
        data.caloriesIn > 0 &&
        netCalories >= data.calorieTarget * 0.9 &&
        netCalories <= data.calorieTarget * 1.1
    ) {
        notifs.push({
            id: 'on_track',
            icon: Target,
            iconColor: '#22c55e',
            bgColor: '#dcfce7',
            message: `Right on track with ${data.caloriesIn.toLocaleString()} Cal eaten! Keep it up 🎯`,
            priority: 4,
        });
    }

    // Hydration reminder — after 2 PM, water < 50%
    if (hour >= 14 && data.waterMl < data.waterTarget * 0.5) {
        const waterL = (data.waterMl / 1000).toFixed(1);
        const targetL = (data.waterTarget / 1000).toFixed(1);
        notifs.push({
            id: 'hydration',
            icon: Droplets,
            iconColor: '#3b82f6',
            bgColor: '#dbeafe',
            message: `Only ${waterL}L of ${targetL}L water today. Stay hydrated! 💧`,
            priority: 5,
        });
    }

    // No exercise after 4 PM
    if (hour >= 16 && data.activeCalories === 0 && data.caloriesIn > 0) {
        notifs.push({
            id: 'no_exercise',
            icon: Dumbbell,
            iconColor: '#8b5cf6',
            bgColor: '#ede9fe',
            message: `No exercise logged yet. Even a 15-min walk makes a difference! 💪`,
            priority: 6,
        });
    }

    // Sort by priority and return top 2
    return notifs.sort((a, b) => a.priority - b.priority).slice(0, 2);
}

export default function SmartNotifications({
    data,
    colors,
}: {
    data: NotificationData;
    colors: any;
}) {
    const [dismissed, setDismissed] = useState<string[]>([]);
    const [fadeAnims, setFadeAnims] = useState<Record<string, Animated.Value>>({});
    const [slideAnims, setSlideAnims] = useState<Record<string, Animated.Value>>({});
    const SCREEN_WIDTH = Dimensions.get('window').width;

    // Load dismissed notifications for this session
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        AsyncStorage.getItem(`${DISMISSED_KEY}_${today}`).then((val) => {
            if (val) setDismissed(JSON.parse(val));
        });
    }, []);

    const dismissNotification = async (id: string) => {
        // Animate out to the left
        if (fadeAnims[id] && slideAnims[id]) {
            Animated.parallel([
                Animated.timing(slideAnims[id], {
                    toValue: -SCREEN_WIDTH, 
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnims[id], {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start(async () => {
                const today = new Date().toISOString().split('T')[0];
                const newDismissed = [...dismissed, id];
                setDismissed(newDismissed);
                await AsyncStorage.setItem(`${DISMISSED_KEY}_${today}`, JSON.stringify(newDismissed));
            });
        } else {
             // Fallback if anim not initialized
            const today = new Date().toISOString().split('T')[0];
            const newDismissed = [...dismissed, id];
            setDismissed(newDismissed);
            await AsyncStorage.setItem(`${DISMISSED_KEY}_${today}`, JSON.stringify(newDismissed));
        }
    };

    const notifications = getNotifications(data).filter((n) => !dismissed.includes(n.id));

    // Initialize animations for new notifications
    useEffect(() => {
        const newFadeAnims: Record<string, Animated.Value> = {};
        const newSlideAnims: Record<string, Animated.Value> = {};
        notifications.forEach((n) => {
            if (!fadeAnims[n.id]) {
                newFadeAnims[n.id] = new Animated.Value(0);
                newSlideAnims[n.id] = new Animated.Value(0);
            }
        });
        if (Object.keys(newFadeAnims).length > 0) {
            setFadeAnims((prev) => ({ ...prev, ...newFadeAnims }));
            setSlideAnims((prev) => ({ ...prev, ...newSlideAnims }));
            // Fade and slide in
            setTimeout(() => {
                Object.values(newFadeAnims).forEach((anim) => {
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }).start();
                });
            }, 300);
        }
    }, [notifications.map(n => n.id).join(',')]);

    if (notifications.length === 0) return null;

    return (
        <View style={{ marginBottom: 16 + (notifications.length * 6), alignItems: 'center', minHeight: 70 }}>
            {notifications.map((notif, index) => {
                const Icon = notif.icon;
                const opacity = fadeAnims[notif.id] || new Animated.Value(1);
                const translateX = slideAnims[notif.id] || new Animated.Value(0);

                // Z-index stacking: 0 index is at the back, 1 index is at the front based on user request:
                // "first is below the second one"
                const isFirst = index === 0;
                const reverseIndex = notifications.length - 1 - index;
                const zIndex = index; // index 1 has higher zIndex than index 0
                
                return (
                    <Animated.View
                        key={notif.id}
                        style={{
                            opacity,
                            transform: [
                                { translateX },
                                { translateY: reverseIndex * -10 },
                                { scale: 1 - reverseIndex * 0.05 }
                            ],
                            position: reverseIndex === 0 ? 'relative' : 'absolute',
                            zIndex: zIndex,
                            top: reverseIndex === 0 ? 0 : reverseIndex * 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: colors.secondary,
                            borderRadius: 14,
                            padding: 12,
                            borderLeftWidth: 3,
                            borderLeftColor: notif.iconColor,
                            width: SCREEN_WIDTH - 32,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 3,
                        }}
                    >
                        <View
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: notif.iconColor + '20',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 10,
                            }}
                        >
                            <Icon size={18} color={notif.iconColor} />
                        </View>
                        <Text
                            style={{
                                flex: 1,
                                color: colors.foreground,
                                fontSize: 13,
                                lineHeight: 18,
                            }}
                        >
                            {notif.message}
                        </Text>
                        <TouchableOpacity
                            onPress={() => dismissNotification(notif.id)}
                            style={{ padding: 6, marginLeft: 4 }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <X size={14} color={colors.mutedForeground} />
                        </TouchableOpacity>
                    </Animated.View>
                );
            })}
        </View>
    );
}
