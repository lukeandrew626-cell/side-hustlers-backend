import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY in .env');
}

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET in .env');
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 6 * 1024 * 1024,
  },
});

const client = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const googleClient = new OAuth2Client();

const usersById = new Map();
const usersByProviderKey = new Map();

function nowMs() {
  return Date.now();
}

function elapsedMs(startedAt) {
  return Date.now() - startedAt;
}

function createAppToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      provider: user.provider,
    },
    JWT_SECRET,
    {
      expiresIn: '30d',
    }
  );
}

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        error: 'Missing auth token',
      });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired auth token',
    });
  }
}

function buildProviderKey(provider, providerUserId) {
  return `${provider}:${providerUserId}`;
}

function findOrCreateUser({
  provider,
  providerUserId,
  email = null,
  name = null,
  avatarUrl = null,
}) {
  const providerKey = buildProviderKey(provider, providerUserId);
  const existingUserId = usersByProviderKey.get(providerKey);

  if (existingUserId) {
    const existingUser = usersById.get(existingUserId);

    if (existingUser) {
      existingUser.email = email ?? existingUser.email;
      existingUser.name = name ?? existingUser.name;
      existingUser.avatarUrl = avatarUrl ?? existingUser.avatarUrl;
      existingUser.updatedAt = new Date().toISOString();
      return existingUser;
    }
  }

  const newUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    provider,
    providerUserId,
    email,
    name,
    avatarUrl,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  usersById.set(newUser.id, newUser);
  usersByProviderKey.set(providerKey, newUser.id);

  return newUser;
}

function parseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseItemCount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value === 'string') {
    const match = value.match(/\d+/);
    if (match) {
      const parsed = Number(match[0]);
      return Number.isFinite(parsed) ? Math.round(parsed) : null;
    }
  }

  return null;
}

function normalizePlatform(value) {
  if (value === 'DoorDash' || value === 'Uber Eats' || value === 'Instacart') {
    return value;
  }
  return 'Unknown';
}

function estimateMinutes(platform, miles, items) {
  const safeMiles = miles ?? 0;
  const safeItems = items ?? 0;

  if (safeMiles <= 0 && safeItems <= 0) return null;

  if (platform === 'Instacart') {
    const shopping = 10 + safeItems * 0.75;
    const driving = 8 + safeMiles * 2.2;
    return Math.max(12, Math.round(shopping + driving));
  }

  if (platform === 'DoorDash') {
    const total = 10 + safeMiles * 2.6 + Math.min(safeItems, 8) * 0.25;
    return Math.max(10, Math.round(total));
  }

  if (platform === 'Uber Eats') {
    const total = 10 + safeMiles * 2.5 + Math.min(safeItems, 8) * 0.2;
    return Math.max(10, Math.round(total));
  }

  const fallback = 10 + safeMiles * 2.5 + Math.min(safeItems, 10) * 0.25;
  return Math.max(10, Math.round(fallback));
}

function estimateHourly(payout, minutes) {
  if (payout == null || minutes == null || minutes <= 0) return null;
  return Number(((payout / minutes) * 60).toFixed(2));
}

function estimatePerMile(payout, distance) {
  if (payout == null || distance == null || distance <= 0) return null;
  return Number((payout / distance).toFixed(2));
}

function extractStore(parsed) {
  return (
    parsed.store ||
    parsed.merchant ||
    parsed.restaurant ||
    parsed.retailer ||
    parsed.shop ||
    null
  );
}

function fixPlatformFromSignals(parsed) {
  const signalText = [
    parsed.platform,
    parsed.store,
    parsed.merchant,
    parsed.restaurant,
    parsed.retailer,
    parsed.app,
    parsed.layout,
    parsed.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const strongInstacart =
    signalText.includes('instacart') ||
    signalText.includes('shop and deliver') ||
    signalText.includes('batch') ||
    signalText.includes('units') ||
    signalText.includes('shopping list') ||
    signalText.includes('shop only');

  const strongDoorDash =
    signalText.includes('doordash') ||
    signalText.includes('guaranteed') ||
    signalText.includes('incl. tips') ||
    signalText.includes('deliver by') ||
    signalText.includes('red card') ||
    signalText.includes('shop for items');

  const strongUber =
    signalText.includes('uber eats') ||
    signalText.includes('uber') ||
    signalText.includes('includes expected tip') ||
    signalText.includes('total may be higher') ||
    signalText.includes('trip radar');

  const modelPlatform = normalizePlatform(parsed.platform);

  if (strongInstacart && !strongDoorDash && !strongUber) return 'Instacart';
  if (strongDoorDash && !strongInstacart && !strongUber) return 'DoorDash';
  if (strongUber && !strongInstacart && !strongDoorDash) return 'Uber Eats';

  return modelPlatform;
}

function normalizeConfidence(value) {
  if (typeof value !== 'string') return 'medium';

  const lower = value.trim().toLowerCase();
  if (lower === 'high' || lower === 'medium' || lower === 'low') return lower;
  return 'medium';
}

function buildRuleChecks({ payout, distance, hourly }) {
  return [
    {
      key: 'minPayout',
      label: 'Payout',
      passed: (payout ?? 0) >= 6,
      actual: payout ?? 0,
      target: 6,
    },
    {
      key: 'minPerMile',
      label: 'Mile',
      passed:
        payout != null && distance != null && distance > 0
          ? payout / distance >= 1.75
          : false,
      actual:
        payout != null && distance != null && distance > 0 ? payout / distance : 0,
      target: 1.75,
    },
    {
      key: 'maxMiles',
      label: 'Distance',
      passed: distance != null ? distance <= 12 : false,
      actual: distance ?? 0,
      target: 12,
    },
    {
      key: 'minHourly',
      label: 'Hourly',
      passed: (hourly ?? 0) >= 18,
      actual: hourly ?? 0,
      target: 18,
    },
  ];
}

function getVerdictFromRules(ruleChecks) {
  const passedRules = ruleChecks.filter((rule) => rule.passed).length;

  if (passedRules >= 3) return 'TAKE';
  if (passedRules <= 1) return 'SKIP';
  return 'MAYBE';
}

function buildQuickTake({ verdict, payout, distance, minutes, store }) {
  const parts = [];

  if (verdict === 'TAKE') {
    parts.push('This looks like a strong order overall.');
  } else if (verdict === 'SKIP') {
    parts.push('This probably is not worth taking for your setup.');
  } else {
    parts.push('This one looks borderline.');
  }

  if (store) {
    parts.push(`Store: ${store}.`);
  }

  if (payout != null) {
    parts.push(`Payout is $${payout.toFixed(2)}.`);
  }

  if (distance != null) {
    parts.push(`Distance is ${distance.toFixed(1)} miles.`);
  }

  if (minutes != null) {
    parts.push(`Estimated time is about ${Math.round(minutes)} minutes.`);
  }

  return parts.join(' ');
}

function stripDataUrlPrefix(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  return trimmed.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
}

async function extractImageBase64FromRequest(req) {
  if (req.file?.buffer) {
    return req.file.buffer.toString('base64');
  }

  if (typeof req.body?.imageBase64 === 'string' && req.body.imageBase64.trim()) {
    return stripDataUrlPrefix(req.body.imageBase64);
  }

  return null;
}

async function analyzeImageBase64(imageBase64) {
  const prompt = `
Return strict JSON only for this gig app screenshot.

Keys:
platform
payout
distance
items
store
minutes
confidence

Allowed platform values:
DoorDash
Uber Eats
Instacart
Unknown

Rules:
Use only clearly visible values.
If not clearly visible return null.
No explanation.
No extra keys.

Return exactly:
{
  "platform": "Unknown",
  "payout": null,
  "distance": null,
  "items": null,
  "store": null,
  "minutes": null,
  "confidence": "medium"
}
`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Extract visible offer fields from gig app screenshots. Return strict JSON only.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: 'low',
            },
          },
        ],
      },
    ],
    max_tokens: 80,
  });

  const rawContent = response.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error('Model returned an empty response');
  }

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (error) {
    console.error('JSON parse error:', error);
    console.error('Raw model output:', rawContent);
    throw new Error('Failed to parse AI response');
  }

  const correctedPlatform = fixPlatformFromSignals(parsed);

  const payout =
    parseNumber(parsed.payout) ??
    parseNumber(parsed.pay) ??
    parseNumber(parsed.offer);

  const distance =
    parseNumber(parsed.distance) ??
    parseNumber(parsed.miles) ??
    parseNumber(parsed.totalMiles);

  const items =
    parseItemCount(parsed.items) ??
    parseItemCount(parsed.itemCount) ??
    parseItemCount(parsed.item_count) ??
    parseItemCount(parsed.totalItems) ??
    parseItemCount(parsed.units);

  const explicitMinutes =
    parseNumber(parsed.minutes) ??
    parseNumber(parsed.estimatedMinutes) ??
    parseNumber(parsed.timeMinutes) ??
    parseNumber(parsed.estimatedTime);

  const minutes = explicitMinutes ?? estimateMinutes(correctedPlatform, distance, items);
  const hourly = estimateHourly(payout, minutes);
  const perMile = estimatePerMile(payout, distance);
  const store = extractStore(parsed);
  const confidence = normalizeConfidence(parsed.confidence);

  const ruleChecks = buildRuleChecks({
    payout,
    distance,
    hourly,
  });

  const passedRules = ruleChecks.filter((rule) => rule.passed).length;
  const failedRules = ruleChecks.length - passedRules;
  const verdict = getVerdictFromRules(ruleChecks);
  const quickTake = buildQuickTake({
    verdict,
    payout,
    distance,
    minutes,
    store,
  });

  return {
    platform: correctedPlatform,
    payout,
    minutes,
    distance,
    items,
    store,
    hourly,
    perMile,
    confidence,
    reasoning: null,
    verdict,
    quickTake,
    passedRules,
    failedRules,
    ruleChecks,
  };
}

async function handleAnalyze(req, res, routeName) {
  const startedAt = nowMs();

  try {
    const extractStartedAt = nowMs();
    const imageBase64 = await extractImageBase64FromRequest(req);
    console.log(`[${routeName}] extract image ms:`, elapsedMs(extractStartedAt));

    if (!imageBase64) {
      return res.status(400).json({
        error: 'No image provided',
      });
    }

    const analyzeStartedAt = nowMs();
    const result = await analyzeImageBase64(imageBase64);
    console.log(`[${routeName}] analyze image ms:`, elapsedMs(analyzeStartedAt));
    console.log(`[${routeName}] total ms:`, elapsedMs(startedAt));

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(`${routeName} error:`, error);
    console.log(`[${routeName}] failed total ms:`, elapsedMs(startedAt));

    return res.status(500).json({
      error: 'Failed to analyze screenshot',
      details: error?.message || 'Unknown server error',
    });
  }
}

app.get('/healthz', (req, res) => {
  res.status(200).json({
    ok: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Side Hustlers API is running',
  });
});

app.get('/me', authMiddleware, (req, res) => {
  const user = usersById.get(req.user.sub);

  if (!user) {
    return res.status(404).json({
      error: 'User not found',
    });
  }

  res.json({
    success: true,
    user,
  });
});

app.post('/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({
        error: 'Missing Google idToken',
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.sub) {
      return res.status(401).json({
        error: 'Invalid Google token payload',
      });
    }

    const user = findOrCreateUser({
      provider: 'google',
      providerUserId: payload.sub,
      email: payload.email || null,
      name: payload.name || null,
      avatarUrl: payload.picture || null,
    });

    const token = createAppToken(user);

    res.json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    console.error('Google auth error:', error);

    res.status(500).json({
      error: 'Google authentication failed',
      details: error?.message || 'Unknown server error',
    });
  }
});

app.post('/scan', upload.single('image'), async (req, res) => {
  return handleAnalyze(req, res, '/scan');
});

app.post('/analyze', upload.single('image'), async (req, res) => {
  return handleAnalyze(req, res, '/analyze');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});