// Internal guards shared by the merge helpers. Not exported from index.ts.

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Parses an ISO timestamp; returns null for missing or invalid values. */
export function parseTimestamp(
  value: string | null | undefined,
): number | null {
  if (!value) {
    return null;
  }

  const milliseconds = Date.parse(value);
  return Number.isNaN(milliseconds) ? null : milliseconds;
}

/**
 * Deterministic JSON stringify with sorted object keys, so objects that went
 * through Postgres jsonb (which reorders keys) still compare equal to their
 * local originals.
 */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (isRecord(value)) {
    const entries = Object.keys(value)
      .sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value) ?? 'null';
}
