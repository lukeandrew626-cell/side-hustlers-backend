import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RecommendationType = 'Accept' | 'Decline' | 'Maybe';
type PlatformType = 'DoorDash' | 'Uber Eats' | 'Instacart' | 'Unknown app';
type UserDecision = 'TAKE' | 'MAYBE' | 'SKIP' | '';

function toNumber(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const cleaned = String(raw).replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: string | string[] | undefined, fallback = '') {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? fallback;
}

function getVerdictText(recommendation: RecommendationType) {
  if (recommendation === 'Accept') return 'TAKE';
  if (recommendation === 'Decline') return 'SKIP';
  return 'MAYBE';
}

function getVerdictColors(recommendation: RecommendationType) {
  if (recommendation === 'Accept') {
    return {
      background: '#DCFCE7',
      text: '#166534',
      border: '#86EFAC',
    };
  }

  if (recommendation === 'Decline') {
    return {
      background: '#FEE2E2',
      text: '#991B1B',
      border: '#FCA5A5',
    };
  }

  return {
    background: '#FEF3C7',
    text: '#92400E',
    border: '#FCD34D',
  };
}

function getConfidenceLabel(confidence: number | null) {
  if (confidence == null) return '--';
  if (confidence >= 0.85) return 'High confidence';
  if (confidence >= 0.7) return 'Medium confidence';
  return 'Low confidence';
}

export default function OrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const id = toText(params.id, '');
  const platform = toText(params.platform, 'Unknown app') as PlatformType;
  const payout = toNumber(params.payout);
  const miles = toNumber(params.miles);
  const items = toNumber(params.items);
  const minutes = toNumber(params.minutes);
  const hourly = toNumber(params.hourly);
  const store = toText(params.store, 'Unknown store');
  const subtitle = toText(params.subtitle, 'based on payout, miles, and estimated time');
  const userDecision = toText(params.userDecision, '') as UserDecision;
  const confidence = toNumber(params.confidence);
  const recommendation = toText(params.recommendation, 'Maybe') as RecommendationType;

  const verdictText = useMemo(() => getVerdictText(recommendation), [recommendation]);
  const verdictColors = useMemo(() => getVerdictColors(recommendation), [recommendation]);

  const dollarsPerMile = useMemo(() => {
    if (payout == null || miles == null || miles <= 0) return null;
    return Number((payout / miles).toFixed(2));
  }, [payout, miles]);

  const reasonLines = useMemo(() => {
    const lines: string[] = [];

    if (hourly != null) {
      if (hourly >= 25) lines.push(`Projected hourly is strong at $${hourly.toFixed(0)}/hr`);
      else if (hourly >= 18) lines.push(`Projected hourly is decent at $${hourly.toFixed(0)}/hr`);
      else lines.push(`Projected hourly is weak at $${hourly.toFixed(0)}/hr`);
    }

    if (minutes != null) {
      if (minutes <= 20) lines.push(`Estimated time is short at ${minutes} minutes`);
      else if (minutes <= 35) lines.push(`Estimated time is manageable at ${minutes} minutes`);
      else lines.push(`Estimated time is long at ${minutes} minutes`);
    }

    if (dollarsPerMile != null) {
      if (dollarsPerMile >= 2) lines.push(`Value per mile is excellent at $${dollarsPerMile.toFixed(2)}`);
      else if (dollarsPerMile >= 1.25) lines.push(`Value per mile is decent at $${dollarsPerMile.toFixed(2)}`);
      else lines.push(`Value per mile is weak at $${dollarsPerMile.toFixed(2)}`);
    }

    if (items != null) {
      lines.push(`Item count detected: ${items}`);
    }

    lines.push(`${platform} was the detected platform`);

    return lines.slice(0, 4);
  }, [hourly, minutes, dollarsPerMile, items, platform]);

  return (
    <SafeAreaView style={styles.safeArea}>
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
            <Text style={styles.title}>Review the saved order</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View
            style={[
              styles.verdictCard,
              {
                backgroundColor: verdictColors.background,
                borderColor: verdictColors.border,
              },
            ]}
          >
            <Text style={[styles.verdictLabel, { color: verdictColors.text }]}>
              Recommendation
            </Text>
            <Text style={[styles.verdictValue, { color: verdictColors.text }]}>
              {verdictText}
            </Text>
            <Text style={[styles.verdictSubtext, { color: verdictColors.text }]}>
              saved from the scan result
            </Text>
          </View>

          <View style={styles.row}>
            <View style={styles.badgeCard}>
              <Text style={styles.badgeTitle}>Confidence</Text>
              <Text style={styles.badgeValue}>{getConfidenceLabel(confidence)}</Text>
            </View>

            <View style={styles.badgeCard}>
              <Text style={styles.badgeTitle}>Platform</Text>
              <Text style={styles.badgeValue}>{platform}</Text>
            </View>
          </View>

          {userDecision ? (
            <View style={styles.lastDecisionCard}>
              <Text style={styles.lastDecisionText}>Your saved choice: {userDecision}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Why this looked like that</Text>
            {reasonLines.map((reason, index) => (
              <View key={`${id || 'order'}-reason-${index}`} style={styles.reasonRow}>
                <View style={styles.reasonDot} />
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Order breakdown</Text>

            <View style={styles.metricGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Store</Text>
                <Text style={styles.metricValue}>{store || 'Unknown'}</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Payout</Text>
                <Text style={styles.metricValue}>
                  {payout != null ? `$${payout.toFixed(2)}` : '--'}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Miles</Text>
                <Text style={styles.metricValue}>
                  {miles != null ? miles.toFixed(1) : '--'}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Items</Text>
                <Text style={styles.metricValue}>
                  {items != null ? String(items) : '--'}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Est. $/hour</Text>
                <Text style={styles.metricValue}>
                  {hourly != null ? `$${hourly.toFixed(0)}` : '--'}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Est. time</Text>
                <Text style={styles.metricValue}>
                  {minutes != null ? `${Math.round(minutes)} min` : '--'}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>$/mile</Text>
                <Text style={styles.metricValue}>
                  {dollarsPerMile != null ? `$${dollarsPerMile.toFixed(2)}` : '--'}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Saved choice</Text>
                <Text style={styles.metricValue}>{userDecision || '--'}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  page: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 18,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#172554',
    borderRadius: 999,
    marginBottom: 14,
  },
  backButtonText: {
    color: '#DBEAFE',
    fontSize: 13,
    fontWeight: '700',
  },
  eyebrow: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  verdictCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  verdictLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  verdictValue: {
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 6,
  },
  verdictSubtext: {
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
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  badgeTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  badgeValue: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  reasonDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#3B82F6',
    marginTop: 6,
    marginRight: 10,
  },
  reasonText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 21,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 7,
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  lastDecisionCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#172554',
    borderWidth: 1,
    borderColor: '#2563EB',
    marginBottom: 14,
  },
  lastDecisionText: {
    color: '#DBEAFE',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
});