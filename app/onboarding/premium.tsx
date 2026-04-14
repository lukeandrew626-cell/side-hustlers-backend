import { router } from 'expo-router';
import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function PremiumIntroScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>SIDE HUSTLERS PLUS</Text>
        <Text style={styles.title}>Get more from every shift</Text>
        <Text style={styles.subtitle}>
          Try Side Hustlers free with 10 scans, then upgrade anytime for more.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Unlimited</Text>
          <Text style={styles.cardPrice}>$9.99/month</Text>
          <Text style={styles.cardText}>Best for active drivers</Text>
          <Text style={styles.cardText}>Cancel anytime</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>250 scans</Text>
          <Text style={styles.cardPrice}>$3.99</Text>
          <Text style={styles.cardText}>Great for part-time use</Text>
          <Text style={styles.cardText}>One-time purchase</Text>
        </View>

        <Pressable
          onPress={() => router.push('/onboarding/tour')}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Start Free Trial Flow</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/onboarding/tour')}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Continue with Free Plan</Text>
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
  card: {
    backgroundColor: '#111111',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 18,
    marginBottom: 14,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  cardPrice: {
    color: '#facc15',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 10,
  },
  cardText: {
    color: '#e4e4e7',
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    backgroundColor: '#facc15',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
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