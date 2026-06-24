export type AvailabilityStatus = 'high' | 'medium' | 'low';

export function getAvailabilityStatus(
  percentage: number,
): AvailabilityStatus {
  if (percentage >= 65) {
    return 'high';
  }
  if (percentage >= 30) {
    return 'medium';
  }
  return 'low';
}
