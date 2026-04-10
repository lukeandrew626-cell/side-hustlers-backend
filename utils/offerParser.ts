export type GigPlatform = 'DoorDash' | 'Uber Eats' | 'Instacart' | 'Unknown';

export type ParsedOffer = {
  platform: GigPlatform;
  payout: number | null;
  distance: number | null;
  items: number | null;
  store: string | null;
  minutes: number | null;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  source: 'local' | 'ai';
  rawText: string;
};

function cleanText(input: string) {
  return input
    .replace(/[|]/g, 'I')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMoney(text: string): number | null {
  const matches = [...text.matchAll(/\$ ?(\d+(?:\.\d{1,2})?)/g)];
  if (!matches.length) return null;

  const values = matches
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!values.length) return null;

  return values[0] ?? null;
}

function parseDistance(text: string): number | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s?(?:mi|miles)\b/i);
  if (!match) return null;

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function parseItems(text: string): number | null {
  const itemPatterns = [
    /(\d+)\s?(?:items|item)\b/i,
    /(\d+)\s?(?:units|unit)\b/i,
    /shop for\s+(\d+)\s+items?/i,
  ];

  for (const pattern of itemPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) return value;
    }
  }

  return null;
}

function parseStore(text: string, platform: GigPlatform): string | null {
  const patterns = [
    /(?:from|at|shop at)\s+([A-Z][A-Za-z0-9&'’.\- ]{2,40})/,
    /pickup from\s+([A-Z][A-Za-z0-9&'’.\- ]{2,40})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  const knownStores = [
    'Meijer',
    'Target',
    'Kroger',
    'Walmart',
    'ALDI',
    'Walgreens',
    'CVS',
    'Costco',
    'Sam’s Club',
    'Sams Club',
    'Dollar General',
    '7-Eleven',
    'McDonald’s',
    'McDonalds',
    'Taco Bell',
    'Chipotle',
    'Panera',
    'Subway',
    'Starbucks',
    'Burger King',
    'Popeyes',
    'Wingstop',
    'Little Caesars',
  ];

  const lower = text.toLowerCase();
  const found = knownStores.find((store) =>
    lower.includes(store.toLowerCase().replace('’', "'"))
  );

  if (found) return found;

  if (platform === 'Instacart') {
    const lineMatch = text.match(
      /\b(Meijer|Target|Kroger|Walmart|ALDI|Walgreens|CVS|Costco|Sam'?s Club)\b/i
    );
    if (lineMatch?.[1]) return lineMatch[1];
  }

  return null;
}

function detectPlatform(text: string): { platform: GigPlatform; reason: string } {
  const t = text.toLowerCase();

  const hasInstacart =
    t.includes('shop and deliver') ||
    t.includes('batch earnings') ||
    /\bbatch\b/.test(t) ||
    /\bunits\b/.test(t) ||
    t.includes('shop only');

  const hasDoorDash =
    t.includes('guaranteed') ||
    t.includes('incl. tips') ||
    t.includes('deliver by') ||
    t.includes('red card') ||
    t.includes('shop for items') ||
    t.includes('doordash');

  const hasUber =
    t.includes('includes expected tip') ||
    t.includes('total may be higher') ||
    t.includes('uber eats') ||
    t.includes('uber') ||
    t.includes('trip radar');

  if (hasInstacart && !hasDoorDash && !hasUber) {
    return { platform: 'Instacart', reason: 'Found batch / shop-and-deliver language' };
  }

  if (hasDoorDash && !hasInstacart && !hasUber) {
    return { platform: 'DoorDash', reason: 'Found guaranteed / deliver-by / red-card language' };
  }

  if (hasUber && !hasInstacart && !hasDoorDash) {
    return { platform: 'Uber Eats', reason: 'Found Uber tip / trip language' };
  }

  if (hasDoorDash && hasInstacart) {
    const ddStrength =
      Number(t.includes('guaranteed')) +
      Number(t.includes('deliver by')) +
      Number(t.includes('red card')) +
      Number(t.includes('incl. tips'));

    const icStrength =
      Number(t.includes('shop and deliver')) +
      Number(/\bbatch\b/.test(t)) +
      Number(/\bunits\b/.test(t)) +
      Number(t.includes('batch earnings'));

    if (ddStrength >= icStrength) {
      return { platform: 'DoorDash', reason: 'DoorDash keywords stronger than Instacart keywords' };
    }

    return { platform: 'Instacart', reason: 'Instacart keywords stronger than DoorDash keywords' };
  }

  return { platform: 'Unknown', reason: 'No strong platform keywords found' };
}

function estimateMinutes(platform: GigPlatform, distance: number | null, items: number | null) {
  const miles = distance ?? 0;
  const count = items ?? 0;

  if (miles <= 0 && count <= 0) return null;

  if (platform === 'Instacart') {
    return Math.max(12, Math.round(10 + count * 0.75 + 8 + miles * 2.2));
  }

  if (platform === 'DoorDash') {
    return Math.max(10, Math.round(10 + miles * 2.6 + Math.min(count, 8) * 0.25));
  }

  if (platform === 'Uber Eats') {
    return Math.max(10, Math.round(10 + miles * 2.5 + Math.min(count, 8) * 0.2));
  }

  return Math.max(10, Math.round(10 + miles * 2.5 + Math.min(count, 8) * 0.25));
}

export function parseOfferFromText(rawText: string): ParsedOffer {
  const text = cleanText(rawText);
  const { platform, reason } = detectPlatform(text);
  const payout = parseMoney(text);
  const distance = parseDistance(text);
  const items = parseItems(text);
  const store = parseStore(text, platform);
  const minutes = estimateMinutes(platform, distance, items);

  const score =
    Number(platform !== 'Unknown') +
    Number(payout != null) +
    Number(distance != null) +
    Number(items != null || store != null);

  let confidence: 'high' | 'medium' | 'low' = 'low';

  if (score >= 4) confidence = 'high';
  else if (score >= 2) confidence = 'medium';

  return {
    platform,
    payout,
    distance,
    items,
    store,
    minutes,
    confidence,
    reasoning: reason,
    source: 'local',
    rawText: text,
  };
}