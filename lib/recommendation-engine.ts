export type DriverPreferences = {
  minPayout: number;
  minPerMile: number;
  maxMiles: number;
  minHourly: number;
};

export type OrderMetrics = {
  payout: number;
  miles: number;
  estimatedHourly: number;
};

export type RuleCheck = {
  key: 'minPayout' | 'minPerMile' | 'maxMiles' | 'minHourly';
  label: string;
  passed: boolean;
  actual: number;
  target: number;
};

export type RecommendationResult = {
  verdict: 'TAKE' | 'SKIP' | 'MAYBE';
  perMile: number;
  passedCount: number;
  failedCount: number;
  checks: RuleCheck[];
  summary: string;
};

function roundToTwo(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function evaluateOrder(
  metrics: OrderMetrics,
  preferences: DriverPreferences
): RecommendationResult {
  const payout = Number(metrics.payout) || 0;
  const miles = Number(metrics.miles) || 0;
  const estimatedHourly = Number(metrics.estimatedHourly) || 0;
  const perMile = miles > 0 ? payout / miles : 0;

  const checks: RuleCheck[] = [
    {
      key: 'minPayout',
      label: 'Minimum Payout',
      passed: payout >= preferences.minPayout,
      actual: roundToTwo(payout),
      target: preferences.minPayout,
    },
    {
      key: 'minPerMile',
      label: 'Minimum $ / Mile',
      passed: perMile >= preferences.minPerMile,
      actual: roundToTwo(perMile),
      target: preferences.minPerMile,
    },
    {
      key: 'maxMiles',
      label: 'Maximum Miles',
      passed: miles <= preferences.maxMiles,
      actual: roundToTwo(miles),
      target: preferences.maxMiles,
    },
    {
      key: 'minHourly',
      label: 'Minimum $ / Hour',
      passed: estimatedHourly >= preferences.minHourly,
      actual: roundToTwo(estimatedHourly),
      target: preferences.minHourly,
    },
  ];

  const passedCount = checks.filter((check) => check.passed).length;
  const failedCount = checks.length - passedCount;

  let verdict: 'TAKE' | 'SKIP' | 'MAYBE' = 'MAYBE';

  if (passedCount === 4) {
    verdict = 'TAKE';
  } else if (passedCount <= 1) {
    verdict = 'SKIP';
  }

  const failedLabels = checks
    .filter((check) => !check.passed)
    .map((check) => check.label);

  let summary = `Matched ${passedCount} of 4 rules.`;

  if (verdict === 'TAKE') {
    summary = 'This order matches all of your rules.';
  } else if (verdict === 'SKIP' && failedLabels.length > 0) {
    summary = `This order misses ${failedLabels.join(', ')}.`;
  } else if (verdict === 'MAYBE' && failedLabels.length > 0) {
    summary = `This order is borderline because it misses ${failedLabels.join(', ')}.`;
  }

  return {
    verdict,
    perMile: roundToTwo(perMile),
    passedCount,
    failedCount,
    checks,
    summary,
  };
}