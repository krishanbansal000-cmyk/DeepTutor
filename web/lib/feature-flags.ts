/**
 * Small, typed switchboard for frontend features that are not ready for the
 * student-facing experience yet. Keep keys stable so a flag can later move to
 * a remote or per-user source without changing its call sites.
 */
export const FEATURE_KEYS = {
  CHAT_RAW_LOGS: "chat.raw_logs",
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

const DEFAULT_FEATURE_FLAGS: Record<FeatureKey, boolean> = {
  [FEATURE_KEYS.CHAT_RAW_LOGS]: false,
};

const PUBLIC_FEATURE_OVERRIDES: Partial<
  Record<FeatureKey, string | undefined>
> = {
  [FEATURE_KEYS.CHAT_RAW_LOGS]:
    process.env.NEXT_PUBLIC_DRONA_FEATURE_CHAT_RAW_LOGS,
};

function parseBooleanOverride(value: string | undefined): boolean | null {
  if (value === undefined || value === "") return null;
  if (["1", "true", "yes", "on"].includes(value.toLowerCase())) return true;
  if (["0", "false", "no", "off"].includes(value.toLowerCase())) return false;
  return null;
}

export function isFeatureEnabled(key: FeatureKey): boolean {
  return (
    parseBooleanOverride(PUBLIC_FEATURE_OVERRIDES[key]) ??
    DEFAULT_FEATURE_FLAGS[key]
  );
}
