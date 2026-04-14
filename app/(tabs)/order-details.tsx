import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CURRENT_ORDER_KEY = 'side_hustlers_current_order';
const ORDER_HISTORY_KEY = 'side_hustlers_order_history';

type RuleCheck = {
  key: 'minPayout' | 'minPerMile' | 'maxMiles' | 'minHourly';
  label: string;
  passed: boolean;
  actual: number;
  target: number;
};

type SavedOffer = {
  id: string;
  scannedAt: string;
  scanMs: number;
  scanSecondsLabel: string;
  verdict: 'TAKE' | 'SKIP' | 'MAYBE';
  imageUri?: string | null;
  platform?: string | null;
  payout?: number | null;
  distance?: number | null;
  items?: number | null;
  store?: string | null;
  minutes?: number | null;
  confidence?: string | null;
  reasoning?: string | null;
  rawText?: string | null;

  perMile?: number;
  passedRules?: number;
  failedRules?: number;
  recommendationSummary?: string;
  ruleChecks?: RuleCheck[];
  estimatedHourly?: number;
};

function formatMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `$${value.toFixed(2)}`;
}

function formatMiles(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(1)} mi`;
}

function formatItems(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value}`;
}

function formatMinutes(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Math.round(value)} min`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleString();
}

function getConfidenceLabel(confidence?: string | null) {
  if (!confidence) return 'Unknown';
  if (confidence === 'high') return 'High confidence';
  if (confidence === 'medium') return 'Medium confidence';
  return 'Low confidence';
}

function getConfidenceColor(confidence?: string | null) {
  if (confidence === 'high') return '#22c55e';
  if (confidence === 'medium') return '#facc15';
  return '#ef4444';
}

function getVerdictColor(verdict?: string | null) {
  if (verdict === 'TAKE') return '#22c55e';
  if (verdict === 'SKIP') return '#ef4444';
  return '#facc15';
}

function getFallbackHourly(order: SavedOffer | null) {
  if (!order?.payout || !order?.minutes || order.minutes <= 0) return null;
  return (order.payout / order.minutes) * 60;
}

function getFallbackPerMile(order: SavedOffer | null) {
  if (!order?.payout || !order?.distance || order.distance <= 0) return null;
  return order.payout / order.distance;
}

export default function OrderDetailsScreen() {
  const router = useRouter();
  const [order, setOrder] = useState<SavedOffer | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);

      const currentRaw = await AsyncStorage.getItem(CURRENT_ORDER_KEY);

      if (currentRaw) {
        setOrder(JSON.parse(currentRaw));
        return;
      }

      const historyRaw = await AsyncStorage.getItem(ORDER_HISTORY_KEY);
      const history: SavedOffer[] = historyRaw ? JSON.parse(historyRaw) : [];

      setOrder(history[0] ?? null);
    } catch (error) {
      console.log('Failed to load current order:', error);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrder();
    }, [loadOrder])
  );

  const hourly =
    order?.estimatedHourly && Number.isFinite(order.estimatedHourly)
      ? order.estimatedHourly
      : getFallbackHourly(order);

  const perMile =
    order?.perMile && Number.isFinite(order.perMile)
      ? order.perMile
      : getFallbackPerMile(order);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.page}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </Pressable>

            <Text style={styles.eyebrow}>ORDER DETAILS</Text>
            <Text style={styles.title}>Saved order breakdown</Text>
            <Text style={styles.subtitle}>Loaded from your latest scan</Text>
          </View>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#facc15" />
              <Text style={styles.loadingText}>Loading saved order...</Text>
            </View>
          ) : !order ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No saved order yet</Text>
              <Text style={styles.emptyText}>
                Scan a screenshot first and the latest order will show up here.
              </Text>

              <Pressable onPress={() => router.push('/')} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Go Scan One</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.verdictCard,
                  {
                    borderColor: getVerdictColor(order.verdict),
                  },
                ]}
              >
                <Text style={styles.verdictLabel}>Recommendation</Text>
                <Text
                  style={[
                    styles.verdictValue,
                    {
                      color: getVerdictColor(order.verdict),
                    },
                  ]}
                >
                  {order.verdict}
                </Text>
                <Text style={styles.verdictSubtext}>
                  {order.recommendationSummary || 'No recommendation summary available.'}
                </Text>
                <Text style={styles.verdictMeta}>
                  {order.passedRules ?? 0}/4 rules passed • {order.scanSecondsLabel || '—'}
                </Text>
              </View>

              <View style={styles.row}>
                <View style={styles.badgeCard}>
                  <Text style={styles.badgeTitle}>Confidence</Text>
                  <Text
                    style={[
                      styles.badgeValue,
                      { color: getConfidenceColor(order.confidence) },
                    ]}
                  >
                    {getConfidenceLabel(order.confidence)}
                  </Text>
                </View>

                <View style={styles.badgeCard}>
                  <Text style={styles.badgeTitle}>Platform</Text>
                  <Text style={styles.badgeValue}>{order.platform || 'Unknown'}</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Rule Checks</Text>

                {order.ruleChecks && order.ruleChecks.length > 0 ? (
                  order.ruleChecks.map((check) => (
                    <View key={check.key} style={styles.ruleRow}>
                      <View style={styles.ruleTopRow}>
                        <Text style={styles.ruleLabel}>{check.label}</Text>
                        <Text
                          style={[
                            styles.ruleStatus,
                            { color: check.passed ? '#22c55e' : '#f87171' },
                          ]}
                        >
                          {check.passed ? 'PASS' : 'FAIL'}
                        </Text>
                      </View>

                      <Text style={styles.ruleMeta}>
                        Actual: {check.actual} • Target: {check.target}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.reasoningText}>
                    No saved rule checks yet. Run a new scan to see a full rule breakdown.
                  </Text>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Why</Text>
                <Text style={styles.reasoningText}>
                  {order.recommendationSummary ||
                    order.reasoning ||
                    'No reasoning available.'}
                </Text>
              </View>

              {!!order.reasoning && order.reasoning !== order.recommendationSummary ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>AI Notes</Text>
                  <Text style={styles.reasoningText}>{order.reasoning}</Text>
                </View>
              ) : null}

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Order Breakdown</Text>

                <View style={styles.metricGrid}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Store</Text>
                    <Text style={styles.metricValue}>{order.store || '—'}</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Payout</Text>
                    <Text style={styles.metricValue}>{formatMoney(order.payout)}</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Miles</Text>
                    <Text style={styles.metricValue}>{formatMiles(order.distance)}</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Items</Text>
                    <Text style={styles.metricValue}>{formatItems(order.items)}</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Est. Time</Text>
                    <Text style={styles.metricValue}>{formatMinutes(order.minutes)}</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Est. $/Hour</Text>
                    <Text style={styles.metricValue}>
                      {hourly != null ? `$${hourly.toFixed(2)}` : '—'}
                    </Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>$/Mile</Text>
                    <Text style={styles.metricValue}>
                      {perMile != null ? `$${perMile.toFixed(2)}` : '—'}
                    </Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Scanned</Text>
                    <Text style={styles.metricValueSmall}>{formatDate(order.scannedAt)}</Text>
                  </View>
                </View>
              </View>

              {!!order.rawText ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Detected Text</Text>
                  <Text style={styles.rawText}>{order.rawText}</Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050505',
  },
  page: {
    flex: 1,
    backgroundColor: '#050505',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 18,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 9,
    paddingHorizontal: 13,
    backgroundColor: '#18181b',
    borderRadius: 999,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  backButtonText: {
    color: '#facc15',
    fontSize: 13,
    fontWeight: '800',
  },
  eyebrow: {
    color: '#facc15',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 14,
    lineHeight: 20,
  },
  loadingCard: {
    backgroundColor: '#111111',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyCard: {
    backgroundColor: '#111111',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptyText: {
    color: '#a1a1aa',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: '#facc15',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '900',
  },
  verdictCard: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  verdictLabel: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  verdictValue: {
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 6,
  },
  verdictSubtext: {
    color: '#d4d4d8',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 6,
  },
  verdictMeta: {
    color: '#a1a1aa',
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  badgeCard: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  badgeTitle: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  badgeValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#111111',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 14,
  },
  cardTitle: {
    color: '#facc15',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  reasoningText: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 22,
  },
  ruleRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  ruleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ruleLabel: {
    color: '#d4d4d8',
    fontSize: 14,
    flex: 1,
    paddingRight: 8,
  },
  ruleStatus: {
    fontSize: 14,
    fontWeight: '800',
  },
  ruleMeta: {
    color: '#71717a',
    fontSize: 12,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#0b0b0b',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#3f3f46',
    marginBottom: 10,
  },
  metricLabel: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 7,
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  metricValueSmall: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  rawText: {
    color: '#d4d4d8',
    fontSize: 12,
    lineHeight: 18,
  },
});