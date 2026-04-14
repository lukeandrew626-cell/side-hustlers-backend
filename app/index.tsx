import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { getIsLoggedIn, getOnboardingComplete } from '../lib/app-storage';

export default function AppEntry() {
  useEffect(() => {
    let isMounted = true;

    async function bootApp() {
      try {
        const onboardingComplete = await getOnboardingComplete();
        const isLoggedIn = await getIsLoggedIn();

        if (!isMounted) return;

        if (onboardingComplete && isLoggedIn) {
          router.replace('/(tabs)' as const);
          return;
        }

        router.replace('/onboarding/welcome' as const);
      } catch {
        if (isMounted) {
          router.replace('/onboarding/welcome' as const);
        }
      }
    }

    bootApp();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.logo}>Side Hustlers</Text>
        <Text style={styles.subtitle}>Loading your driver workspace</Text>
        <ActivityIndicator size="small" color="#facc15" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050505',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    color: '#facc15',
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 14,
    marginBottom: 22,
    textTransform: 'none',
  },
});