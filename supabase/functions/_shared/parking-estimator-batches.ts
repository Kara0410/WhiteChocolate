export const PARKING_ESTIMATOR_DATABASE_BATCH_SIZE = 100;

export function batchParkingEstimatorValues<T>(
  values: readonly T[],
  batchSize = PARKING_ESTIMATOR_DATABASE_BATCH_SIZE,
) {
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error('Parking estimator batch size must be a positive integer.');
  }

  const batches: T[][] = [];
  for (let index = 0; index < values.length; index += batchSize) {
    batches.push(values.slice(index, index + batchSize));
  }
  return batches;
}
