import { router } from 'expo-router';
import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { markOnboardingComplete } from '../../lib/onboarding';

const TOUR_ITEMS = [
  {
    title: 'Scan',
    text: 'Upload an order screenshot and get a fast TAKE, SKIP, or MAYBE recommendation.',
  },
  {
    title: 'History',
    text: 'See your past scans, review your best orders, and learn what was worth taking.',
  },
  {
    title: 'Upgrade',
    text: 'Start with 10 free scans, then unlock more with 250 scans or Unlimited.',
  },
  {
    title: 'Preferences',
    text: 'Later you can set your own minimum payout, $ per mile, and max distance.',
  },
];

export default function TourScreen() {
  async function finish() {
    await markOnboardingComplete();
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>QUICK TOUR</Text>
        <Text style={styles.title}>How Side Hustlers works</Text>
        <Text style={styles.subtitle}>
          Here is a quick introduction to the core pages and what they do.
        </Text>

        {TOUR_ITEMS.map((item) => (
          <View key={item.title} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardText}>{item.text}</Text>
          </View>
        ))}

        <Pressable onPress={finish} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Go to App</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050505',
  },
  container: {
    padding: 24,
    paddingBottom: 36,
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
  card: {
    backgroundColor: '#111111',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 18,
    marginBottom: 14,
  },
  cardTitle: {
    color: '#facc15',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  cardText: {
    color: '#e4e4e7',
    fontSize: 14,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#facc15',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '900',
  },
});