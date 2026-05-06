/**
 * User-related limits, validation rules and defaults.
 *
 * Edit these values to tune avatar uploads, password rules,
 * profile field limits, and feedback form constraints in one place.
 */

export const AVATAR_CONFIG = {
  /** Max accepted upload size in bytes. */
  MAX_FILE_SIZE_BYTES: 8 * 1024 * 1024, // 8 MB
  /** MIME type the cropped image is uploaded as. */
  UPLOAD_MIME_TYPE: "image/jpeg" as const,
  /** Filename prefix for uploaded avatar objects. */
  FILENAME_PREFIX: "avatar",
} as const;

export const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  REQUIRE_LOWERCASE: true,
  REQUIRE_UPPERCASE: true,
  REQUIRE_NUMBER: true,
} as const;

export const PROFILE_FIELD_LIMITS = {
  EMAIL_MAX_LENGTH: 255,
  DISPLAY_NAME_MAX_LENGTH: 100,
} as const;

export const FEEDBACK_FIELD_LIMITS = {
  NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,
  FEEDBACK_MAX_LENGTH: 1000,
  /** Threshold at which the remaining-character count turns into a warning. */
  FEEDBACK_WARNING_THRESHOLD: 900,
} as const;

export const DEFAULT_SCORING_WEIGHTS = {
  emiWeight: 30,
  interestWeight: 50,
} as const;