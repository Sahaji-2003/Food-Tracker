import { Tabs } from 'expo-router';
import { LayoutDashboard, Camera, Bot, UserCircle } from 'lucide-react-native';
import { useThemeStore } from '@/store/useThemeStore';

export default function TabsLayout() {
    const { colors } = useThemeStore();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.background,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    height: 65,
                    paddingBottom: 10,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.mutedForeground,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '500',
                },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="meals"
                options={{
                    title: 'Meals',
                    tabBarIcon: ({ color, size }) => <Camera color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="chat"
                options={{
                    title: 'FitBuddy',
                    tabBarIcon: ({ color, size }) => <Bot color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => <UserCircle color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="meal-detail"
                options={{
                    href: null, // Hide from tab bar
                }}
            />
        </Tabs>
    );
}

