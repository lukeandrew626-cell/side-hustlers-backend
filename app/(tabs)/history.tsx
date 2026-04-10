import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clearHistory, getHistory } from '../../lib/storage';
import type { ExtractionResult } from '../../lib/types';

type HistoryItem = ExtractionResult & {
  userDecision?: 'TAKE' | 'MAYBE' | 'SKIP' | null;
  subtitle?: string;
};

function buildStableHistoryKey(item: HistoryItem, index: number) {
  return [
    item.id || 'missing-id',
    item.createdAt || 'missing-date',
    item.app || 'missing-app',
    item.store || 'missing-store',
    String(index),
  ].join('__');
}

function getSubtitle(item: HistoryItem) {
  if (item.subtitle) return item.subtitle;

  if (item.confidence != null && item.confidence < 0.7) {
    return 'Low confidence, verify manually';
  }

  if (item.minutes != null && item.dollarsPerHour != null) {
    return 'based on payout, miles, and estimated time';
  }

  if (item.payout != null && item.miles != null) {
    return 'time estimate unclear, using payout and miles';
  }

  return 'limited data detected, verify manually';
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const items = await getHistory();

      const deduped = items.filter((item, index, arr) => {
        const firstIndex = arr.findIndex((candidate) => {
          return (
            candidate.id === item.id &&
            candidate.createdAt === item.createdAt &&
            candidate.store === item.store &&
            candidate.payout === item.payout &&
            candidate.miles === item.miles
          );
        });

        return firstIndex === index;
      });

      setHistory(deduped);
    } catch (error) {
      console.log('Failed to load history', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const handleClearHistory = () => {
    Alert.alert(
      'Clear history',
      'Are you sure you want to delete all scan history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearHistory();
              setHistory([]);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear history.');
            }
          },
        },
      ]
    );
  };

  const openHistoryOrder = (item: HistoryItem) => {
    router.push({
      pathname: '/order-details',
      params: {
        id: item.id || '',
        platform: item.app || 'Unknown app',
        payout: String(item.payout ?? ''),
        miles: String(item.miles ?? ''),
        items: String(item.items ?? ''),
        minutes: String(item.minutes ?? ''),
        hourly: String(item.dollarsPerHour ?? ''),
        recommendation: item.recommendation || 'Maybe',
        userDecision: item.userDecision || '',
        store: item.store || 'Unknown store',
        subtitle: getSubtitle(item),
        confidence: String(item.confidence ?? ''),
      },
    });
  };

  const renderItem = ({ item, index }: { item: HistoryItem; index: number }) => {
    const verdictColor =
      item.recommendation === 'Accept'
        ? '#58D68D'
        : item.recommendation === 'Decline'
          ? '#FF6B6B'
          : '#F6D84C';

    const verdictText =
      item.recommendation === 'Accept'
        ? 'TAKE'
        : item.recommendation === 'Decline'
          ? 'SKIP'
          : 'MAYBE';

    return (
      <Pressable
        style={styles.card}
        onPress={() => openHistoryOrder(item)}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardTopLeft}>
            <Text style={styles.appText}>{item.app || 'Unknown app'}</Text>
            <Text style={styles.storeText}>{item.store || 'Saved order result'}</Text>
          </View>

          <Text style={[styles.verdictText, { color: verdictColor }]}>
            {verdictText}
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <MetricPill
            label="Payout"
            value={item.payout != null ? `$${Number(item.payout).toFixed(2)}` : '--'}
          />
          <MetricPill
            label="$ / Hour"
            value={item.dollarsPerHour != null ? `$${Number(item.dollarsPerHour).toFixed(0)}` : '--'}
          />
          <MetricPill
            label="Miles"
            value={item.miles != null ? `${Number(item.miles).toFixed(1)}` : '--'}
          />
          <MetricPill
            label="Min"
            value={item.minutes != null ? `${Math.round(Number(item.minutes))}` : '--'}
          />
          <MetricPill
            label="Items"
            value={item.items ? `${item.items}` : '--'}
          />
        </View>

        {item.userDecision ? (
          <View style={styles.savedChoiceRow}>
            <Text style={styles.savedChoiceText}>Saved choice: {item.userDecision}</Text>
          </View>
        ) : null}

        <Text style={styles.dateText}>
          {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown date'}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <Pressable style={styles.iconButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#F4F7FB" />
            </Pressable>

            <View>
              <Text style={styles.title}>History</Text>
              <Text style={styles.subtitle}>Past screenshot scans</Text>
            </View>
          </View>

          {!!history.length && (
            <Pressable style={styles.clearButton} onPress={handleClearHistory}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
          )}
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={34} color="#7C8598" />
            <Text style={styles.emptyTitle}>No scans yet</Text>
            <Text style={styles.emptyText}>
              Upload a screenshot on the main screen and it will show up here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item, index) => buildStableHistoryKey(item, index)}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricPillLabel}>{label}</Text>
      <Text style={styles.metricPillValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#070B14',
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#111723',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#F4F7FB',
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: '#7C8598',
    fontSize: 13,
    marginTop: 2,
  },
  clearButton: {
    backgroundColor: '#1A2231',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  clearButtonText: {
    color: '#F4F7FB',
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#111723',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1A2231',
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  cardTopLeft: {
    flex: 1,
    paddingRight: 8,
  },
  appText: {
    color: '#F4F7FB',
    fontSize: 18,
    fontWeight: '800',
  },
  storeText: {
    color: '#AAB2C2',
    fontSize: 13,
    marginTop: 4,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricPill: {
    backgroundColor: '#0B101A',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 72,
  },
  metricPillLabel: {
    color: '#7C8598',
    fontSize: 11,
    fontWeight: '700',
  },
  metricPillValue: {
    color: '#F4F7FB',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 5,
  },
  savedChoiceRow: {
    marginTop: 12,
    backgroundColor: '#0B101A',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  savedChoiceText: {
    color: '#F4F7FB',
    fontSize: 12,
    fontWeight: '800',
  },
  dateText: {
    color: '#7C8598',
    fontSize: 12,
    marginTop: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#F4F7FB',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyText: {
    color: '#7C8598',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});