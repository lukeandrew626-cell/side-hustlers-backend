import { recognizeText } from '@infinitered/react-native-mlkit-text-recognition';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { parseOfferFromText, type ParsedOffer } from '../../utils/offerParser';

const API_BASE_URL = 'http://172.20.10.8:3000';

async function compressImageForFastScan(uri: string) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 900 } }],
    {
      compress: 0.5,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  return result;
}

async function runLocalFastScan(uri: string): Promise<ParsedOffer> {
  const compressed = await compressImageForFastScan(uri);
  const ocr = await recognizeText(compressed.uri);
  return parseOfferFromText(ocr.text || '');
}

async function runAiFallback(uri: string): Promise<ParsedOffer> {
  const compressed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 900 } }],
    {
      compress: 0.45,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  if (!compressed.base64) {
    throw new Error('Failed to create base64 image');
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

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.error || 'AI fallback failed');
  }

  return {
    platform: json?.result?.platform ?? 'Unknown',
    payout: json?.result?.payout ?? null,
    distance: json?.result?.distance ?? null,
    items: json?.result?.items ?? null,
    store: json?.result?.store ?? null,
    minutes: json?.result?.minutes ?? null,
    confidence: json?.result?.confidence ?? 'medium',
    reasoning: json?.result?.reasoning ?? '',
    source: 'ai',
    rawText: '',
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

function getVerdict(result: ParsedOffer | null) {
  if (!result) return null;

  const payout = result.payout ?? 0;
  const distance = result.distance ?? 0;
  const minutes = result.minutes ?? 0;

  const dollarsPerMile = distance > 0 ? payout / distance : 0;
  const dollarsPerHour = minutes > 0 ? (payout / minutes) * 60 : 0;

  if (
    result.confidence === 'high' &&
    payout >= 7 &&
    dollarsPerMile >= 1.5 &&
    (minutes === 0 || dollarsPerHour >= 18)
  ) {
    return 'TAKE';
  }

  if (payout > 0 && (dollarsPerMile < 1 || (minutes > 0 && dollarsPerHour < 14))) {
    return 'SKIP';
  }

  return 'MAYBE';
}

function getVerdictColor(verdict: string | null) {
  if (verdict === 'TAKE') return '#22c55e';
  if (verdict === 'SKIP') return '#ef4444';
  return '#f59e0b';
}

function getConfidenceColor(confidence: string) {
  if (confidence === 'high') return '#22c55e';
  if (confidence === 'medium') return '#f59e0b';
  return '#ef4444';
}

export default function Index() {
  const [result, setResult] = useState<ParsedOffer | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'local' | 'fallback'>('idle');
  const [scanMs, setScanMs] = useState<number | null>(null);
  const [lastImageUri, setLastImageUri] = useState<string | null>(null);

  const verdict = useMemo(() => getVerdict(result), [result]);
  const verdictColor = useMemo(() => getVerdictColor(verdict), [verdict]);

  async function scanImage(imageUri: string) {
    const startedAt = Date.now();

    setIsScanning(true);
    setPhase('local');
    setResult(null);
    setScanMs(null);

    try {
      const localResult = await runLocalFastScan(imageUri);
      const localMs = Date.now() - startedAt;

      setResult(localResult);
      setScanMs(localMs);

      const needsFallback =
        localResult.confidence === 'low' ||
        localResult.platform === 'Unknown' ||
        localResult.payout == null ||
        localResult.distance == null;

      if (needsFallback) {
        setPhase('fallback');

        try {
          const aiResult = await runAiFallback(imageUri);
          const totalMs = Date.now() - startedAt;
          setResult(aiResult);
          setScanMs(totalMs);
        } catch (fallbackError) {
          console.log('AI fallback failed:', fallbackError);
        }
      }

      setPhase('idle');
    } catch (error: any) {
      console.log('Scan error:', error);
      Alert.alert('Scan failed', error?.message || 'Could not scan this screenshot.');
      setPhase('idle');
    } finally {
      setIsScanning(false);
    }
  }

  async function pickScreenshot() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo access so the app can scan screenshots.');
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#09090b' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              color: '#ffffff',
              fontSize: 30,
              fontWeight: '900',
              marginBottom: 6,
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
            fast screenshot scan for delivery offers
          </Text>
        </View>

        <View
          style={{
            backgroundColor: '#111827',
            borderRadius: 24,
            padding: 18,
            borderWidth: 1,
            borderColor: '#1f2937',
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
            Instant scan
          </Text>

          <Text
            style={{
              color: '#94a3b8',
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 16,
            }}
          >
            scans locally first for speed then only uses AI fallback when needed
          </Text>

          <Pressable
            onPress={pickScreenshot}
            style={{
              backgroundColor: '#2563eb',
              paddingVertical: 16,
              borderRadius: 18,
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                color: '#ffffff',
                fontWeight: '800',
                fontSize: 16,
              }}
            >
              Scan Screenshot
            </Text>
          </Pressable>

          {!!lastImageUri && (
            <Pressable
              onPress={rescanLast}
              style={{
                backgroundColor: '#18181b',
                paddingVertical: 14,
                borderRadius: 18,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#27272a',
              }}
            >
              <Text
                style={{
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: 15,
                }}
              >
                Rescan Last Screenshot
              </Text>
            </Pressable>
          )}
        </View>

        {isScanning && (
          <View
            style={{
              backgroundColor: '#111827',
              borderRadius: 24,
              padding: 18,
              borderWidth: 1,
              borderColor: '#1f2937',
              marginBottom: 18,
              alignItems: 'center',
            }}
          >
            <ActivityIndicator size="small" color="#60a5fa" />

            <Text
              style={{
                color: '#ffffff',
                marginTop: 12,
                fontWeight: '800',
                fontSize: 16,
              }}
            >
              {phase === 'local'
                ? 'Running local OCR...'
                : phase === 'fallback'
                ? 'Refining with AI fallback...'
                : 'Scanning...'}
            </Text>

            <Text
              style={{
                color: '#94a3b8',
                marginTop: 6,
                fontSize: 13,
              }}
            >
              {phase === 'local'
                ? 'trying to return a result as fast as possible'
                : 'local scan was weak so checking the backend'}
            </Text>
          </View>
        )}

        {result && (
          <View
            style={{
              backgroundColor: '#111827',
              borderRadius: 24,
              padding: 20,
              borderWidth: 1,
              borderColor: '#1f2937',
            }}
          >
            <Text
              style={{
                color: '#94a3b8',
                fontSize: 12,
                fontWeight: '700',
                marginBottom: 10,
              }}
            >
              {result.source === 'local' ? 'LOCAL FAST SCAN' : 'AI FALLBACK RESULT'}
              {scanMs != null ? ` • ${scanMs} ms` : ''}
            </Text>

            <Text
              style={{
                color: verdictColor,
                fontSize: 46,
                fontWeight: '900',
                marginBottom: 4,
              }}
            >
              {verdict ?? 'MAYBE'}
            </Text>

            <Text
              style={{
                color: '#94a3b8',
                fontSize: 14,
                marginBottom: 20,
              }}
            >
              based on payout, miles, and time
            </Text>

            <View
              style={{
                backgroundColor: '#0f172a',
                borderRadius: 18,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#1e293b',
              }}
            >
              <Text style={{ color: '#ffffff', marginBottom: 8, fontSize: 15 }}>
                Platform: <Text style={{ fontWeight: '800' }}>{result.platform}</Text>
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
                backgroundColor: '#0b1220',
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: '#1e293b',
              }}
            >
              <Text
                style={{
                  color: '#93c5fd',
                  fontSize: 13,
                  fontWeight: '800',
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

            {result.rawText ? (
              <View
                style={{
                  marginTop: 16,
                  backgroundColor: '#09090b',
                  borderRadius: 18,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#27272a',
                }}
              >
                <Text
                  style={{
                    color: '#a1a1aa',
                    fontSize: 12,
                    fontWeight: '800',
                    marginBottom: 8,
                  }}
                >
                  OCR TEXT
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
      </ScrollView>
    </SafeAreaView>
  );
}