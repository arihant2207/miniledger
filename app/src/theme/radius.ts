/**
 * Module: Radius Tokens
 * Responsibility: Standardizes corner radii across cards, buttons, badges, and modals.
 */

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export type Radius = typeof radius;
