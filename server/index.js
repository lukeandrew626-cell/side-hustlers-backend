import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Side Hustlers API is running',
  });
});

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
  const reasoningText = [
    parsed.platform,
    parsed.reasoning,
    parsed.store,
    parsed.merchant,
    parsed.restaurant,
    parsed.retailer,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const strongInstacart =
    reasoningText.includes('shop and deliver') ||
    reasoningText.includes('batch earnings') ||
    reasoningText.includes('batch') ||
    reasoningText.includes('units') ||
    reasoningText.includes('customer count') ||
    reasoningText.includes('shop only') ||
    reasoningText.includes('shopping list') ||
    reasoningText.includes('instacart');

  const strongDoorDash =
    reasoningText.includes('guaranteed') ||
    reasoningText.includes('incl. tips') ||
    reasoningText.includes('deliver by') ||
    reasoningText.includes('red card') ||
    reasoningText.includes('shop for items') ||
    reasoningText.includes('doordash') ||
    reasoningText.includes('red button') ||
    reasoningText.includes('red accents');

  const strongUber =
    reasoningText.includes('includes expected tip') ||
    reasoningText.includes('total may be higher') ||
    reasoningText.includes('uber eats') ||
    reasoningText.includes('uber') ||
    reasoningText.includes('trip radar') ||
    reasoningText.includes('estimated');

  const modelPlatform = normalizePlatform(parsed.platform);

  if (strongInstacart && !strongDoorDash && !strongUber) return 'Instacart';
  if (strongDoorDash && !strongInstacart && !strongUber) return 'DoorDash';
  if (strongUber && !strongInstacart && !strongDoorDash) return 'Uber Eats';

  // tie-breakers
  if (strongDoorDash && strongInstacart) {
    const hasGuaranteed = reasoningText.includes('guaranteed') || reasoningText.includes('incl. tips');
    const hasDeliverBy = reasoningText.includes('deliver by');
    const hasBatch = reasoningText.includes('batch') || reasoningText.includes('batch earnings');

    if ((hasGuaranteed || hasDeliverBy) && !hasBatch) return 'DoorDash';
    if (hasBatch && !hasGuaranteed && !hasDeliverBy) return 'Instacart';
  }

  if (strongUber && !strongInstacart && !strongDoorDash) return 'Uber Eats';

  return modelPlatform;
}

app.post('/analyze', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({
        error: 'No image provided',
      });
    }

    const prompt = `
You are analyzing a screenshot from a gig delivery app.

Your job is to:
1. Identify whether the screenshot is from DoorDash, Uber Eats, or Instacart
2. Extract the most important offer details
3. Return strict JSON only

========================
GOAL
========================

Extract as many of these as possible:
- platform
- payout
- distance in miles
- item count
- store or restaurant name
- minutes if clearly visible or reasonably inferable from explicit on-screen timing
- confidence
- reasoning

IMPORTANT:
- Do NOT classify based mainly on groceries or food
- A grocery order can still be DoorDash or Uber Eats
- Instacart should only be chosen when there are actual Instacart-specific signals
- If exact values are not visible, return null instead of guessing wildly

========================
PLATFORM DETECTION RULES
========================

--- DOORDASH ---
Classify as "DoorDash" if strong DoorDash signs appear, such as:
- "Guaranteed"
- "Guaranteed (incl. tips)"
- "incl. tips"
- "Deliver by"
- "Shop for items"
- "Red Card"
- payout shown prominently with miles below it
- red accents, red buttons, or red highlights
- DoorDash-style offer card layout
- DoorDash grocery shopping language that still looks like a DoorDash offer screen

--- UBER EATS ---
Classify as "Uber Eats" if strong Uber signs appear, such as:
- "Trip"
- "Estimated"
- "Includes expected tip"
- "Total may be higher"
- "Uber"
- "Uber Eats"
- black / dark UI with green accents typical of Uber
- Uber-style stacked request card layout

--- INSTACART ---
Classify as "Instacart" if strong Instacart signs appear, such as:
- "batch"
- "batch earnings"
- "shop and deliver"
- "shop only"
- "items"
- "units"
- item count shown like "46 items" or "46 units"
- customer count / batch presentation
- green Instacart UI
- green accept button with white text
- shopping list batch screen
- multiple order batch presentation
- store shown on the map for the shopping trip
- store pinned or named on the map before delivery

========================
PRIORITY RULES
========================

Apply these in order of strength:

- If "shop and deliver" appears, strongly prefer Instacart
- If "batch" or "batch earnings" appears, strongly prefer Instacart
- If item count is shown as items or units in a shopping-batch layout, strongly prefer Instacart
- If the store name is shown directly on the map for a shopping trip, prefer Instacart
- If there is a green accept button with white text together with Instacart batch language, prefer Instacart

- If "Guaranteed", "incl. tips", "Deliver by", "Shop for items", or "Red Card" appear, strongly prefer DoorDash
- If "Includes expected tip" or "Total may be higher" appear, strongly prefer Uber Eats

- Do NOT classify as DoorDash just because it is groceries
- Do NOT classify as Instacart just because it is groceries
- Grocery orders can belong to any platform
- When multiple signals conflict, choose the platform with the strongest exact keyword and layout match

========================
EXTRACTION RULES
========================

Extract these fields if visible:

1. platform
2. payout
3. distance
4. items
5. store
6. minutes
7. confidence
8. reasoning

ITEM RULES:
- For Instacart, look carefully for:
  - "46 items"
  - "46 units"
  - "12 items"
  - "23 units"
- If both items and units appear, prefer the main visible shopping count
- If item count is unclear, return null

DISTANCE RULES:
- Return miles as a number only
- If not visible, return null

TIME RULES:
- If exact estimated minutes are visible, return them
- If a "Deliver by" time clearly allows estimating minutes from screenshot context, return estimated minutes
- If time is not clearly visible, return null
- Do NOT invent an exact visible time that is not supported by the screenshot

STORE RULES:
- Extract merchant, store, or restaurant name if visible
- For Instacart, store name is especially important
- Otherwise return null

CONFIDENCE RULES:
- Use "high" only if platform and key values are clearly visible
- Use "medium" if some values are inferred from obvious UI context
- Use "low" if the screenshot is partial, blurry, cropped, or unclear

REASONING RULES:
- Keep reasoning short but specific
- Mention the strongest keywords or UI cues that drove the platform choice
- Mention extracted values when helpful

========================
OUTPUT
========================

Return STRICT JSON only with this exact shape:

{
  "platform": "Instacart",
  "payout": 23.19,
  "minutes": null,
  "distance": 8.1,
  "items": 46,
  "store": "Meijer",
  "confidence": "high",
  "reasoning": "Instacart batch layout is visible, the store is shown on the map, and the screenshot shows 46 items and 8.1 miles."
}
`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a precise screenshot analyzer for gig delivery apps. Always return strict JSON.',
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
              },
            },
          ],
        },
      ],
      max_tokens: 450,
    });

    const rawContent = response.choices?.[0]?.message?.content;

    if (!rawContent) {
      return res.status(500).json({
        error: 'Model returned an empty response',
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (error) {
      console.error('JSON parse error:', error);
      console.error('Raw model output:', rawContent);

      return res.status(500).json({
        error: 'Failed to parse AI response',
        raw: rawContent,
      });
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

    const modelMinutes =
      parseNumber(parsed.minutes) ??
      parseNumber(parsed.estimatedMinutes) ??
      parseNumber(parsed.timeMinutes) ??
      parseNumber(parsed.estimatedTime);

    const computedMinutes = estimateMinutes(correctedPlatform, distance, items);
    const minutes = modelMinutes ?? computedMinutes;

    const hourly =
      parseNumber(parsed.hourly) ??
      parseNumber(parsed.dollarsPerHour) ??
      parseNumber(parsed.hourlyRate) ??
      estimateHourly(payout, minutes);

    const store = extractStore(parsed);

    res.json({
      success: true,
      result: {
        platform: correctedPlatform,
        payout,
        minutes,
        distance,
        items,
        store,
        hourly,
        confidence:
          parsed.confidence === 'high' ||
          parsed.confidence === 'medium' ||
          parsed.confidence === 'low'
            ? parsed.confidence
            : 'medium',
        reasoning: parsed.reasoning || '',
      },
    });
  } catch (error) {
    console.error('Analyze error:', error);

    res.status(500).json({
      error: 'Failed to analyze screenshot',
      details: error?.message || 'Unknown server error',
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});