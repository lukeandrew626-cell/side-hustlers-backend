import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ExtractionResult } from '../lib/types';

const HISTORY_KEY = 'scan_history';
const LAST_RESULT_KEY = 'last_result';

export async function saveLastResult(result: ExtractionResult): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_RESULT_KEY, JSON.stringify(result));
  } catch (error) {
    console.error('Error saving last result:', error);
  }
}

export async function getLastResult(): Promise<ExtractionResult | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_RESULT_KEY);
    return raw ? (JSON.parse(raw) as ExtractionResult) : null;
  } catch (error) {
    console.error('Error getting last result:', error);
    return null;
  }
}

export async function getHistory(): Promise<ExtractionResult[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ExtractionResult[]) : [];
  } catch (error) {
    console.error('Error getting history:', error);
    return [];
  }
}

export async function saveToHistory(result: ExtractionResult): Promise<void> {
  try {
    const existing = await getHistory();
    const updated = [result, ...existing];
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving to history:', error);
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing history:', error);
  }
}