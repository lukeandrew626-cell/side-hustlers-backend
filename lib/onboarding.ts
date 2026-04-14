import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_COMPLETE_KEY = 'side_hustlers_onboarding_complete';
export const LOCATION_ENABLED_KEY = 'side_hustlers_location_enabled';
export const SELECTED_PLATFORMS_KEY = 'side_hustlers_selected_platforms';
export const AUTH_MODE_KEY = 'side_hustlers_auth_mode';

export type PlatformOption =
  | 'DoorDash'
  | 'Uber Eats'
  | 'Instacart'
  | 'Grubhub'
  | 'Amazon Flex'
  | 'Uber'
  | 'Lyft';

export async function markOnboardingComplete() {
  await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
}

export async function isOnboardingComplete() {
  const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
  return value === 'true';
}

export async function saveLocationEnabled(enabled: boolean) {
  await AsyncStorage.setItem(LOCATION_ENABLED_KEY, String(enabled));
}

export async function saveSelectedPlatforms(platforms: PlatformOption[]) {
  await AsyncStorage.setItem(SELECTED_PLATFORMS_KEY, JSON.stringify(platforms));
}

export async function saveAuthMode(mode: 'guest' | 'signin' | 'signup') {
  await AsyncStorage.setItem(AUTH_MODE_KEY, mode);
}