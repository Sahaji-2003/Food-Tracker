import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useThemeStore } from '@/store/useThemeStore';

export default function LoginScreen() {
  const { colors } = useThemeStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Inline error states
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    general: '',
  });

  // Clear errors when switching modes
  useEffect(() => {
    setErrors({ email: '', password: '', confirmPassword: '', general: '' });
  }, [isSignUp]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors = { email: '', password: '', confirmPassword: '', general: '' };
    let isValid = true;

    // Email validation
    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    // Confirm password (sign up only)
    if (isSignUp) {
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
        isValid = false;
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({ ...errors, general: '' });

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        if (data.user && data.session) {
          // Check if profile exists, if not go to onboarding
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (!profile || !profile.weight) {
            router.replace('/(auth)/onboarding');
          } else {
            router.replace('/(tabs)/dashboard');
          }
        } else if (data.user && !data.session) {
          setErrors({ ...errors, general: 'Please check your email to confirm your account' });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Check if profile is complete
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (!profile || !profile.weight) {
            router.replace('/(auth)/onboarding');
          } else {
            router.replace('/(tabs)/dashboard');
          }
        }
      }
    } catch (error: any) {
      setErrors({ ...errors, general: error.message || 'Authentication failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48 }}>
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 48 }}>
            <Text style={{ fontSize: 48, fontWeight: 'bold', color: colors.primary, marginBottom: 8 }}>
              FitFlow
            </Text>
            <Text style={{ fontSize: 16, color: colors.mutedForeground }}>
              Your AI-Powered Health Partner
            </Text>
          </View>

          {/* General Error */}
          {errors.general ? (
            <View style={{
              backgroundColor: colors.destructive + '20',
              padding: 12,
              borderRadius: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: colors.destructive,
            }}>
              <Text style={{ color: colors.destructive, textAlign: 'center' }}>
                {errors.general}
              </Text>
            </View>
          ) : null}

          {/* Form */}
          <View>
            {/* Email */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.foreground, marginBottom: 8, fontWeight: '500' }}>
                Email
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.secondary,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  color: colors.foreground,
                  fontSize: 16,
                  borderWidth: errors.email ? 2 : 0,
                  borderColor: errors.email ? colors.destructive : 'transparent',
                }}
                placeholder="Enter your email"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              {errors.email ? (
                <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 4 }}>
                  {errors.email}
                </Text>
              ) : null}
            </View>

            {/* Password */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.foreground, marginBottom: 8, fontWeight: '500' }}>
                Password
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.secondary,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  color: colors.foreground,
                  fontSize: 16,
                  borderWidth: errors.password ? 2 : 0,
                  borderColor: errors.password ? colors.destructive : 'transparent',
                }}
                placeholder="Enter your password"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
                secureTextEntry
                autoComplete={isSignUp ? "new-password" : "password"}
              />
              {errors.password ? (
                <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 4 }}>
                  {errors.password}
                </Text>
              ) : null}
            </View>

            {/* Confirm Password (Sign Up only) */}
            {isSignUp && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.foreground, marginBottom: 8, fontWeight: '500' }}>
                  Confirm Password
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.secondary,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                    color: colors.foreground,
                    fontSize: 16,
                    borderWidth: errors.confirmPassword ? 2 : 0,
                    borderColor: errors.confirmPassword ? colors.destructive : 'transparent',
                  }}
                  placeholder="Confirm your password"
                  placeholderTextColor={colors.mutedForeground}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                  }}
                  secureTextEntry
                  autoComplete="new-password"
                />
                {errors.confirmPassword ? (
                  <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 4 }}>
                    {errors.confirmPassword}
                  </Text>
                ) : null}
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleAuth}
              disabled={isLoading}
              style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden' }}
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
                  <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 18 }}>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Toggle Sign Up / Sign In */}
            <TouchableOpacity
              onPress={() => {
                setIsSignUp(!isSignUp);
                setConfirmPassword('');
              }}
              style={{ marginTop: 20, alignItems: 'center' }}
            >
              <Text style={{ color: colors.mutedForeground }}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
