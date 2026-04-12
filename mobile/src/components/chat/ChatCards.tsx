/**
 * Interactive Chat Card Components
 * 
 * Cards show ONLY: icon + title + short description (max 100 chars) + "Tap to view details"
 * Full details are ONLY inside the modal when tapped.
 * AI's text response stays in the normal chat bubble — cards are just interactive widgets below it.
 */

import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, ActivityIndicator, Modal,
    ScrollView, Platform,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import {
    Utensils, Droplets, Target, ChefHat, TrendingUp, Flame,
    CheckCircle, X, Zap, Footprints, Eye, Sparkles
} from 'lucide-react-native';
import { useThemeStore } from '@/store/useThemeStore';
import { chatAPI } from '@/lib/api';
import { CircularProgress, BarChart, MacroBreakdown } from './Charts';
import { DynamicUIRenderer } from './DynamicUI';

// ===== Types =====
interface UICard {
    card_type: string;
    data: Record<string, any>;
    actions: { label: string; action: string; payload?: any }[];
}

interface CardProps {
    card: UICard;
    onActionComplete?: () => void;
}


// ═══════════════════════════════════════
//  SHARED COMPONENTS
// ═══════════════════════════════════════

function useModalMarkdownStyles() {
    const { colors } = useThemeStore();
    return {
        body: { color: colors.foreground, fontSize: 14, lineHeight: 22 },
        heading1: { color: colors.foreground, fontSize: 17, fontWeight: 'bold' as const, marginTop: 6, marginBottom: 4 },
        heading2: { color: colors.foreground, fontSize: 15, fontWeight: '600' as const, marginTop: 4, marginBottom: 3 },
        strong: { fontWeight: 'bold' as const, color: colors.foreground },
        em: { fontStyle: 'italic' as const },
        bullet_list: { marginLeft: 4 },
        ordered_list: { marginLeft: 4 },
        list_item: { marginBottom: 3 },
        paragraph: { marginBottom: 6 },
        code_inline: { backgroundColor: colors.muted, paddingHorizontal: 4, borderRadius: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13 },
    };
}

/** Bottom sheet modal */
function CardModal({
    visible, onClose, accentColor, icon: Icon, title, children,
}: {
    visible: boolean; onClose: () => void; accentColor: string;
    icon: any; title: string; children: React.ReactNode;
}) {
    const { colors } = useThemeStore();
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                <View style={{
                    backgroundColor: colors.card || colors.background,
                    borderTopLeftRadius: 24, borderTopRightRadius: 24,
                    maxHeight: '90%', paddingBottom: 34,
                }}>
                    <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
                        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.muted }} />
                    </View>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingHorizontal: 20, paddingBottom: 14,
                        borderBottomWidth: 1, borderBottomColor: colors.border,
                    }}>
                        <View style={{
                            width: 40, height: 40, borderRadius: 20,
                            backgroundColor: accentColor + '20',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Icon size={20} color={accentColor} />
                        </View>
                        <Text style={{ color: colors.foreground, fontWeight: 'bold', fontSize: 18, marginLeft: 12, flex: 1 }}>
                            {title}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
                            <X size={22} color={colors.mutedForeground} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{ paddingHorizontal: 20, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
                        {children}
                        <View style={{ height: 30 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

/** Compact inline preview card: icon + title + short desc + "Tap to view" */
function CompactCard({
    accentColor, icon: Icon, title, description, onPress, children,
}: {
    accentColor: string; icon: any; title: string; description: string;
    onPress: () => void; children?: React.ReactNode;
}) {
    const { colors } = useThemeStore();
    const shortDesc = description.length > 100 ? description.substring(0, 97) + '...' : description;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.75}
            style={{
                backgroundColor: colors.secondary,
                borderRadius: 14,
                padding: 14,
                marginBottom: 6,
                borderLeftWidth: 3,
                borderLeftColor: accentColor,
            }}
        >
            {/* Header row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <View style={{
                    width: 30, height: 30, borderRadius: 15,
                    backgroundColor: accentColor + '20',
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon size={15} color={accentColor} />
                </View>
                <Text style={{ color: colors.foreground, fontWeight: 'bold', fontSize: 14, marginLeft: 8, flex: 1 }}
                    numberOfLines={1}
                >
                    {title}
                </Text>
            </View>

            {/* Short description */}
            <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 18, marginBottom: 4 }}
                numberOfLines={2}
            >
                {shortDesc}
            </Text>

            {/* Optional inline widget (progress bar, stats, etc.) */}
            {children}

            {/* Centered "Tap to view" */}
            <View style={{ alignItems: 'center', marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Eye size={13} color={accentColor} />
                    <Text style={{ color: accentColor, fontSize: 12, fontWeight: '600', marginLeft: 5 }}>
                        Tap to view details
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}


// ═══════════════════════════════════════
//  MEAL LOG CARD
// ═══════════════════════════════════════
export function MealLogCard({ card, onActionComplete }: CardProps) {
    const { colors } = useThemeStore();
    const mdStyles = useModalMarkdownStyles();
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const data = card.data;
    const foodName = data.food_name || data.food_description || 'Meal';

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await chatAPI.confirmMeal({
                food_name: foodName,
                calories: data.calories || 0,
                protein: data.protein || data.macros?.p || 0,
                carbs: data.carbs || data.macros?.c || 0,
                fat: data.fat || data.macros?.f || 0,
                plate_grade: data.plate_grade || 'B',
                reasoning: data.reasoning || '',
                source: 'chat',
            });
            setConfirmed(true);
            setModalVisible(false);
            onActionComplete?.();
        } catch (err) {
            console.error('Confirm meal failed:', err);
        } finally {
            setLoading(false);
        }
    };

    if (confirmed) {
        return (
            <View style={{
                backgroundColor: '#22c55e15', borderRadius: 14, padding: 12,
                borderLeftWidth: 3, borderLeftColor: '#22c55e',
                flexDirection: 'row', alignItems: 'center', marginBottom: 6,
            }}>
                <CheckCircle size={18} color="#22c55e" />
                <Text style={{ color: '#22c55e', fontWeight: '600', marginLeft: 8, fontSize: 13 }}>
                    Meal logged! Dashboard updated ✨
                </Text>
            </View>
        );
    }

    const cal = data.calories || 0;
    const desc = cal ? `${cal} Cal — Tap to review and log this meal` : 'Tap to review nutritional info and log';

    return (
        <>
            <CompactCard
                accentColor="#14b8a6"
                icon={Utensils}
                title={`🍽️ ${foodName}`}
                description={desc}
                onPress={() => setModalVisible(true)}
            />
            <CardModal visible={modalVisible} onClose={() => setModalVisible(false)}
                accentColor="#14b8a6" icon={Utensils} title={`🍽️ ${foodName}`}
            >
                {/* Nutrition Grid */}
                <View style={{
                    flexDirection: 'row', backgroundColor: colors.muted,
                    borderRadius: 16, padding: 16, marginBottom: 16,
                }}>
                    {[
                        { label: 'Calories', value: `${cal}`, color: '#14b8a6' },
                        { label: 'Protein', value: `${data.protein || data.macros?.p || 0}g` },
                        { label: 'Carbs', value: `${data.carbs || data.macros?.c || 0}g` },
                        { label: 'Fat', value: `${data.fat || data.macros?.f || 0}g` },
                    ].map((item, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <View style={{ width: 1, backgroundColor: colors.border }} />}
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{item.label}</Text>
                                <Text style={{ color: item.color || colors.foreground, fontWeight: 'bold', fontSize: item.color ? 22 : 18, marginTop: 4 }}>
                                    {item.value}
                                </Text>
                            </View>
                        </React.Fragment>
                    ))}
                </View>

                {/* Grade */}
                {data.plate_grade && (
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', marginBottom: 16,
                        backgroundColor: colors.muted, borderRadius: 12, padding: 12,
                    }}>
                        <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Plate Grade: </Text>
                        <Text style={{
                            color: data.plate_grade?.startsWith('A') ? '#22c55e' : data.plate_grade?.startsWith('B') ? '#f59e0b' : '#ef4444',
                            fontWeight: 'bold', fontSize: 20,
                        }}>{data.plate_grade}</Text>
                    </View>
                )}

                {/* Reasoning */}
                {data.reasoning && (
                    <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 20, marginBottom: 16 }}>
                        {data.reasoning}
                    </Text>
                )}

                {/* Context info */}
                {data.user_context && (
                    <View style={{ backgroundColor: colors.muted, borderRadius: 12, padding: 12, marginBottom: 16 }}>
                        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                            Today so far: {data.user_context.calories_consumed_today} / {data.user_context.calorie_target} Cal
                        </Text>
                    </View>
                )}

                {/* Confirm Button */}
                <TouchableOpacity
                    onPress={handleConfirm} disabled={loading}
                    style={{
                        backgroundColor: '#14b8a6', borderRadius: 14,
                        paddingVertical: 16, alignItems: 'center', flexDirection: 'row',
                        justifyContent: 'center', marginBottom: 10,
                    }}
                >
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : (
                        <>
                            <CheckCircle size={18} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }}>
                                Confirm & Log to Dashboard
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </CardModal>
        </>
    );
}


// ═══════════════════════════════════════
//  WATER CARD
// ═══════════════════════════════════════
export function WaterCard({ card }: CardProps) {
    const { colors } = useThemeStore();
    const [modalVisible, setModalVisible] = useState(false);
    const data = card.data;
    const pct = Math.min(data.percentage || 0, 100);

    return (
        <>
            <CompactCard
                accentColor="#3b82f6"
                icon={Droplets}
                title={`💧 +${data.amount_added_ml}ml Water Logged`}
                description={`${(data.total_water_ml / 1000).toFixed(1)}L of ${(data.water_target_ml / 1000).toFixed(1)}L — ${pct.toFixed(0)}% of daily goal`}
                onPress={() => setModalVisible(true)}
            >
                {/* Inline progress bar */}
                <View style={{ height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
                    <View style={{ height: '100%', width: `${pct}%`, backgroundColor: '#3b82f6', borderRadius: 3 }} />
                </View>
            </CompactCard>

            <CardModal visible={modalVisible} onClose={() => setModalVisible(false)}
                accentColor="#3b82f6" icon={Droplets} title="💧 Water Intake"
            >
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                    <Text style={{ color: '#3b82f6', fontSize: 48, fontWeight: 'bold' }}>+{data.amount_added_ml}ml</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 4 }}>added just now</Text>
                </View>
                <View style={{ backgroundColor: colors.muted, borderRadius: 16, padding: 20, marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Total Today</Text>
                        <Text style={{ color: colors.foreground, fontWeight: 'bold', fontSize: 16 }}>{(data.total_water_ml / 1000).toFixed(1)}L</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                        <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Target</Text>
                        <Text style={{ color: colors.foreground, fontWeight: 'bold', fontSize: 16 }}>{(data.water_target_ml / 1000).toFixed(1)}L</Text>
                    </View>
                    <View style={{ height: 12, backgroundColor: colors.background, borderRadius: 6, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: '#3b82f6', borderRadius: 6 }} />
                    </View>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 6, textAlign: 'center' }}>{pct.toFixed(0)}% complete</Text>
                </View>
            </CardModal>
        </>
    );
}


// ═══════════════════════════════════════
//  DAILY SUMMARY / ANALYTICS CARD
// ═══════════════════════════════════════
export function DailySummaryCard({ card }: CardProps) {
    const { colors } = useThemeStore();
    const [modalVisible, setModalVisible] = useState(false);
    const data = card.data;
    const calPct = Math.min(data.calorie_percentage || 0, 100);
    const waterPct = Math.min(data.water_percentage || 0, 100);
    const macros = data.macros || { protein: 0, carbs: 0, fat: 0 };
    const weeklyTrend = data.weekly_trend || [];
    const mealsToday = data.meals_today || [];

    return (
        <>
            <CompactCard
                accentColor="#8b5cf6"
                icon={TrendingUp}
                title="📊 Today's Progress"
                description={`${data.calories_in} Cal eaten • ${data.calories_remaining} remaining • ${data.steps || 0} steps`}
                onPress={() => setModalVisible(true)}
            >
                {/* Inline calorie bar */}
                <View style={{ height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
                    <View style={{
                        height: '100%', width: `${calPct}%`,
                        backgroundColor: data.is_over_budget ? '#f59e0b' : '#14b8a6', borderRadius: 3,
                    }} />
                </View>
            </CompactCard>

            <CardModal visible={modalVisible} onClose={() => setModalVisible(false)}
                accentColor="#8b5cf6" icon={TrendingUp} title="📊 Daily Analytics"
            >
                {/* ── Section 1: Calorie Ring ── */}
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <CircularProgress
                        percentage={calPct}
                        size={140}
                        strokeWidth={12}
                        color={data.is_over_budget ? '#f59e0b' : '#14b8a6'}
                        bgColor={colors.muted}
                        label={`${data.calories_remaining}`}
                        sublabel="Cal left"
                        labelColor={colors.foreground}
                    />
                </View>

                {/* Calorie stats row */}
                <View style={{
                    flexDirection: 'row', backgroundColor: colors.muted,
                    borderRadius: 14, padding: 14, marginBottom: 20,
                }}>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Flame size={16} color="#14b8a6" />
                        <Text style={{ color: colors.foreground, fontWeight: 'bold', fontSize: 18, marginTop: 4 }}>{data.calories_in?.toLocaleString()}</Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Eaten</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.border }} />
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Zap size={16} color="#f59e0b" />
                        <Text style={{ color: colors.foreground, fontWeight: 'bold', fontSize: 18, marginTop: 4 }}>{data.calories_out?.toLocaleString()}</Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Burned</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.border }} />
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Target size={16} color={data.is_over_budget ? '#f59e0b' : '#22c55e'} />
                        <Text style={{ color: data.is_over_budget ? '#f59e0b' : '#22c55e', fontWeight: 'bold', fontSize: 18, marginTop: 4 }}>{data.calorie_target?.toLocaleString()}</Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Goal</Text>
                    </View>
                </View>

                {/* ── Section 2: Macro Breakdown ── */}
                {(macros.protein > 0 || macros.carbs > 0 || macros.fat > 0) && (
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ color: colors.foreground, fontWeight: 'bold', fontSize: 15, marginBottom: 12 }}>
                            🥩 Macro Breakdown
                        </Text>
                        <View style={{ backgroundColor: colors.muted, borderRadius: 14, padding: 16 }}>
                            <MacroBreakdown
                                protein={macros.protein}
                                carbs={macros.carbs}
                                fat={macros.fat}
                                labelColor={colors.mutedForeground}
                                valueColor={colors.foreground}
                            />
                        </View>
                    </View>
                )}

                {/* ── Section 3: Weekly Trend ── */}
                {weeklyTrend.length > 0 && (
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ color: colors.foreground, fontWeight: 'bold', fontSize: 15, marginBottom: 12 }}>
                            📈 This Week
                        </Text>
                        <View style={{ backgroundColor: colors.muted, borderRadius: 14, padding: 16 }}>
                            <BarChart
                                data={weeklyTrend.map((d: any) => ({
                                    label: d.day,
                                    value: d.calories_in,
                                    limit: data.calorie_target,
                                }))}
                                barColor="#8b5cf6"
                                barBgColor={colors.background}
                                labelColor={colors.mutedForeground}
                                valueColor={colors.foreground}
                                height={130}
                            />
                        </View>
                    </View>
                )}

                {/* ── Section 4: Water, Steps, Active ── */}
                <Text style={{ color: colors.foreground, fontWeight: 'bold', fontSize: 15, marginBottom: 12 }}>
                    🏃 Activity
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                    <View style={{ flex: 1, backgroundColor: colors.muted, borderRadius: 14, padding: 14, alignItems: 'center' }}>
                        <Droplets size={18} color="#3b82f6" />
                        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: 'bold', marginTop: 4 }}>
                            {(data.water_ml / 1000).toFixed(1)}L
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>of {(data.water_target_ml / 1000).toFixed(1)}L</Text>
                        {/* Mini water bar */}
                        <View style={{ width: '100%', height: 4, backgroundColor: colors.background, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                            <View style={{ height: '100%', width: `${waterPct}%`, backgroundColor: '#3b82f6', borderRadius: 2 }} />
                        </View>
                    </View>
                    <View style={{ flex: 1, backgroundColor: colors.muted, borderRadius: 14, padding: 14, alignItems: 'center' }}>
                        <Footprints size={18} color="#22c55e" />
                        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: 'bold', marginTop: 4 }}>{data.steps?.toLocaleString()}</Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>steps</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: colors.muted, borderRadius: 14, padding: 14, alignItems: 'center' }}>
                        <Zap size={18} color="#f59e0b" />
                        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: 'bold', marginTop: 4 }}>{data.active_minutes || 0}</Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>active min</Text>
                    </View>
                </View>

                {/* ── Section 5: Today's Meals ── */}
                {mealsToday.length > 0 && (
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ color: colors.foreground, fontWeight: 'bold', fontSize: 15, marginBottom: 12 }}>
                            🍽️ Today's Meals
                        </Text>
                        {mealsToday.map((meal: any, i: number) => (
                            <View key={i} style={{
                                flexDirection: 'row', alignItems: 'center',
                                backgroundColor: colors.muted, borderRadius: 10, padding: 12,
                                marginBottom: 6,
                            }}>
                                <View style={{
                                    width: 8, height: 8, borderRadius: 4,
                                    backgroundColor: meal.grade?.startsWith('A') ? '#22c55e' : meal.grade?.startsWith('B') ? '#f59e0b' : '#ef4444',
                                    marginRight: 10,
                                }} />
                                <Text style={{ color: colors.foreground, fontSize: 13, flex: 1 }}>{meal.name}</Text>
                                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: '600' }}>{meal.calories} Cal</Text>
                                <Text style={{
                                    color: meal.grade?.startsWith('A') ? '#22c55e' : meal.grade?.startsWith('B') ? '#f59e0b' : '#ef4444',
                                    fontSize: 12, fontWeight: 'bold', marginLeft: 8, width: 24, textAlign: 'center',
                                }}>{meal.grade}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </CardModal>
        </>
    );
}


// ═══════════════════════════════════════
//  RECIPE CARD
// ═══════════════════════════════════════
export function RecipeCard({ card }: CardProps) {
    const { colors } = useThemeStore();
    const mdStyles = useModalMarkdownStyles();
    const [modalVisible, setModalVisible] = useState(false);
    const data = card.data;
    const title = data.title || data.name || 'Recipe';

    const desc = [
        data.cook_time ? `⏱ ${data.cook_time} min` : null,
        data.calories ? `🔥 ${data.calories} Cal` : data.max_calories ? `🔥 ≤${data.max_calories} Cal` : null,
        data.cuisine_preference ? `🍳 ${data.cuisine_preference}` : null,
    ].filter(Boolean).join(' • ') || 'Tap to see the full recipe';

    return (
        <>
            <CompactCard
                accentColor="#f59e0b"
                icon={ChefHat}
                title={`👨‍🍳 ${title}`}
                description={desc}
                onPress={() => setModalVisible(true)}
            />
            <CardModal visible={modalVisible} onClose={() => setModalVisible(false)}
                accentColor="#f59e0b" icon={ChefHat} title={`👨‍🍳 ${title}`}
            >
                {/* Meta pills */}
                {(data.cook_time || data.calories || data.max_calories) && (
                    <View style={{
                        flexDirection: 'row', backgroundColor: colors.muted,
                        borderRadius: 14, padding: 14, marginBottom: 16, justifyContent: 'center', gap: 20,
                    }}>
                        {data.cook_time && <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>⏱ {data.cook_time} min</Text>}
                        {(data.calories || data.max_calories) && <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>🔥 {data.calories || data.max_calories} Cal</Text>}
                    </View>
                )}

                {/* Ingredients */}
                {data.ingredients && (
                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ color: colors.foreground, fontWeight: 'bold', fontSize: 16, marginBottom: 10 }}>🥘 Ingredients</Text>
                        {(Array.isArray(data.ingredients) ? data.ingredients : String(data.ingredients).split(',')).map((item: string, i: number) => (
                            <View key={i} style={{
                                flexDirection: 'row', alignItems: 'center',
                                paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.border,
                            }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b', marginRight: 10 }} />
                                <Text style={{ color: colors.foreground, fontSize: 14 }}>{item.trim()}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Instructions */}
                {data.instructions && (
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ color: colors.foreground, fontWeight: 'bold', fontSize: 16, marginBottom: 10 }}>📝 Instructions</Text>
                        {typeof data.instructions === 'string' && data.instructions.includes('#') ? (
                            <Markdown style={mdStyles}>{data.instructions}</Markdown>
                        ) : (
                            <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 22 }}>{data.instructions}</Text>
                        )}
                    </View>
                )}

                {/* Dietary info */}
                {data.allergies?.length > 0 && (
                    <View style={{ backgroundColor: colors.muted, borderRadius: 12, padding: 12, marginBottom: 16 }}>
                        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                            Avoiding: {data.allergies.join(', ')}
                        </Text>
                    </View>
                )}
            </CardModal>
        </>
    );
}


// ═══════════════════════════════════════
//  GOAL UPDATE CARD
// ═══════════════════════════════════════
export function GoalUpdateCard({ card, onActionComplete }: CardProps) {
    const { colors } = useThemeStore();
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [applied, setApplied] = useState(false);
    const data = card.data;

    const handleApply = async () => {
        setLoading(true);
        try {
            await chatAPI.confirmGoal({ new_target: data.new_target });
            setApplied(true);
            setModalVisible(false);
            onActionComplete?.();
        } catch (err) {
            console.error('Goal update failed:', err);
        } finally {
            setLoading(false);
        }
    };

    if (applied) {
        return (
            <View style={{
                backgroundColor: '#22c55e15', borderRadius: 14, padding: 12,
                borderLeftWidth: 3, borderLeftColor: '#22c55e',
                flexDirection: 'row', alignItems: 'center', marginBottom: 6,
            }}>
                <CheckCircle size={18} color="#22c55e" />
                <Text style={{ color: '#22c55e', fontWeight: '600', marginLeft: 8, fontSize: 13 }}>
                    Goal updated to {data.new_target} Cal! 🎯
                </Text>
            </View>
        );
    }

    return (
        <>
            <CompactCard
                accentColor="#8b5cf6"
                icon={Target}
                title="🎯 Update Calorie Goal"
                description={`${data.current_target} → ${data.new_target} Cal (${data.difference > 0 ? '+' : ''}${data.difference})`}
                onPress={() => setModalVisible(true)}
            />
            <CardModal visible={modalVisible} onClose={() => setModalVisible(false)}
                accentColor="#8b5cf6" icon={Target} title="🎯 Update Calorie Goal"
            >
                <View style={{
                    backgroundColor: colors.muted, borderRadius: 16, padding: 24,
                    alignItems: 'center', marginBottom: 20,
                }}>
                    <Text style={{ color: colors.mutedForeground, fontSize: 13, marginBottom: 8 }}>Daily Calorie Target</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: colors.mutedForeground, fontSize: 24, fontWeight: '600' }}>{data.current_target}</Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 24, marginHorizontal: 16 }}>→</Text>
                        <Text style={{ color: data.difference > 0 ? '#22c55e' : '#f59e0b', fontSize: 32, fontWeight: 'bold' }}>{data.new_target}</Text>
                    </View>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 6 }}>
                        {data.difference > 0 ? `+${data.difference}` : data.difference} Cal
                    </Text>
                </View>

                {data.reason && (
                    <Text style={{ color: colors.mutedForeground, fontSize: 14, marginBottom: 20, lineHeight: 20 }}>
                        Reason: {data.reason}
                    </Text>
                )}

                <TouchableOpacity
                    onPress={handleApply} disabled={loading}
                    style={{
                        backgroundColor: '#8b5cf6', borderRadius: 14,
                        paddingVertical: 16, alignItems: 'center', flexDirection: 'row',
                        justifyContent: 'center', marginBottom: 10,
                    }}
                >
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : (
                        <>
                            <CheckCircle size={18} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }}>Apply New Goal</Text>
                        </>
                    )}
                </TouchableOpacity>
            </CardModal>
        </>
    );
}


// ═══════════════════════════════════════
//  MEAL SUGGESTIONS CARD
// ═══════════════════════════════════════
export function MealSuggestionsCard({ card }: CardProps) {
    const { colors } = useThemeStore();
    const [modalVisible, setModalVisible] = useState(false);
    const data = card.data;
    const mealType = (data.meal_type || 'Any').charAt(0).toUpperCase() + (data.meal_type || 'any').slice(1);

    return (
        <>
            <CompactCard
                accentColor="#22c55e"
                icon={Utensils}
                title="🍱 Meal Suggestions"
                description={`${mealType} meal • Budget: ${data.max_calories} Cal • Goal: ${data.goal || 'General'}`}
                onPress={() => setModalVisible(true)}
            />
            <CardModal visible={modalVisible} onClose={() => setModalVisible(false)}
                accentColor="#22c55e" icon={Utensils} title="🍱 Meal Suggestions"
            >
                <View style={{ backgroundColor: colors.muted, borderRadius: 14, padding: 16, marginBottom: 20 }}>
                    {[
                        ['Calorie Budget', `${data.max_calories} Cal`, '#22c55e'],
                        ['Meal Type', mealType],
                        ['Goal', data.goal || 'General Health'],
                    ].map(([label, value, color], i) => (
                        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: i < 2 ? 10 : 0 }}>
                            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>{label}</Text>
                            <Text style={{ color: (color as string) || colors.foreground, fontWeight: 'bold', fontSize: 14 }}>{value}</Text>
                        </View>
                    ))}
                </View>

                {data.suggestions && data.suggestions.length > 0 && (
                    <View style={{ marginTop: 8, marginBottom: 16 }}>
                        <Text style={{ color: colors.foreground, fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>✨ Top Choices</Text>
                        {data.suggestions.map((suggestion: any, index: number) => (
                            <View key={index} style={{ backgroundColor: colors.muted, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                    <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 8 }}>
                                        {suggestion.name}
                                    </Text>
                                    <Text style={{ color: '#22c55e', fontSize: 13, fontWeight: 'bold' }}>
                                        🔥 {suggestion.calories} Cal
                                    </Text>
                                </View>
                                <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 18 }}>
                                    {suggestion.reason}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {data.allergies?.length > 0 && (
                    <View style={{ backgroundColor: colors.muted, borderRadius: 12, padding: 12 }}>
                        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Avoiding: {data.allergies.join(', ')}</Text>
                    </View>
                )}
            </CardModal>
        </>
    );
}


// ═══════════════════════════════════════
//  DYNAMIC UI CARD (Generative UI)
// ═══════════════════════════════════════
export function DynamicUICard({ card }: CardProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const data = card.data;
    const title = data.title || "✨ Custom Dynamic UI";

    return (
        <>
            <CompactCard
                accentColor="#ec4899"
                icon={Zap}
                title={title}
                description="Tap to view generated interactive UI"
                onPress={() => setModalVisible(true)}
            />
            <CardModal visible={modalVisible} onClose={() => setModalVisible(false)}
                accentColor="#ec4899" icon={Zap} title={title}
            >
                {data.layout ? (
                    <DynamicUIRenderer layout={data.layout} />
                ) : (
                    <Text style={{ color: "red" }}>Warning: Invalid layout data from AI</Text>
                )}
            </CardModal>
        </>
    );
}

// ═══════════════════════════════════════
//  CARD RENDERER
// ═══════════════════════════════════════
export function CardRenderer({ card, onActionComplete }: CardProps) {
    switch (card.card_type) {
        case 'meal_log_card':
            return <MealLogCard card={card} onActionComplete={onActionComplete} />;
        case 'water_card':
            return <WaterCard card={card} />;
        case 'daily_summary_card':
            return <DailySummaryCard card={card} />;
        case 'recipe_card':
            return <RecipeCard card={card} />;
        case 'goal_update_card':
            return <GoalUpdateCard card={card} onActionComplete={onActionComplete} />;
        case 'meal_suggestions_card':
            return <MealSuggestionsCard card={card} />;
        case 'dynamic_ui_card':
            return <DynamicUICard card={card} />;
        case 'error':
        default:
            return null;
    }
}
