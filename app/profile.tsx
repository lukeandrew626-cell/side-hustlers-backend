import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    getPlatforms,
    getProfile,
    getVehicle,
    saveProfile,
    saveVehicle,
    setIsLoggedIn,
} from '../lib/app-storage';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function normalizeVehicleText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function isValidVehicleText(value: string) {
  const clean = normalizeVehicleText(value);
  return /^[A-Za-z0-9][A-Za-z0-9 .\-/#&()]*$/.test(clean);
}

function formatPlatformName(platform: string) {
  const value = platform.trim().toLowerCase();

  if (value === 'doordash') return 'DoorDash';
  if (value === 'uber eats') return 'Uber Eats';
  if (value === 'ubereats') return 'Uber Eats';
  if (value === 'instacart') return 'Instacart';
  if (value === 'grubhub') return 'Grubhub';
  if (value === 'lyft') return 'Lyft';
  if (value === 'uber') return 'Uber';
  if (value === 'amazon flex') return 'Amazon Flex';
  if (value === 'amazonflex') return 'Amazon Flex';

  return platform
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function validateYear(value: string) {
  if (!value.trim()) return true;
  const num = Number(value);
  const currentYear = new Date().getFullYear() + 1;
  return Number.isInteger(num) && num >= 1985 && num <= currentYear;
}

function validateMpg(value: string) {
  if (!value.trim()) return true;
  const num = Number(value);
  return !Number.isNaN(num) && num >= 5 && num <= 150;
}

function getVehicleErrors({
  year,
  make,
  model,
  mpg,
}: {
  year: string;
  make: string;
  model: string;
  mpg: string;
}) {
  const errors: {
    year?: string;
    make?: string;
    model?: string;
    mpg?: string;
  } = {};

  const cleanMake = normalizeVehicleText(make);
  const cleanModel = normalizeVehicleText(model);

  if (year.trim() && !validateYear(year)) {
    errors.year = 'Enter a valid vehicle year.';
  }

  if (cleanMake && (cleanMake.length < 2 || !isValidVehicleText(cleanMake))) {
    errors.make = 'Enter a real vehicle make.';
  }

  if (cleanModel && (cleanModel.length < 1 || !isValidVehicleText(cleanModel))) {
    errors.model = 'Enter a real vehicle model.';
  }

  if (mpg.trim() && !validateMpg(mpg)) {
    errors.mpg = 'Enter a valid MPG between 5 and 150.';
  }

  return errors;
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: '#111111',
          borderRadius: 24,
          padding: 18,
          borderWidth: 1,
          borderColor: '#27272a',
          marginBottom: 18,
        },
        style,
      ]}
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

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'sentences',
  autoComplete,
  textContentType,
  error,
  helper,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?:
    | 'default'
    | 'email-address'
    | 'numbers-and-punctuation'
    | 'numeric'
    | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?:
    | 'name'
    | 'email'
    | 'password'
    | 'username'
    | 'off'
    | 'street-address'
    | 'postal-code'
    | 'tel';
  textContentType?:
    | 'none'
    | 'name'
    | 'emailAddress'
    | 'password'
    | 'username'
    | 'telephoneNumber';
  error?: string;
  helper?: string;
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
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#71717a"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        autoComplete={autoComplete}
        textContentType={textContentType}
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
      ) : helper ? (
        <Text
          style={{
            color: '#71717a',
            fontSize: 12,
            marginTop: 8,
          }}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

function ActionRow({
  title,
  subtitle,
  onPress,
  danger,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: '#18181b',
        borderRadius: 18,
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: danger ? '#7f1d1d' : '#3f3f46',
        marginBottom: 10,
      }}
    >
      <Text
        style={{
          color: danger ? '#f87171' : '#ffffff',
          fontSize: 15,
          fontWeight: '900',
          marginBottom: 4,
        }}
      >
        {title}
      </Text>
      <Text style={{ color: '#a1a1aa', fontSize: 13 }}>{subtitle}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [mpg, setMpg] = useState('');

  const [platforms, setPlatforms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function loadData() {
      const savedProfile = await getProfile();
      const savedVehicle = await getVehicle();
      const savedPlatforms = await getPlatforms();

      setName(savedProfile?.name ?? '');
      setEmail(savedProfile?.email ?? '');
      setPassword(savedProfile?.password ?? '');

      setYear(savedVehicle?.year ?? '');
      setMake(savedVehicle?.make ?? '');
      setModel(savedVehicle?.model ?? '');
      setMpg(savedVehicle?.mpg ?? '');

      setPlatforms(savedPlatforms);
    }

    loadData();
  }, []);

  const formattedPlatforms = useMemo(() => {
    return platforms.map(formatPlatformName);
  }, [platforms]);

  const vehicleErrors = useMemo(() => {
    return getVehicleErrors({
      year,
      make,
      model,
      mpg,
    });
  }, [year, make, model, mpg]);

  const vehicleSummary = useMemo(() => {
    const cleanYear = year.trim();
    const cleanMake = normalizeVehicleText(make);
    const cleanModel = normalizeVehicleText(model);
    const cleanMpg = mpg.trim();

    if (!cleanYear && !cleanMake && !cleanModel && !cleanMpg) {
      return null;
    }

    return {
      title: [cleanYear, cleanMake, cleanModel].filter(Boolean).join(' '),
      subtitle: cleanMpg ? `${cleanMpg} MPG` : '',
    };
  }, [year, make, model, mpg]);

  async function saveChanges() {
    Keyboard.dismiss();

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanYear = year.trim();
    const cleanMake = normalizeVehicleText(make);
    const cleanModel = normalizeVehicleText(model);
    const cleanMpg = mpg.trim();

    if (!cleanName) {
      Alert.alert('Missing Name', 'Enter your name.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert('Invalid Email', 'Enter a valid email address.');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters.');
      return;
    }

    if (vehicleErrors.year) {
      Alert.alert('Invalid Vehicle Year', vehicleErrors.year);
      return;
    }

    if (vehicleErrors.make) {
      Alert.alert('Invalid Vehicle Make', vehicleErrors.make);
      return;
    }

    if (vehicleErrors.model) {
      Alert.alert('Invalid Vehicle Model', vehicleErrors.model);
      return;
    }

    if (vehicleErrors.mpg) {
      Alert.alert('Invalid MPG', vehicleErrors.mpg);
      return;
    }

    try {
      setSaving(true);

      await saveProfile({
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
      });

      await saveVehicle({
        year: cleanYear,
        make: cleanMake,
        model: cleanModel,
        mpg: cleanMpg,
      });

      Alert.alert('Saved', 'Your profile has been updated.');
    } catch {
      Alert.alert('Error', 'Something went wrong while saving your profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            setSigningOut(true);
            await setIsLoggedIn(false);
            router.replace('/onboarding/welcome');
          } catch {
            Alert.alert('Error', 'Could not sign you out right now.');
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#050505' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 18,
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: '#facc15', fontSize: 30, fontWeight: '900' }}>
                Profile
              </Text>
              <Text style={{ color: '#a1a1aa', fontSize: 14, marginTop: 4, lineHeight: 20 }}>
                Manage your account, vehicle, preferences, membership, and app settings
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
                marginTop: 2,
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800' }}>Back</Text>
            </Pressable>
          </View>

          <Card>
            <SectionTitle>Account</SectionTitle>
            <SectionSubtitle>
              Keep your account details up to date.
            </SectionSubtitle>

            <Field
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
            />

            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />

            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              helper="Use at least 6 characters."
            />
          </Card>

          <Card>
            <SectionTitle>Vehicle</SectionTitle>
            <SectionSubtitle>
              Enter your vehicle details for better fuel-based recommendations.
            </SectionSubtitle>

            <Field
              label="Year"
              value={year}
              onChangeText={(text) => setYear(text.replace(/[^0-9]/g, ''))}
              placeholder="2011"
              keyboardType={
                Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'
              }
              autoCapitalize="none"
              error={vehicleErrors.year}
              helper="Enter your vehicle year."
            />

            <Field
              label="Make"
              value={make}
              onChangeText={setMake}
              placeholder="Toyota"
              autoCapitalize="words"
              error={vehicleErrors.make}
              helper="Enter your car's real make."
            />

            <Field
              label="Model"
              value={model}
              onChangeText={setModel}
              placeholder="4Runner"
              autoCapitalize="words"
              error={vehicleErrors.model}
              helper="Enter your exact model."
            />

            <Field
              label="MPG"
              value={mpg}
              onChangeText={(text) => setMpg(text.replace(/[^0-9.]/g, ''))}
              placeholder="18"
              keyboardType="decimal-pad"
              autoCapitalize="none"
              error={vehicleErrors.mpg}
              helper="Use your combined MPG if you know it."
            />

            {vehicleSummary ? (
              <View
                style={{
                  backgroundColor: '#0b0b0b',
                  borderRadius: 18,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#27272a',
                }}
              >
                <Text
                  style={{
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: '900',
                    marginBottom: 4,
                  }}
                >
                  Vehicle Summary
                </Text>
                <Text style={{ color: '#d4d4d8', fontSize: 14 }}>
                  {vehicleSummary.title || 'Vehicle information'}
                </Text>
                {!!vehicleSummary.subtitle && (
                  <Text style={{ color: '#a1a1aa', fontSize: 13, marginTop: 2 }}>
                    {vehicleSummary.subtitle}
                  </Text>
                )}
              </View>
            ) : null}
          </Card>

          <Card>
            <SectionTitle>Work Apps</SectionTitle>
            <SectionSubtitle>
              Platforms currently connected to your profile.
            </SectionSubtitle>

            {formattedPlatforms.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {formattedPlatforms.map((platform) => (
                  <View
                    key={platform}
                    style={{
                      backgroundColor: '#18181b',
                      borderRadius: 999,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: '#3f3f46',
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '800' }}>
                      {platform}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ color: '#d4d4d8', fontSize: 15, lineHeight: 22 }}>
                No work apps selected yet.
              </Text>
            )}
          </Card>

          <Card>
            <SectionTitle>Driver Preferences</SectionTitle>
            <SectionSubtitle>
              Set the order rules used for TAKE, SKIP, and MAYBE recommendations.
            </SectionSubtitle>

            <ActionRow
              title="Open Driver Preferences"
              subtitle="Minimum payout, dollars per mile, max miles, dollars per hour, and future grocery rules"
              onPress={() => router.push('/driver-preferences')}
            />
          </Card>

          <Card>
            <SectionTitle>App & Membership</SectionTitle>
            <SectionSubtitle>
              Manage premium access, app settings, and your account status.
            </SectionSubtitle>

            <ActionRow
              title="Side Hustlers Plus"
              subtitle="Manage membership and premium features"
              onPress={() => router.push('/settings')}
            />

            <ActionRow
              title="Settings"
              subtitle="Alerts, support, about, and app options"
              onPress={() => router.push('/settings')}
            />

            <ActionRow
              title={signingOut ? 'Signing Out...' : 'Sign Out'}
              subtitle="Sign out of your account"
              onPress={handleSignOut}
              danger
            />
          </Card>

          <Pressable
            onPress={saveChanges}
            disabled={saving}
            style={{
              backgroundColor: saving ? '#a16207' : '#facc15',
              paddingVertical: 16,
              borderRadius: 18,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#111111', fontSize: 16, fontWeight: '900' }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}