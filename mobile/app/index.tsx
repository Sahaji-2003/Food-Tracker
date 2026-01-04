import { Redirect } from 'expo-router';
import { useStore } from '@/store/useStore';

export default function Index() {
    const { user } = useStore();

    // Redirect based on auth state
    if (user) {
        return <Redirect href="/(tabs)/dashboard" />;
    }

    return <Redirect href="/(auth)/login" />;
}
