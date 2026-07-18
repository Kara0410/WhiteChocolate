export type ParkingSnapshotCandidate = {
  segment_id: string;
  estimator_version: string;
  generated_at: string;
  valid_until: string;
};

export function partitionParkingSnapshots<T extends ParkingSnapshotCandidate>(
  segmentIds: readonly string[],
  snapshots: readonly T[],
  estimatorVersion: string,
  now: Date,
) {
  const requestedIds = new Set(segmentIds);
  const reusableBySegment = new Map<string, T>();
  for (const snapshot of snapshots) {
    if (
      !requestedIds.has(snapshot.segment_id) ||
      snapshot.estimator_version !== estimatorVersion ||
      Date.parse(snapshot.valid_until) <= now.getTime()
    ) {
      continue;
    }
    const current = reusableBySegment.get(snapshot.segment_id);
    if (
      !current ||
      Date.parse(snapshot.generated_at) > Date.parse(current.generated_at)
    ) {
      reusableBySegment.set(snapshot.segment_id, snapshot);
    }
  }
  return {
    reusableBySegment,
    missingSegmentIds: segmentIds.filter((id) => !reusableBySegment.has(id)),
  };
}
