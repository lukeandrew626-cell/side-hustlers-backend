import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfile, saveProfile, setIsLoggedIn } from '../../lib/app-storage';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

export default function AuthScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();

  const initialMode = useMemo<'signup' | 'signin'>(() => {
    return params.mode === 'signin' ? 'signin' : 'signup';
  }, [params.mode]);

  const [mode, setMode] = useState<'signup' | 'signin'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function continueNext() {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanConfirmPassword = confirmPassword.trim();

    if (!cleanEmail || !cleanPassword) {
      Alert.alert('Missing Info', 'Enter your email and password.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert('Invalid Email', 'Enter a valid email address.');
      return;
    }

    try {
      setSubmitting(true);

      const existing = await getProfile();

      if (mode === 'signup') {
        if (existing?.email?.toLowerCase() === cleanEmail) {
          Alert.alert('Account Already Exists', 'Use Sign In instead.');
          return;
        }

        if (!isStrongPassword(cleanPassword)) {
          Alert.alert(
            'Weak Password',
            'Use at least 8 characters, 1 capital letter, and 1 number.'
          );
          return;
        }

        if (cleanPassword !== cleanConfirmPassword) {
          Alert.alert('Passwords Do Not Match', 'Make sure both password fields match.');
          return;
        }

        await saveProfile({
          name: '',
          email: cleanEmail,
          password: cleanPassword,
        });

        await setIsLoggedIn(true);
        router.push('/onboarding/platforms' as const);
        return;
      }

      if (!existing) {
        Alert.alert('No Account Found', 'Create an account first.');
        return;
      }

      if (
        existing.email.toLowerCase() !== cleanEmail ||
        existing.password !== cleanPassword
      ) {
        Alert.alert('Sign In Failed', 'Your email or password is incorrect.');
        return;
      }

      await setIsLoggedIn(true);
      router.replace('/(tabs)' as const);
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#050505' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ color: '#facc15', fontSize: 30, fontWeight: '900', marginBottom: 8 }}>
            {mode === 'signup' ? 'Create Your Account' : 'Sign In'}
          </Text>

          <Text style={{ color: '#a1a1aa', fontSize: 14, lineHeight: 21, marginBottom: 24 }}>
            {mode === 'signup'
              ? 'Create an account to save your work apps and start using Side Hustlers.'
              : 'Sign in to continue to your driver workspace.'}
          </Text>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
            <Pressable
              onPress={() => setMode('signup')}
              style={{
                flex: 1,
                backgroundColor: mode === 'signup' ? '#facc15' : '#111111',
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: mode === 'signup' ? '#facc15' : '#27272a',
              }}
            >
              <Text
                style={{
                  color: mode === 'signup' ? '#111111' : '#ffffff',
                  fontWeight: '900',
                }}
              >
                Create Account
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMode('signin')}
              style={{
                flex: 1,
                backgroundColor: mode === 'signin' ? '#facc15' : '#111111',
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: mode === 'signin' ? '#facc15' : '#27272a',
              }}
            >
              <Text
                style={{
                  color: mode === 'signin' ? '#111111' : '#ffffff',
                  fontWeight: '900',
                }}
              >
                Sign In
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              backgroundColor: '#111111',
              borderRadius: 24,
              padding: 18,
              borderWidth: 1,
              borderColor: '#27272a',
            }}
          >
            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '800', marginBottom: 8 }}>
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#71717a"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                style={{
                  backgroundColor: '#0b0b0b',
                  color: '#ffffff',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#3f3f46',
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  fontSize: 15,
                }}
              />
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '800', marginBottom: 8 }}>
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#71717a"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                style={{
                  backgroundColor: '#0b0b0b',
                  color: '#ffffff',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#3f3f46',
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  fontSize: 15,
                }}
              />
            </View>

            {mode === 'signup' && (
              <>
                <Text
                  style={{
                    color: '#71717a',
                    fontSize: 12,
                    lineHeight: 18,
                    marginTop: -2,
                    marginBottom: 14,
                  }}
                >
                  Use at least 8 characters, 1 capital letter, and 1 number.
                </Text>

                <View style={{ marginBottom: 14 }}>
                  <Text
                    style={{
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: '800',
                      marginBottom: 8,
                    }}
                  >
                    Confirm Password
                  </Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm Password"
                    placeholderTextColor="#71717a"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      backgroundColor: '#0b0b0b',
                      color: '#ffffff',
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#3f3f46',
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      fontSize: 15,
                    }}
                  />
                </View>
              </>
            )}

            <Pressable
              onPress={continueNext}
              disabled={submitting}
              style={{
                backgroundColor: submitting ? '#a16207' : '#facc15',
                paddingVertical: 16,
                borderRadius: 18,
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <Text style={{ color: '#111111', fontSize: 16, fontWeight: '900' }}>
                {submitting
                  ? 'Please wait...'
                  : mode === 'signup'
                  ? 'Continue'
                  : 'Sign In'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}