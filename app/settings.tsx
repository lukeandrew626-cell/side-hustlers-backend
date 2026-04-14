import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

function Row({
  label,
  subtitle,
  onPress,
}: {
  label: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: '#111111',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#27272a',
        marginBottom: 12,
      }}
    >
      <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800', marginBottom: 4 }}>
        {label}
      </Text>
      {!!subtitle && (
        <Text style={{ color: '#a1a1aa', fontSize: 13, lineHeight: 19 }}>
          {subtitle}
        </Text>
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  async function signOut() {
    await AsyncStorage.multiRemove([
      'side_hustlers_onboarding_complete',
      'side_hustlers_is_logged_in',
      'side_hustlers_profile',
      'side_hustlers_selected_platforms',
      'side_hustlers_vehicle',
      'side_hustlers_plus_prompt_seen',
      'side_hustlers_free_scan_count',
      'side_hustlers_current_order',
      'side_hustlers_order_history',
    ]);

    router.replace('/onboarding/welcome' as const);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <Text style={{ color: '#facc15', fontSize: 30, fontWeight: '900' }}>
            Settings
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={{
              backgroundColor: '#111111',
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: '#27272a',
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '800' }}>Back</Text>
          </Pressable>
        </View>

        <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 18, marginBottom: 10 }}>
          Membership
        </Text>
        <Row label="Side Hustlers Plus" subtitle="coming soon" />
        <Row label="Alerts" subtitle="coming soon" />

        <Text
          style={{
            color: '#ffffff',
            fontWeight: '900',
            fontSize: 18,
            marginTop: 8,
            marginBottom: 10,
          }}
        >
          Support
        </Text>
        <Row label="Help Center" subtitle="coming soon" />
        <Row label="Contact Support" subtitle="coming soon" />
        <Row label="About" subtitle="coming soon" />

        <Text
          style={{
            color: '#ffffff',
            fontWeight: '900',
            fontSize: 18,
            marginTop: 8,
            marginBottom: 10,
          }}
        >
          Account
        </Text>
        <Row
          label="Sign Out"
          subtitle="clear local app data and return to onboarding"
          onPress={() => {
            Alert.alert('Sign out', 'Are you sure you want to sign out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: signOut },
            ]);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}