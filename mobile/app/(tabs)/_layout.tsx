import { Tabs } from 'expo-router';
import { Home, UtensilsCrossed, MessageCircle, User } from 'lucide-react-native';
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
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.mutedForeground,
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="meals"
                options={{
                    title: 'Meals',
                    tabBarIcon: ({ color, size }) => <UtensilsCrossed color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="chat"
                options={{
                    title: 'FitBuddy',
                    tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
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
