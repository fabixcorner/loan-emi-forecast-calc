/**
 * Centralized database resource names (Supabase tables and storage buckets).
 *
 * Reference these constants instead of hardcoding string literals throughout
 * the codebase. If a table or bucket is renamed in the backend, update it
 * here only.
 */

export const DB_TABLES = {
  PROFILES: "profiles",
  SAVED_CALCULATIONS: "saved_calculations",
  USER_FEEDBACK: "user_feedback",
  USER_ROLES: "user_roles",
} as const;

export const STORAGE_BUCKETS = {
  AVATARS: "avatars",
} as const;

export type DbTable = (typeof DB_TABLES)[keyof typeof DB_TABLES];
export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];