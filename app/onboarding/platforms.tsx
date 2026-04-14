import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    savePlatforms,
    setIsLoggedIn,
    setOnboardingComplete,
} from '../../lib/app-storage';

const MOST_COMMON = [
  { id: 'doordash', name: 'DoorDash', badge: 'DD', color: '#ef4444' },
  { id: 'uber-eats', name: 'Uber Eats', badge: 'UE', color: '#22c55e' },
  { id: 'instacart', name: 'Instacart', badge: 'IC', color: '#22c55e' },
  { id: 'grubhub', name: 'Grubhub', badge: 'GH', color: '#f97316' },
  { id: 'uber', name: 'Uber', badge: 'U', color: '#ffffff' },
  { id: 'lyft', name: 'Lyft', badge: 'L', color: '#ec4899' },
  { id: 'amazon-flex', name: 'Amazon Flex', badge: 'AF', color: '#60a5fa' },
  { id: 'spark', name: 'Spark', badge: 'SP', color: '#38bdf8' },
];

export default function PlatformsScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function togglePlatform(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function finishOnboarding(platformsToSave: string[]) {
    try {
      setSubmitting(true);
      await savePlatforms(platformsToSave);
      await setOnboardingComplete(true);
      await setIsLoggedIn(true);
      router.replace('/(tabs)' as const);
    } catch {
      Alert.alert('Error', 'Something went wrong while saving your work apps.');
    } finally {
      setSubmitting(false);
    }
  }

  async function continueNext() {
    if (selected.length === 0) {
      Alert.alert('Select an app', 'Choose at least one platform or tap Skip for now.');
      return;
    }

    await finishOnboarding(selected);
  }

  async function skipForNow() {
    await finishOnboarding([]);
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#050505' }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ color: '#facc15', fontSize: 30, fontWeight: '900', marginBottom: 8 }}>
          Who Do You Work For
        </Text>

        <Text style={{ color: '#a1a1aa', fontSize: 14, lineHeight: 21, marginBottom: 22 }}>
          Choose your most common gig apps first. You can always update these later in your profile.
        </Text>

        <View style={{ gap: 12, marginBottom: 22 }}>
          {MOST_COMMON.map((platform) => {
            const active = selected.includes(platform.id);

            return (
              <Pressable
                key={platform.id}
                onPress={() => togglePlatform(platform.id)}
                style={{
                  backgroundColor: active ? '#171717' : '#111111',
                  borderRadius: 22,
                  borderWidth: 1.5,
                  borderColor: active ? '#facc15' : '#27272a',
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#0b0b0b',
                      borderWidth: 1,
                      borderColor: '#3f3f46',
                    }}
                  >
                    <Text style={{ color: platform.color, fontWeight: '900', fontSize: 16 }}>
                      {platform.badge}
                    </Text>
                  </View>

                  <View>
                    <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 16 }}>
                      {platform.name}
                    </Text>
                    <Text style={{ color: '#a1a1aa', fontSize: 13, marginTop: 3 }}>
                      Active order scanning
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    backgroundColor: active ? '#facc15' : '#18181b',
                    borderWidth: 1,
                    borderColor: active ? '#facc15' : '#3f3f46',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {active ? (
                    <Text style={{ color: '#111111', fontWeight: '900', fontSize: 12 }}>✓</Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={continueNext}
          disabled={submitting}
          style={{
            backgroundColor: submitting ? '#a16207' : '#facc15',
            paddingVertical: 16,
            borderRadius: 18,
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ color: '#111111', fontWeight: '900', fontSize: 16 }}>
            {submitting ? 'Saving...' : 'Continue'}
          </Text>
        </Pressable>

        <Pressable
          onPress={skipForNow}
          disabled={submitting}
          style={{
            backgroundColor: '#18181b',
            paddingVertical: 15,
            borderRadius: 18,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#3f3f46',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }}>
            Skip for Now
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}