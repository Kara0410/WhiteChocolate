import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGACY_VEHICLES_STORAGE_KEY = '@white-choclate/vehicles/v1';

export async function cleanupLegacyGarageStorage(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LEGACY_VEHICLES_STORAGE_KEY);
  } catch (error) {
    if (__DEV__) {
      console.warn(
        '[legacy-storage-cleanup] failed to remove legacy Garage storage',
        error,
      );
    }
  }
}
