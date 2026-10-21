/**
 * Module: Spacing Tokens
 * Responsibility: Enforces a strict 4/8pt spacing scale across all views, cards, and inputs.
 */

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  hero: 48,
} as const;

export type Spacing = typeof spacing;
