import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { saveLocationEnabled } from '../../lib/onboarding';

export default function LocationScreen() {
  const [loading, setLoading] = useState(false);

  async function enableLocation() {
    try {
      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';

      await saveLocationEnabled(granted);

      if (!granted) {
        Alert.alert(
          'Location not enabled',
          'You can still use the app, but local market insights can be added later if you enable location.'
        );
      }

      router.push('/onboarding/platforms');
    } catch (error) {
      console.log('Location permission failed:', error);
      await saveLocationEnabled(false);
      router.push('/onboarding/platforms');
    } finally {
      setLoading(false);
    }
  }

  async function skipLocation() {
    await saveLocationEnabled(false);
    router.push('/onboarding/platforms');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>LOCATION</Text>
        <Text style={styles.title}>See where you work best</Text>
        <Text style={styles.subtitle}>
          Enable location so Side Hustlers can personalize your market and local earnings insights.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Why location helps</Text>
          <Text style={styles.infoText}>• Better local market insights</Text>
          <Text style={styles.infoText}>• Future zone-based earnings tracking</Text>
          <Text style={styles.infoText}>• More personalized recommendations</Text>
        </View>

        <Pressable
          onPress={enableLocation}
          disabled={loading}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Enabling...' : 'Enable Location'}
          </Text>
        </Pressable>

        <Pressable onPress={skipLocation} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Not now</Text>
        </Pressable>
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
    padding: 24,
    justifyContent: 'center',
  },
  eyebrow: {
    color: '#facc15',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 10,
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#111111',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 18,
    marginBottom: 26,
  },
  infoTitle: {
    color: '#facc15',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
  },
  infoText: {
    color: '#e4e4e7',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6,
  },
  primaryButton: {
    backgroundColor: '#facc15',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButton: {
    backgroundColor: '#18181b',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});