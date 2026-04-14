import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getDriverPreferences,
  getFreeScanCount,
  getPlatforms,
  getProfile,
  getVehicle,
  hasSeenPlusPrompt,
  incrementFreeScanCount,
  setSeenPlusPrompt,
} from '../../lib/app-storage';
import { evaluateOrder } from '../../lib/recommendation-engine';
import type { ParsedOffer } from '../../utils/offerParser';

const API_BASE_URL = 'https://side-hustlers-backend.onrender.com';

const CURRENT_ORDER_KEY = 'side_hustlers_current_order';
const ORDER_HISTORY_KEY = 'side_hustlers_order_history';

type ScanPhase = 'idle' | 'preparing' | 'analyzing';

type SavedOffer = ParsedOffer & {
  id: string;
  scannedAt: string;
  scanMs: number;
  scanSecondsLabel: string;
  verdict: 'TAKE' | 'SKIP' | 'MAYBE';
  imageUri?: string | null;
  perMile: number;
  passedRules: number;
  failedRules: number;
  recommendationSummary: string;
  ruleChecks: Array<{
    key: 'minPayout' | 'minPerMile' | 'maxMiles' | 'minHourly';
    label: string;
    passed: boolean;
    actual: number;
    target: number;
  }>;
  estimatedHourly: number;
};

async function compressImageForUpload(uri: string) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1080 } }],
    {
      compress: 0.55,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  return result;
}

async function analyzeScreenshot(uri: string): Promise<ParsedOffer> {
  const compressed = await compressImageForUpload(uri);

  if (!compressed.base64) {
    throw new Error('Failed to prepare screenshot for upload.');
  }

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64: compressed.base64,
    }),
  });

  let json: any = null;

  try {
    json = await response.json();
  } catch {
    throw new Error('Server returned an unreadable response.');
  }

  if (!response.ok) {
    throw new Error(json?.error || 'Analysis failed.');
  }

  const result = json?.result ?? {};

  return {
    platform: result.platform ?? 'Unknown',
    payout: result.payout ?? null,
    distance: result.distance ?? null,
    items: result.items ?? null,
    store: result.store ?? null,
    minutes: result.minutes ?? null,
    confidence: result.confidence ?? 'medium',
    reasoning: result.reasoning ?? '',
    source: 'ai',
    rawText: result.rawText ?? '',
  };
}

function formatMoney(value: number | null) {
  if (value == null) return '—';
  return `$${value.toFixed(2)}`;
}

function formatMiles(value: number | null) {
  if (value == null) return '—';
  return `${value} mi`;
}

function formatItems(value: number | null) {
  if (value == null) return '—';
  return `${value}`;
}

function formatSeconds(ms: number | null) {
  if (ms == null) return '—';
  const seconds = ms / 1000;
  return `${seconds < 10 ? seconds.toFixed(2) : seconds.toFixed(1)}s`;
}

function getVerdictColor(verdict: string | null) {
  if (verdict === 'TAKE') return '#22c55e';
  if (verdict === 'SKIP') return '#ef4444';
  return '#facc15';
}

function getConfidenceColor(confidence: string) {
  if (confidence === 'high') return '#22c55e';
  if (confidence === 'medium') return '#facc15';
  return '#ef4444';
}

async function saveScanToStorage(saved: SavedOffer) {
  await AsyncStorage.setItem(CURRENT_ORDER_KEY, JSON.stringify(saved));

  const existingRaw = await AsyncStorage.getItem(ORDER_HISTORY_KEY);
  const existing: SavedOffer[] = existingRaw ? JSON.parse(existingRaw) : [];
  const updated = [saved, ...existing].slice(0, 100);

  await AsyncStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(updated));
}

export default function Index() {
  const [result, setResult] = useState<SavedOffer | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [scanMs, setScanMs] = useState<number | null>(null);
  const [lastImageUri, setLastImageUri] = useState<string | null>(null);

  const [showPlusModal, setShowPlusModal] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [profileBannerText, setProfileBannerText] = useState('Complete your profile');

  const verdict = result?.verdict ?? null;
  const verdictColor = useMemo(() => getVerdictColor(verdict), [verdict]);

  useEffect(() => {
    async function loadProfileState() {
      try {
        const profile = await getProfile();
        const platforms = await getPlatforms();
        const vehicle = await getVehicle();

        const hasProfile = !!profile?.name && !!profile?.email;
        const hasPlatforms = platforms.length > 0;
        const hasVehicle =
          !!vehicle?.year && !!vehicle?.make && !!vehicle?.model && !!vehicle?.mpg;

        const complete = hasProfile && hasPlatforms && hasVehicle;
        setProfileComplete(complete);

        if (!complete) {
          if (!hasProfile) {
            setProfileBannerText('Complete your profile');
          } else if (!hasPlatforms) {
            setProfileBannerText('Add your work apps');
          } else if (!hasVehicle) {
            setProfileBannerText('Add your vehicle for mileage tracking');
          }
        }
      } catch (error) {
        console.log('Profile state load error:', error);
      }
    }

    loadProfileState();
  }, []);

  async function scanImage(imageUri: string) {
    const startedAt = Date.now();

    setIsScanning(true);
    setPhase('preparing');
    setResult(null);
    setScanMs(null);

    try {
      setPhase('analyzing');

      const analyzed = await analyzeScreenshot(imageUri);
      const totalMs = Date.now() - startedAt;

      const preferences = await getDriverPreferences();

      const estimatedHourly =
        analyzed.minutes && analyzed.minutes > 0
          ? (Number(analyzed.payout || 0) / analyzed.minutes) * 60
          : 0;

      const recommendation = evaluateOrder(
        {
          payout: Number(analyzed.payout) || 0,
          miles: Number(analyzed.distance) || 0,
          estimatedHourly,
        },
        preferences
      );

      const saved: SavedOffer = {
        ...analyzed,
        id: `${Date.now()}`,
        scannedAt: new Date().toISOString(),
        scanMs: totalMs,
        scanSecondsLabel: formatSeconds(totalMs),
        verdict: recommendation.verdict,
        imageUri,
        perMile: recommendation.perMile,
        passedRules: recommendation.passedCount,
        failedRules: recommendation.failedCount,
        recommendationSummary: recommendation.summary,
        ruleChecks: recommendation.checks,
        estimatedHourly,
      };

      await saveScanToStorage(saved);

      const newScanCount = await incrementFreeScanCount();
      const seenPlus = await hasSeenPlusPrompt();

      if (profileComplete && newScanCount >= 10 && !seenPlus) {
        setTimeout(() => {
          setShowPlusModal(true);
        }, 350);
      }

      setResult(saved);
      setScanMs(totalMs);
    } catch (error: any) {
      console.log('Scan error:', error);
      Alert.alert('Scan failed', error?.message || 'Could not scan this screenshot.');
    } finally {
      setIsScanning(false);
      setPhase('idle');
    }
  }

  async function pickScreenshot() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          'Allow photo access so the app can scan screenshots.'
        );
        return;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsMultipleSelection: false,
      });

      if (picked.canceled || !picked.assets?.[0]?.uri) return;

      const imageUri = picked.assets[0].uri;
      setLastImageUri(imageUri);

      await scanImage(imageUri);
    } catch (error: any) {
      console.log('Pick screenshot error:', error);
      Alert.alert('Error', error?.message || 'Could not open image picker.');
    }
  }

  async function rescanLast() {
    if (!lastImageUri) {
      Alert.alert('No screenshot', 'There is no previous screenshot to rescan yet.');
      return;
    }

    await scanImage(lastImageUri);
  }

  async function closePlusModal() {
    setShowPlusModal(false);
    await setSeenPlusPrompt(true);
  }

  async function openPlusFromSettingsStyle() {
    const count = await getFreeScanCount();
    Alert.alert('Free scans used', `${count} of 10 free scans used.`);
  }

  function openOrderDetails() {
    router.push('/order-details' as const);
  }

  function openHistory() {
    router.push('/history' as const);
  }

  function openSettings() {
    router.push('/settings' as const);
  }

  function openProfile() {
    router.push('/profile' as const);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <Modal
        visible={showPlusModal}
        transparent
        animationType="fade"
        onRequestClose={closePlusModal}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.72)',
            justifyContent: 'center',
            padding: 22,
          }}
        >
          <View
            style={{
              backgroundColor: '#111111',
              borderRadius: 28,
              padding: 22,
              borderWidth: 1,
              borderColor: '#27272a',
            }}
          >
            <Text
              style={{
                color: '#facc15',
                fontSize: 13,
                fontWeight: '900',
                marginBottom: 10,
              }}
            >
              SIDE HUSTLERS PLUS
            </Text>

            <Text
              style={{
                color: '#ffffff',
                fontSize: 28,
                fontWeight: '900',
                lineHeight: 33,
                marginBottom: 12,
              }}
            >
              Unlock more from every shift
            </Text>

            <Text
              style={{
                color: '#d4d4d8',
                fontSize: 15,
                lineHeight: 22,
                marginBottom: 18,
              }}
            >
              You used your free scans. Upgrade to unlock more tools, deeper insights, and premium
              features built for drivers who want to maximize every hour.
            </Text>

            <View
              style={{
                backgroundColor: '#0b0b0b',
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: '#27272a',
                marginBottom: 18,
              }}
            >
              <Text style={{ color: '#ffffff', marginBottom: 8 }}>• more scan access</Text>
              <Text style={{ color: '#ffffff', marginBottom: 8 }}>• better profit tracking tools</Text>
              <Text style={{ color: '#ffffff' }}>• premium features as Side Hustlers grows</Text>
            </View>

            <Pressable
              onPress={closePlusModal}
              style={{
                backgroundColor: '#facc15',
                paddingVertical: 16,
                borderRadius: 18,
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: '#111111',
                  fontWeight: '900',
                  fontSize: 16,
                }}
              >
                Start Free Trial
              </Text>
            </Pressable>

            <Pressable
              onPress={closePlusModal}
              style={{
                backgroundColor: '#18181b',
                paddingVertical: 15,
                borderRadius: 18,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#3f3f46',
              }}
            >
              <Text
                style={{
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: 15,
                }}
              >
                Not now
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View
          style={{
            marginBottom: 18,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <View>
            <Text
              style={{
                color: '#facc15',
                fontSize: 31,
                fontWeight: '900',
                marginBottom: 6,
                letterSpacing: 0.3,
              }}
            >
              Side Hustlers
            </Text>

            <Text
              style={{
                color: '#a1a1aa',
                fontSize: 14,
              }}
            >
              fast screenshot scans for gig orders
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={openProfile}
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: '#111111',
                borderWidth: 1,
                borderColor: '#27272a',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '900' }}>👤</Text>
            </Pressable>

            <Pressable
              onPress={openSettings}
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: '#111111',
                borderWidth: 1,
                borderColor: '#27272a',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '900' }}>⚙</Text>
            </Pressable>
          </View>
        </View>

        {!profileComplete && (
          <Pressable
            onPress={openProfile}
            style={{
              backgroundColor: '#111111',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: '#facc15',
              marginBottom: 18,
            }}
          >
            <Text
              style={{
                color: '#facc15',
                fontWeight: '900',
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              PROFILE SETUP
            </Text>

            <Text
              style={{
                color: '#ffffff',
                fontWeight: '800',
                fontSize: 16,
                marginBottom: 4,
              }}
            >
              {profileBannerText}
            </Text>

            <Text
              style={{
                color: '#a1a1aa',
                fontSize: 13,
              }}
            >
              finish your setup for better app tracking and mileage estimates
            </Text>
          </Pressable>
        )}

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
          <Text
            style={{
              color: '#ffffff',
              fontSize: 18,
              fontWeight: '800',
              marginBottom: 8,
            }}
          >
            Instant Scan
          </Text>

          <Text
            style={{
              color: '#a1a1aa',
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 16,
            }}
          >
            Snap a screenshot and get a fast take or skip recommendation.
          </Text>

          <Pressable
            onPress={pickScreenshot}
            disabled={isScanning}
            style={{
              backgroundColor: '#facc15',
              opacity: isScanning ? 0.75 : 1,
              paddingVertical: 16,
              borderRadius: 18,
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                color: '#111111',
                fontWeight: '900',
                fontSize: 16,
              }}
            >
              {isScanning ? 'Scanning...' : 'Scan Screenshot'}
            </Text>
          </Pressable>

          {!!lastImageUri && (
            <Pressable
              onPress={rescanLast}
              disabled={isScanning}
              style={{
                backgroundColor: '#18181b',
                opacity: isScanning ? 0.75 : 1,
                paddingVertical: 14,
                borderRadius: 18,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#3f3f46',
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: '#facc15',
                  fontWeight: '800',
                  fontSize: 15,
                }}
              >
                Rescan Last Screenshot
              </Text>
            </Pressable>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={openOrderDetails}
              style={{
                flex: 1,
                backgroundColor: '#18181b',
                paddingVertical: 13,
                borderRadius: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#3f3f46',
              }}
            >
              <Text
                style={{
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: 14,
                }}
              >
                Order Details
              </Text>
            </Pressable>

            <Pressable
              onPress={openHistory}
              style={{
                flex: 1,
                backgroundColor: '#18181b',
                paddingVertical: 13,
                borderRadius: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#3f3f46',
              }}
            >
              <Text
                style={{
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: 14,
                }}
              >
                History
              </Text>
            </Pressable>
          </View>
        </View>

        {isScanning && (
          <View
            style={{
              backgroundColor: '#111111',
              borderRadius: 24,
              padding: 18,
              borderWidth: 1,
              borderColor: '#27272a',
              marginBottom: 18,
              alignItems: 'center',
            }}
          >
            <ActivityIndicator size="small" color="#facc15" />

            <Text
              style={{
                color: '#ffffff',
                marginTop: 12,
                fontWeight: '800',
                fontSize: 16,
              }}
            >
              {phase === 'preparing'
                ? 'Preparing screenshot...'
                : phase === 'analyzing'
                ? 'Analyzing offer...'
                : 'Scanning...'}
            </Text>

            <Text
              style={{
                color: '#a1a1aa',
                marginTop: 6,
                fontSize: 13,
              }}
            >
              checking payout, miles, store, and platform
            </Text>
          </View>
        )}

        {result && (
          <View
            style={{
              backgroundColor: '#111111',
              borderRadius: 24,
              padding: 20,
              borderWidth: 1,
              borderColor: '#27272a',
            }}
          >
            <Text
              style={{
                color: '#facc15',
                fontSize: 12,
                fontWeight: '800',
                marginBottom: 10,
                letterSpacing: 0.5,
              }}
            >
              LAST SCAN • {formatSeconds(scanMs)}
            </Text>

            <Text
              style={{
                color: verdictColor,
                fontSize: 48,
                fontWeight: '900',
                marginBottom: 4,
              }}
            >
              {verdict ?? 'MAYBE'}
            </Text>

            <Text
              style={{
                color: '#a1a1aa',
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              {result.recommendationSummary}
            </Text>

            <Text
              style={{
                color: '#d4d4d8',
                fontSize: 14,
                marginBottom: 20,
              }}
            >
              ${result.perMile.toFixed(2)} / mile • {result.passedRules}/4 rules passed
            </Text>

            <View
              style={{
                backgroundColor: '#0b0b0b',
                borderRadius: 18,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#3f3f46',
              }}
            >
              <Text style={{ color: '#ffffff', marginBottom: 8, fontSize: 15 }}>
                Platform:{' '}
                <Text style={{ fontWeight: '800', color: '#facc15' }}>{result.platform}</Text>
              </Text>

              <Text style={{ color: '#ffffff', marginBottom: 8, fontSize: 15 }}>
                Payout: <Text style={{ fontWeight: '800' }}>{formatMoney(result.payout)}</Text>
              </Text>

              <Text style={{ color: '#ffffff', marginBottom: 8, fontSize: 15 }}>
                Distance: <Text style={{ fontWeight: '800' }}>{formatMiles(result.distance)}</Text>
              </Text>

              <Text style={{ color: '#ffffff', marginBottom: 8, fontSize: 15 }}>
                Items: <Text style={{ fontWeight: '800' }}>{formatItems(result.items)}</Text>
              </Text>

              <Text style={{ color: '#ffffff', marginBottom: 8, fontSize: 15 }}>
                Store: <Text style={{ fontWeight: '800' }}>{result.store || '—'}</Text>
              </Text>

              <Text style={{ color: '#ffffff', marginBottom: 8, fontSize: 15 }}>
                Minutes: <Text style={{ fontWeight: '800' }}>{result.minutes ?? '—'}</Text>
              </Text>

              <Text style={{ color: '#ffffff', marginBottom: 8, fontSize: 15 }}>
                Est. Hourly:{' '}
                <Text style={{ fontWeight: '800' }}>
                  {result.estimatedHourly > 0 ? `$${result.estimatedHourly.toFixed(2)}` : '—'}
                </Text>
              </Text>

              <Text style={{ color: '#ffffff', marginBottom: 8, fontSize: 15 }}>
                Scan Time: <Text style={{ fontWeight: '800' }}>{formatSeconds(scanMs)}</Text>
              </Text>

              <Text style={{ color: '#ffffff', fontSize: 15 }}>
                Confidence:{' '}
                <Text
                  style={{
                    fontWeight: '800',
                    color: getConfidenceColor(result.confidence),
                  }}
                >
                  {result.confidence}
                </Text>
              </Text>
            </View>

            <View
              style={{
                backgroundColor: '#0b0b0b',
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: '#3f3f46',
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: '#facc15',
                  fontSize: 13,
                  fontWeight: '900',
                  marginBottom: 8,
                }}
              >
                RULE CHECKS
              </Text>

              {result.ruleChecks.map((check) => (
                <View
                  key={check.key}
                  style={{
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: '#27272a',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ color: '#d4d4d8', fontSize: 14 }}>
                      {check.label}
                    </Text>

                    <Text
                      style={{
                        color: check.passed ? '#22c55e' : '#f87171',
                        fontSize: 14,
                        fontWeight: '800',
                      }}
                    >
                      {check.passed ? 'PASS' : 'FAIL'}
                    </Text>
                  </View>

                  <Text style={{ color: '#71717a', fontSize: 12 }}>
                    Actual: {check.actual} • Target: {check.target}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={{
                backgroundColor: '#0b0b0b',
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: '#3f3f46',
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: '#facc15',
                  fontSize: 13,
                  fontWeight: '900',
                  marginBottom: 8,
                }}
              >
                WHY
              </Text>

              <Text
                style={{
                  color: '#e5e7eb',
                  fontSize: 14,
                  lineHeight: 21,
                }}
              >
                {result.reasoning || 'No reasoning available.'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={openOrderDetails}
                style={{
                  flex: 1,
                  backgroundColor: '#facc15',
                  paddingVertical: 14,
                  borderRadius: 16,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: '#111111',
                    fontWeight: '900',
                    fontSize: 15,
                  }}
                >
                  View Order Details
                </Text>
              </Pressable>

              <Pressable
                onPress={openHistory}
                style={{
                  flex: 1,
                  backgroundColor: '#18181b',
                  paddingVertical: 14,
                  borderRadius: 16,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#3f3f46',
                }}
              >
                <Text
                  style={{
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: 15,
                  }}
                >
                  View History
                </Text>
              </Pressable>
            </View>

            {result.rawText ? (
              <View
                style={{
                  marginTop: 16,
                  backgroundColor: '#050505',
                  borderRadius: 18,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#27272a',
                }}
              >
                <Text
                  style={{
                    color: '#facc15',
                    fontSize: 12,
                    fontWeight: '800',
                    marginBottom: 8,
                  }}
                >
                  DETECTED TEXT
                </Text>

                <Text
                  style={{
                    color: '#d4d4d8',
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  {result.rawText}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        <Pressable
          onPress={openPlusFromSettingsStyle}
          style={{
            marginTop: 16,
            backgroundColor: '#111111',
            borderRadius: 18,
            paddingVertical: 14,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#27272a',
          }}
        >
          <Text style={{ color: '#facc15', fontWeight: '800', fontSize: 14 }}>
            Check Free Scan Status
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}