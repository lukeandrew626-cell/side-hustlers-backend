import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import {
    DEFAULT_DRIVER_PREFERENCES,
    getDriverPreferences,
    resetDriverPreferences,
    saveDriverPreferences,
} from '../lib/app-storage';

function validatePositiveNumber(value: string) {
  const num = Number(value);
  return !Number.isNaN(num) && num > 0;
}

function getPreferenceErrors({
  minPayout,
  minPerMile,
  maxMiles,
  minHourly,
}: {
  minPayout: string;
  minPerMile: string;
  maxMiles: string;
  minHourly: string;
}) {
  const errors: {
    minPayout?: string;
    minPerMile?: string;
    maxMiles?: string;
    minHourly?: string;
  } = {};

  if (!validatePositiveNumber(minPayout)) {
    errors.minPayout = 'Enter a valid minimum payout greater than 0.';
  }

  if (!validatePositiveNumber(minPerMile)) {
    errors.minPerMile = 'Enter a valid dollars per mile value greater than 0.';
  }

  if (!validatePositiveNumber(maxMiles)) {
    errors.maxMiles = 'Enter a valid maximum miles value greater than 0.';
  }

  if (!validatePositiveNumber(minHourly)) {
    errors.minHourly = 'Enter a valid dollars per hour value greater than 0.';
  }

  return errors;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: '#111111',
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: '#27272a',
        marginBottom: 18,
      }}
    >
      {children}
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 6,
      }}
    >
      {children}
    </Text>
  );
}

function SectionSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: '#a1a1aa',
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 14,
      }}
    >
      {children}
    </Text>
  );
}

function PreferenceField({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  helper: string;
  error?: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          color: '#ffffff',
          fontSize: 13,
          fontWeight: '800',
          marginBottom: 8,
        }}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9.]/g, ''))}
        placeholder={placeholder}
        placeholderTextColor="#71717a"
        keyboardType="decimal-pad"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        blurOnSubmit
        style={{
          backgroundColor: '#0b0b0b',
          color: '#ffffff',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: error ? '#f87171' : '#3f3f46',
          paddingHorizontal: 14,
          paddingVertical: 14,
          fontSize: 15,
        }}
      />

      {error ? (
        <Text
          style={{
            color: '#f87171',
            fontSize: 12,
            marginTop: 8,
          }}
        >
          {error}
        </Text>
      ) : (
        <Text
          style={{
            color: '#71717a',
            fontSize: 12,
            marginTop: 8,
          }}
        >
          {helper}
        </Text>
      )}
    </View>
  );
}

export default function DriverPreferencesScreen() {
  const [minPayout, setMinPayout] = useState('');
  const [minPerMile, setMinPerMile] = useState('');
  const [maxMiles, setMaxMiles] = useState('');
  const [minHourly, setMinHourly] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      const prefs = await getDriverPreferences();
      setMinPayout(String(prefs.minPayout));
      setMinPerMile(String(prefs.minPerMile));
      setMaxMiles(String(prefs.maxMiles));
      setMinHourly(String(prefs.minHourly));
    } catch {
      Alert.alert('Error', 'Could not load your driver preferences.');
    }
  }

  const errors = useMemo(() => {
    return getPreferenceErrors({
      minPayout,
      minPerMile,
      maxMiles,
      minHourly,
    });
  }, [minPayout, minPerMile, maxMiles, minHourly]);

  const previewRules = useMemo(() => {
    return [
      {
        label: 'Minimum Payout',
        value: minPayout ? `$${minPayout}` : '—',
      },
      {
        label: 'Minimum $ / Mile',
        value: minPerMile ? `$${minPerMile}` : '—',
      },
      {
        label: 'Maximum Miles',
        value: maxMiles || '—',
      },
      {
        label: 'Minimum $ / Hour',
        value: minHourly ? `$${minHourly}` : '—',
      },
    ];
  }, [minPayout, minPerMile, maxMiles, minHourly]);

  async function handleSave() {
    Keyboard.dismiss();

    if (errors.minPayout) {
      Alert.alert('Invalid Minimum Payout', errors.minPayout);
      return;
    }

    if (errors.minPerMile) {
      Alert.alert('Invalid Dollars per Mile', errors.minPerMile);
      return;
    }

    if (errors.maxMiles) {
      Alert.alert('Invalid Maximum Miles', errors.maxMiles);
      return;
    }

    if (errors.minHourly) {
      Alert.alert('Invalid Dollars per Hour', errors.minHourly);
      return;
    }

    try {
      setSaving(true);

      await saveDriverPreferences({
        minPayout: Number(minPayout),
        minPerMile: Number(minPerMile),
        maxMiles: Number(maxMiles),
        minHourly: Number(minHourly),
      });

      Alert.alert('Saved', 'Your driver preferences have been updated.');
    } catch {
      Alert.alert('Error', 'Something went wrong while saving your preferences.');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    Keyboard.dismiss();

    try {
      setResetting(true);
      await resetDriverPreferences();

      setMinPayout(String(DEFAULT_DRIVER_PREFERENCES.minPayout));
      setMinPerMile(String(DEFAULT_DRIVER_PREFERENCES.minPerMile));
      setMaxMiles(String(DEFAULT_DRIVER_PREFERENCES.maxMiles));
      setMinHourly(String(DEFAULT_DRIVER_PREFERENCES.minHourly));

      Alert.alert('Reset Complete', 'Your driver preferences were reset to defaults.');
    } catch {
      Alert.alert('Error', 'Something went wrong while resetting your preferences.');
    } finally {
      setResetting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 22, paddingBottom: 40 }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 18,
            }}
          >
            <View>
              <Text style={{ color: '#facc15', fontSize: 30, fontWeight: '900' }}>
                Driver Preferences
              </Text>
              <Text style={{ color: '#a1a1aa', fontSize: 14, marginTop: 4 }}>
                Customize the rules used for TAKE, SKIP, and MAYBE
              </Text>
            </View>

            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                router.back();
              }}
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

          <Card>
            <SectionTitle>Order Rules</SectionTitle>
            <SectionSubtitle>
              These values help Side Hustlers decide whether an order should be
              TAKE, SKIP, or MAYBE.
            </SectionSubtitle>

            <PreferenceField
              label="Minimum Payout"
              value={minPayout}
              onChangeText={setMinPayout}
              placeholder="6"
              helper="Orders below this payout are less likely to be worth taking."
              error={errors.minPayout}
            />

            <PreferenceField
              label="Minimum $ / Mile"
              value={minPerMile}
              onChangeText={setMinPerMile}
              placeholder="1.75"
              helper="This helps filter out low-efficiency offers."
              error={errors.minPerMile}
            />

            <PreferenceField
              label="Maximum Miles"
              value={maxMiles}
              onChangeText={setMaxMiles}
              placeholder="12"
              helper="Orders above this distance are more likely to be skipped."
              error={errors.maxMiles}
            />

            <PreferenceField
              label="Minimum $ / Hour"
              value={minHourly}
              onChangeText={setMinHourly}
              placeholder="18"
              helper="Use your target hourly earnings for better recommendations."
              error={errors.minHourly}
            />
          </Card>

          <Card>
            <SectionTitle>Current Rule Preview</SectionTitle>
            <SectionSubtitle>
              This is how your recommendation engine will currently judge orders.
            </SectionSubtitle>

            {previewRules.map((rule) => (
              <View
                key={rule.label}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: '#27272a',
                }}
              >
                <Text style={{ color: '#d4d4d8', fontSize: 14 }}>{rule.label}</Text>
                <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '800' }}>
                  {rule.value}
                </Text>
              </View>
            ))}
          </Card>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: saving ? '#a16207' : '#facc15',
              paddingVertical: 16,
              borderRadius: 18,
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ color: '#111111', fontSize: 16, fontWeight: '900' }}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleReset}
            disabled={resetting}
            style={{
              backgroundColor: '#18181b',
              paddingVertical: 15,
              borderRadius: 18,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#3f3f46',
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '800' }}>
              {resetting ? 'Resetting...' : 'Reset to Defaults'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}