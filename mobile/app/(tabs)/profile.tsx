import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert, ScrollView, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { LogOut, ChevronRight, ChevronDown, User, Moon, Sun, Edit2, Plus, X, Check, Target, Activity, AlertTriangle, Heart, Scale, Ruler } from 'lucide-react-native';
import { supabase, Profile } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useThemeStore } from '@/store/useThemeStore';
import { profileAPI } from '@/lib/api';

const GOAL_OPTIONS = ['Weight Loss', 'Weight Gain', 'Muscle Building', 'Maintain Weight', 'General Health', 'Athletic Performance'];
const ACTIVITY_OPTIONS = ['Walking', 'Running', 'Cycling', 'Swimming', 'Yoga', 'Weight Training', 'HIIT', 'Dancing', 'Sports'];
const ALLERGY_OPTIONS = ['Dairy', 'Gluten', 'Nuts', 'Eggs', 'Soy', 'Shellfish', 'Fish', 'Wheat'];
const CONDITION_OPTIONS = ['Diabetes', 'Hypertension', 'Heart Disease', 'Thyroid', 'PCOS', 'Cholesterol'];

interface ProfileData {
    weight?: number;
    height?: number;
    age?: number;
    gender?: string;
    target_goal?: string;
    daily_calorie_target?: number;
    preferred_tasks?: string[];
    allergies?: string[];
    medical_conditions?: string[];
}

export default function ProfileScreen() {
    const { user, profile, setProfile } = useStore();
    const { colors, mode, toggleTheme } = useThemeStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profileData, setProfileData] = useState<ProfileData>({});

    // Edit modals
    const [editSection, setEditSection] = useState<string | null>(null);
    const [tempValue, setTempValue] = useState<string>('');
    const [customInput, setCustomInput] = useState('');

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await profileAPI.get();
            setProfileData(data);
            setProfile(data);
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [])
    );

    const saveProfile = async (updates: Partial<ProfileData>) => {
        setSaving(true);
        try {
            const newData = { ...profileData, ...updates };
            await profileAPI.update(newData);
            setProfileData(newData);
            setProfile(newData as Profile);
            setEditSection(null);
        } catch (error) {
            Alert.alert('Error', 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    const calculateBMR = () => {
        const { weight, height, age, gender } = profileData;
        if (!weight || !height || !age) return 2000;

        // Mifflin-St Jeor Equation
        if (gender === 'male') {
            return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
        } else {
            return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
        }
    };

    const toggleArrayItem = (array: string[] = [], item: string) => {
        if (array.includes(item)) {
            return array.filter(i => i !== item);
        }
        return [...array, item];
    };

    const addCustomItem = (field: 'preferred_tasks' | 'allergies' | 'medical_conditions') => {
        if (!customInput.trim()) return;
        const currentArray = profileData[field] || [];
        if (!currentArray.includes(customInput.trim())) {
            saveProfile({ [field]: [...currentArray, customInput.trim()] });
        }
        setCustomInput('');
    };

    const handleSignOut = async () => {
        Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await supabase.auth.signOut();
                    setProfile(null);
                },
            },
        ]);
    };

    const Chip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
        <TouchableOpacity
            onPress={onPress}
            style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: selected ? colors.primary : colors.muted,
                marginRight: 8,
                marginBottom: 8,
            }}
        >
            <Text style={{ color: selected ? '#fff' : colors.foreground, fontSize: 13 }}>{label}</Text>
        </TouchableOpacity>
    );

    const SectionHeader = ({ title, icon: Icon }: { title: string; icon: any }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 20 }}>
            <Icon size={18} color={colors.primary} />
            <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 16, marginLeft: 8 }}>{title}</Text>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                {/* Header */}
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                    <View style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                    }}>
                        <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#fff' }}>
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: colors.foreground }}>
                        {user?.email?.split('@')[0]}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, marginTop: 4 }}>
                        {profileData.target_goal || 'Set your goal'}
                    </Text>
                </View>

                {/* Body Stats */}
                <SectionHeader title="Body Stats" icon={Scale} />
                <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                        <TouchableOpacity
                            onPress={() => { setEditSection('weight'); setTempValue(String(profileData.weight || '')); }}
                            style={{ flex: 1, alignItems: 'center' }}
                        >
                            <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.foreground }}>
                                {profileData.weight || '-'}
                            </Text>
                            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>kg</Text>
                        </TouchableOpacity>
                        <View style={{ width: 1, backgroundColor: colors.border }} />
                        <TouchableOpacity
                            onPress={() => { setEditSection('height'); setTempValue(String(profileData.height || '')); }}
                            style={{ flex: 1, alignItems: 'center' }}
                        >
                            <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.foreground }}>
                                {profileData.height || '-'}
                            </Text>
                            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>cm</Text>
                        </TouchableOpacity>
                        <View style={{ width: 1, backgroundColor: colors.border }} />
                        <TouchableOpacity
                            onPress={() => { setEditSection('age'); setTempValue(String(profileData.age || '')); }}
                            style={{ flex: 1, alignItems: 'center' }}
                        >
                            <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.foreground }}>
                                {profileData.age || '-'}
                            </Text>
                            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>years</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Gender */}
                    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        {['male', 'female', 'other'].map((g) => (
                            <TouchableOpacity
                                key={g}
                                onPress={() => saveProfile({ gender: g })}
                                style={{
                                    flex: 1,
                                    paddingVertical: 10,
                                    borderRadius: 8,
                                    backgroundColor: profileData.gender === g ? colors.primary : colors.muted,
                                    marginHorizontal: 4,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: profileData.gender === g ? '#fff' : colors.foreground, fontWeight: '500' }}>
                                    {g.charAt(0).toUpperCase() + g.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign: 'center' }}>
                        Tap any value to edit
                    </Text>
                </View>

                {/* Calorie Target */}
                <SectionHeader title="Daily Calorie Target" icon={Target} />
                <TouchableOpacity
                    onPress={() => { setEditSection('calories'); setTempValue(String(profileData.daily_calorie_target || calculateBMR())); }}
                    style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' }}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.primary }}>
                            {profileData.daily_calorie_target || calculateBMR()} cal
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                            Estimated BMR: {calculateBMR()} cal (tap to edit)
                        </Text>
                    </View>
                    <Edit2 size={20} color={colors.mutedForeground} />
                </TouchableOpacity>

                {/* Goals */}
                <SectionHeader title="Your Goals" icon={Target} />
                <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 16 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {GOAL_OPTIONS.map((goal) => (
                            <Chip
                                key={goal}
                                label={goal}
                                selected={profileData.target_goal === goal}
                                onPress={() => saveProfile({ target_goal: goal })}
                            />
                        ))}
                    </View>
                </View>

                {/* Preferred Activities */}
                <SectionHeader title="Preferred Activities" icon={Activity} />
                <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 16 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {ACTIVITY_OPTIONS.map((activity) => (
                            <Chip
                                key={activity}
                                label={activity}
                                selected={(profileData.preferred_tasks || []).includes(activity)}
                                onPress={() => saveProfile({ preferred_tasks: toggleArrayItem(profileData.preferred_tasks, activity) })}
                            />
                        ))}
                        {(profileData.preferred_tasks || []).filter(t => !ACTIVITY_OPTIONS.includes(t)).map((custom) => (
                            <Chip
                                key={custom}
                                label={custom}
                                selected={true}
                                onPress={() => saveProfile({ preferred_tasks: toggleArrayItem(profileData.preferred_tasks, custom) })}
                            />
                        ))}
                    </View>
                    <View style={{ flexDirection: 'row', marginTop: 8 }}>
                        <TextInput
                            value={customInput}
                            onChangeText={setCustomInput}
                            placeholder="Add custom..."
                            placeholderTextColor={colors.mutedForeground}
                            style={{
                                flex: 1,
                                backgroundColor: colors.muted,
                                borderRadius: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                color: colors.foreground,
                            }}
                            onFocus={() => setEditSection('preferred_tasks')}
                        />
                        <TouchableOpacity
                            onPress={() => addCustomItem('preferred_tasks')}
                            style={{ backgroundColor: colors.primary, borderRadius: 8, padding: 10, marginLeft: 8 }}
                        >
                            <Plus size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Allergies */}
                <SectionHeader title="Food Allergies" icon={AlertTriangle} />
                <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 16 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {ALLERGY_OPTIONS.map((allergy) => (
                            <Chip
                                key={allergy}
                                label={allergy}
                                selected={(profileData.allergies || []).includes(allergy)}
                                onPress={() => saveProfile({ allergies: toggleArrayItem(profileData.allergies, allergy) })}
                            />
                        ))}
                        {(profileData.allergies || []).filter(a => !ALLERGY_OPTIONS.includes(a)).map((custom) => (
                            <Chip
                                key={custom}
                                label={custom}
                                selected={true}
                                onPress={() => saveProfile({ allergies: toggleArrayItem(profileData.allergies, custom) })}
                            />
                        ))}
                    </View>
                    <View style={{ flexDirection: 'row', marginTop: 8 }}>
                        <TextInput
                            value={editSection === 'allergies' ? customInput : ''}
                            onChangeText={setCustomInput}
                            placeholder="Add custom allergy..."
                            placeholderTextColor={colors.mutedForeground}
                            style={{
                                flex: 1,
                                backgroundColor: colors.muted,
                                borderRadius: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                color: colors.foreground,
                            }}
                            onFocus={() => setEditSection('allergies')}
                        />
                        <TouchableOpacity
                            onPress={() => { setEditSection('allergies'); addCustomItem('allergies'); }}
                            style={{ backgroundColor: colors.primary, borderRadius: 8, padding: 10, marginLeft: 8 }}
                        >
                            <Plus size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Medical Conditions */}
                <SectionHeader title="Medical Conditions" icon={Heart} />
                <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 16 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {CONDITION_OPTIONS.map((condition) => (
                            <Chip
                                key={condition}
                                label={condition}
                                selected={(profileData.medical_conditions || []).includes(condition)}
                                onPress={() => saveProfile({ medical_conditions: toggleArrayItem(profileData.medical_conditions, condition) })}
                            />
                        ))}
                        {(profileData.medical_conditions || []).filter(c => !CONDITION_OPTIONS.includes(c)).map((custom) => (
                            <Chip
                                key={custom}
                                label={custom}
                                selected={true}
                                onPress={() => saveProfile({ medical_conditions: toggleArrayItem(profileData.medical_conditions, custom) })}
                            />
                        ))}
                    </View>
                    <View style={{ flexDirection: 'row', marginTop: 8 }}>
                        <TextInput
                            value={editSection === 'medical_conditions' ? customInput : ''}
                            onChangeText={setCustomInput}
                            placeholder="Add condition..."
                            placeholderTextColor={colors.mutedForeground}
                            style={{
                                flex: 1,
                                backgroundColor: colors.muted,
                                borderRadius: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                color: colors.foreground,
                            }}
                            onFocus={() => setEditSection('medical_conditions')}
                        />
                        <TouchableOpacity
                            onPress={() => { setEditSection('medical_conditions'); addCustomItem('medical_conditions'); }}
                            style={{ backgroundColor: colors.primary, borderRadius: 8, padding: 10, marginLeft: 8 }}
                        >
                            <Plus size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Theme Toggle */}
                <SectionHeader title="Settings" icon={Moon} />
                <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
                    {mode === 'dark' ? <Moon size={20} color={colors.foreground} /> : <Sun size={20} color={colors.foreground} />}
                    <Text style={{ flex: 1, color: colors.foreground, marginLeft: 12 }}>Dark Mode</Text>
                    <Switch
                        value={mode === 'dark'}
                        onValueChange={toggleTheme}
                        trackColor={{ false: colors.muted, true: colors.primary }}
                        thumbColor="#fff"
                    />
                </View>

                {/* Sign Out */}
                <TouchableOpacity
                    onPress={handleSignOut}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 16,
                        backgroundColor: colors.destructive,
                        borderRadius: 12,
                        marginTop: 24,
                    }}
                >
                    <LogOut size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 8 }}>Sign Out</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Edit Modal for numeric values */}
            <Modal visible={['weight', 'height', 'age', 'calories'].includes(editSection || '')} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
                    <View style={{ backgroundColor: colors.background, borderRadius: 16, padding: 20 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.foreground, marginBottom: 16 }}>
                            Edit {editSection?.charAt(0).toUpperCase()}{editSection?.slice(1)}
                        </Text>
                        <TextInput
                            value={tempValue}
                            onChangeText={setTempValue}
                            keyboardType="numeric"
                            style={{
                                backgroundColor: colors.muted,
                                borderRadius: 12,
                                padding: 16,
                                fontSize: 24,
                                textAlign: 'center',
                                color: colors.foreground,
                            }}
                            autoFocus
                        />
                        <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => setEditSection(null)}
                                style={{ flex: 1, padding: 14, backgroundColor: colors.muted, borderRadius: 12, alignItems: 'center' }}
                            >
                                <Text style={{ color: colors.foreground, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    const field = editSection === 'calories' ? 'daily_calorie_target' : editSection;
                                    if (field) saveProfile({ [field]: Number(tempValue) });
                                }}
                                disabled={saving}
                                style={{ flex: 1, padding: 14, backgroundColor: colors.primary, borderRadius: 12, alignItems: 'center' }}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
