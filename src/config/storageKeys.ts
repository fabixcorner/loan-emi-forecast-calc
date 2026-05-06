/**
 * Centralized localStorage keys used across the application.
 *
 * Always reference these constants rather than hardcoding string keys.
 * Renaming a key here keeps every reader/writer in sync.
 */

export const LOCAL_STORAGE_KEYS = {
  COMPARISON_SCENARIOS: "loan-comparison-scenarios",
  AFFORDABILITY_VALUES: "loan-affordability-values",
} as const;

export type LocalStorageKey =
  (typeof LOCAL_STORAGE_KEYS)[keyof typeof LOCAL_STORAGE_KEYS];