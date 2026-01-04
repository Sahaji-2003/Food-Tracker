import { View, Text, TouchableOpacity, Switch, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LogOut, ChevronRight, User, Bell, Shield, HelpCircle, Moon, Sun } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useThemeStore } from '@/store/useThemeStore';

export default function ProfileScreen() {
    const { user, profile, setUser, setProfile } = useStore();
    const { colors, mode, toggleTheme } = useThemeStore();

    const handleSignOut = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        await supabase.auth.signOut();
                        setUser(null);
                        setProfile(null);
                        router.replace('/(auth)/login');
                    },
                },
            ]
        );
    };

    const menuItems = [
        { icon: User, label: 'Edit Profile', onPress: () => router.push('/(auth)/onboarding') },
        { icon: Bell, label: 'Notifications', onPress: () => { } },
        { icon: Shield, label: 'Privacy', onPress: () => { } },
        { icon: HelpCircle, label: 'Help & Support', onPress: () => { } },
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Header */}
                <View style={{ alignItems: 'center', marginBottom: 32 }}>
                    <View
                        style={{
                            width: 96,
                            height: 96,
                            borderRadius: 48,
                            backgroundColor: colors.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 16,
                        }}
                    >
                        <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#ffffff' }}>
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.foreground }}>
                        {user?.email}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, marginTop: 4 }}>
                        {profile?.target_goal || 'Set your goal'}
                    </Text>
                </View>

                {/* Stats */}
                <View
                    style={{
                        flexDirection: 'row',
                        backgroundColor: colors.secondary,
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 24,
                    }}
                >
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.foreground }}>
                            {profile?.weight || '-'}
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>kg</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.border }} />
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.foreground }}>
                            {profile?.height || '-'}
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>cm</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.border }} />
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.foreground }}>
                            {profile?.daily_calorie_target || 2000}
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>cal/day</Text>
                    </View>
                </View>

                {/* Theme Toggle */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.secondary,
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 16,
                    }}
                >
                    {mode === 'dark' ? (
                        <Moon size={20} color={colors.foreground} />
                    ) : (
                        <Sun size={20} color={colors.foreground} />
                    )}
                    <Text style={{ flex: 1, color: colors.foreground, marginLeft: 12, fontSize: 16 }}>
                        Dark Mode
                    </Text>
                    <Switch
                        value={mode === 'dark'}
                        onValueChange={toggleTheme}
                        trackColor={{ false: colors.muted, true: colors.primary }}
                        thumbColor="#ffffff"
                    />
                </View>

                {/* Menu Items */}
                <View
                    style={{
                        backgroundColor: colors.secondary,
                        borderRadius: 16,
                        overflow: 'hidden',
                        marginBottom: 24,
                    }}
                >
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={item.label}
                            onPress={item.onPress}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 16,
                                paddingHorizontal: 16,
                                borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                                borderBottomColor: colors.border,
                            }}
                        >
                            <item.icon size={20} color={colors.foreground} />
                            <Text style={{ flex: 1, color: colors.foreground, marginLeft: 12, fontSize: 16 }}>
                                {item.label}
                            </Text>
                            <ChevronRight size={20} color={colors.mutedForeground} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Sign Out Button */}
                <TouchableOpacity
                    onPress={handleSignOut}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 16,
                        backgroundColor: colors.destructive,
                        borderRadius: 12,
                    }}
                >
                    <LogOut size={20} color="#ffffff" />
                    <Text style={{ color: '#ffffff', fontWeight: '600', marginLeft: 8 }}>
                        Sign Out
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
