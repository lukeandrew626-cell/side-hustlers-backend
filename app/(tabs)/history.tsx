import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CURRENT_ORDER_KEY = 'side_hustlers_current_order';
const ORDER_HISTORY_KEY = 'side_hustlers_order_history';

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
};

function formatMoney(value: number | null | undefined) {
  if (value == null) return '—';
  return `$${value.toFixed(2)}`;
}

function formatMiles(value: number | null | undefined) {
  if (value == null) return '—';
  return `${value.toFixed(1)} mi`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleString();
}

function getVerdictColor(verdict?: string | null) {
  if (verdict === 'TAKE') return '#22c55e';
  if (verdict === 'SKIP') return '#ef4444';
  return '#facc15';
}

function getConfidenceColor(confidence?: string | null) {
  if (confidence === 'high') return '#22c55e';
  if (confidence === 'medium') return '#facc15';
  return '#ef4444';
}

export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<SavedOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem(ORDER_HISTORY_KEY);
      const parsed: SavedOffer[] = raw ? JSON.parse(raw) : [];
      setHistory(parsed);
    } catch (error) {
      console.log('Failed to load history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const stats = useMemo(() => {
    if (!history.length) {
      return {
        total: 0,
        takeCount: 0,
        skipCount: 0,
        maybeCount: 0,
      };
    }

    return {
      total: history.length,
      takeCount: history.filter((item) => item.verdict === 'TAKE').length,
      skipCount: history.filter((item) => item.verdict === 'SKIP').length,
      maybeCount: history.filter((item) => item.verdict === 'MAYBE').length,
    };
  }, [history]);

  async function openItem(item: SavedOffer) {
    try {
      await AsyncStorage.setItem(CURRENT_ORDER_KEY, JSON.stringify(item));
      router.push('/order-details');
    } catch (error) {
      console.log('Failed to open history item:', error);
    }
  }

  async function clearHistory() {
    try {
      await AsyncStorage.removeItem(ORDER_HISTORY_KEY);
      setHistory([]);
    } catch (error) {
      console.log('Failed to clear history:', error);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <View style={styles.headerWrap}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>

          <Text style={styles.eyebrow}>HISTORY</Text>
          <Text style={styles.title}>Previous scans</Text>
          <Text style={styles.subtitle}>every saved order from your latest app scans</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Take</Text>
            <Text style={[styles.statValue, { color: '#22c55e' }]}>{stats.takeCount}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Skip</Text>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.skipCount}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Maybe</Text>
            <Text style={[styles.statValue, { color: '#facc15' }]}>{stats.maybeCount}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable onPress={() => router.push('/')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>New Scan</Text>
          </Pressable>

          <Pressable onPress={clearHistory} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Clear History</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#facc15" />
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptyText}>
              Once you scan screenshots they will show up here automatically.
            </Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable onPress={() => openItem(item)} style={styles.historyCard}>
                <View style={styles.historyTopRow}>
                  <Text
                    style={[
                      styles.verdictText,
                      { color: getVerdictColor(item.verdict) },
                    ]}
                  >
                    {item.verdict}
                  </Text>

                  <Text style={styles.scanTimeText}>
                    {item.scanSecondsLabel || '—'}
                  </Text>
                </View>

                <Text style={styles.platformText}>
                  {item.platform || 'Unknown'} • {item.store || 'Unknown store'}
                </Text>

                <View style={styles.metricsRow}>
                  <Text style={styles.metricText}>Payout {formatMoney(item.payout)}</Text>
                  <Text style={styles.metricText}>Miles {formatMiles(item.distance)}</Text>
                </View>

                <View style={styles.metricsRow}>
                  <Text style={styles.metricText}>
                    Time {item.minutes != null ? `${Math.round(item.minutes)} min` : '—'}
                  </Text>
                  <Text
                    style={[
                      styles.metricText,
                      { color: getConfidenceColor(item.confidence) },
                    ]}
                  >
                    {item.confidence || 'unknown'}
                  </Text>
                </View>

                <Text numberOfLines={2} style={styles.reasoningPreview}>
                  {item.reasoning || 'No reasoning available.'}
                </Text>

                <Text style={styles.dateText}>{formatDate(item.scannedAt)}</Text>
              </Pressable>
            )}
          />
        )}
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
    padding: 18,
  },
  headerWrap: {
    marginBottom: 16,
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
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
  },
  statLabel: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#facc15',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#111111',
    fontWeight: '900',
    fontSize: 15,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#18181b',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  loadingWrap: {
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
  },
  listContent: {
    paddingBottom: 24,
  },
  historyCard: {
    backgroundColor: '#111111',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 12,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  verdictText: {
    fontSize: 24,
    fontWeight: '900',
  },
  scanTimeText: {
    color: '#facc15',
    fontSize: 12,
    fontWeight: '800',
  },
  platformText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metricText: {
    color: '#d4d4d8',
    fontSize: 13,
    fontWeight: '700',
  },
  reasoningPreview: {
    color: '#a1a1aa',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 10,
  },
  dateText: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '700',
  },
});