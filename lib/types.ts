export type ExtractionResult = {
  id: string;
  createdAt: string;
  imageUri: string;
  app: string;
  store: string;
  payout: number | null;
  miles: number | null;
  minutes: number | null;
  items: string;
  confidence: number | null;
  score: number | null;
  recommendation: 'Accept' | 'Decline' | 'Maybe' | null;
  dollarsPerMile: number | null;
  dollarsPerHour: number | null;
  reasons: string[];
  scanSeconds: number | null;
};