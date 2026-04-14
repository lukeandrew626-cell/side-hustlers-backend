import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  onboardingComplete: 'side_hustlers_onboarding_complete',
  isLoggedIn: 'side_hustlers_is_logged_in',
  profile: 'side_hustlers_profile',
  selectedPlatforms: 'side_hustlers_selected_platforms',
  vehicle: 'side_hustlers_vehicle',
  driverPreferences: 'side_hustlers_driver_preferences',
  plusPromptSeen: 'side_hustlers_plus_prompt_seen',
  freeScanCount: 'side_hustlers_free_scan_count',
};

export type UserProfile = {
  name: string;
  email: string;
  password: string;
};

export type VehicleProfile = {
  year: string;
  make: string;
  model: string;
  mpg: string;
};

export type DriverPreferences = {
  minPayout: number;
  minPerMile: number;
  maxMiles: number;
  minHourly: number;
};

export const DEFAULT_DRIVER_PREFERENCES: DriverPreferences = {
  minPayout: 6,
  minPerMile: 1.75,
  maxMiles: 12,
  minHourly: 18,
};

export async function getOnboardingComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.onboardingComplete);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingComplete(value: boolean): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.onboardingComplete,
    value ? 'true' : 'false'
  );
}

export async function getIsLoggedIn(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.isLoggedIn);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setIsLoggedIn(value: boolean): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.isLoggedIn,
    value ? 'true' : 'false'
  );
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
}

export async function getProfile(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.profile);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function savePlatforms(platforms: string[]): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.selectedPlatforms,
    JSON.stringify(platforms)
  );
}

export async function getPlatforms(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.selectedPlatforms);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveVehicle(vehicle: VehicleProfile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.vehicle, JSON.stringify(vehicle));
}

export async function getVehicle(): Promise<VehicleProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.vehicle);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveDriverPreferences(
  preferences: DriverPreferences
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.driverPreferences,
    JSON.stringify(preferences)
  );
}

export async function getDriverPreferences(): Promise<DriverPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.driverPreferences);
    if (!raw) {
      return DEFAULT_DRIVER_PREFERENCES;
    }

    const parsed = JSON.parse(raw);

    return {
      minPayout:
        typeof parsed.minPayout === 'number'
          ? parsed.minPayout
          : DEFAULT_DRIVER_PREFERENCES.minPayout,
      minPerMile:
        typeof parsed.minPerMile === 'number'
          ? parsed.minPerMile
          : DEFAULT_DRIVER_PREFERENCES.minPerMile,
      maxMiles:
        typeof parsed.maxMiles === 'number'
          ? parsed.maxMiles
          : DEFAULT_DRIVER_PREFERENCES.maxMiles,
      minHourly:
        typeof parsed.minHourly === 'number'
          ? parsed.minHourly
          : DEFAULT_DRIVER_PREFERENCES.minHourly,
    };
  } catch {
    return DEFAULT_DRIVER_PREFERENCES;
  }
}

export async function resetDriverPreferences(): Promise<void> {
  await saveDriverPreferences(DEFAULT_DRIVER_PREFERENCES);
}

export async function hasSeenPlusPrompt(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.plusPromptSeen);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setSeenPlusPrompt(value: boolean): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.plusPromptSeen,
    value ? 'true' : 'false'
  );
}

export async function getFreeScanCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.freeScanCount);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

export async function setFreeScanCount(count: number): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.freeScanCount, String(count));
}

export async function incrementFreeScanCount(): Promise<number> {
  const count = await getFreeScanCount();
  const next = count + 1;
  await setFreeScanCount(next);
  return next;
}

export async function resetFreeScanCount(): Promise<void> {
  await setFreeScanCount(0);
}