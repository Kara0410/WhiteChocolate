import type { Database } from './database';

export type ParkingAvailabilityEstimateRow =
  Database['public']['Tables']['parking_availability_estimates']['Row'];
export type ParkingSegmentRow =
  Database['public']['Tables']['parking_segments']['Row'];
export type UserFavoriteRow =
  Database['public']['Tables']['user_favorites']['Row'];
export type UserPreferencesRow =
  Database['public']['Tables']['user_preferences']['Row'];
