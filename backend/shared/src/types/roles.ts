export const USER_ROLES = ['admin', 'material_prep', 'user'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SUPPORTED_LANGUAGES = ['th', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
