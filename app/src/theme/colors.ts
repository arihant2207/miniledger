/**
 * Module: Theme Colors
 * Responsibility: Defines centralized, high-contrast, accessible light and dark palettes.
 * Features one signature accent color (Indigo), balanced neutrals, and semantic status colors.
 */

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSubtle: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  borderSubtle: string;
  primary: string;
  primaryHover: string;
  primaryText: string;
  overdue: string;
  overdueBg: string;
  overdueBorder: string;
  repaid: string;
  repaidBg: string;
  repaidBorder: string;
  pending: string;
  pendingBg: string;
  pendingBorder: string;
  error: string;
  errorBg: string;
}

export const lightColors: ThemeColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  text: '#0F172A',
  textMuted: '#475569',
  textSubtle: '#94A3B8',
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  primary: '#4F46E5', // Indigo 600
  primaryHover: '#4338CA',
  primaryText: '#FFFFFF',
  overdue: '#DC2626', // Red 600
  overdueBg: '#FEF2F2',
  overdueBorder: '#FECACA',
  repaid: '#059669', // Emerald 600
  repaidBg: '#ECFDF5',
  repaidBorder: '#A7F3D0',
  pending: '#D97706', // Amber 600
  pendingBg: '#FFFBEB',
  pendingBorder: '#FDE68A',
  error: '#DC2626',
  errorBg: '#FEF2F2',
};

export const darkColors: ThemeColors = {
  background: '#0B0F19',
  surface: '#151C2C',
  surfaceSubtle: '#1E293B',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textSubtle: '#64748B',
  border: '#1E293B',
  borderSubtle: '#151C2C',
  primary: '#6366F1', // Indigo 500
  primaryHover: '#818CF8',
  primaryText: '#FFFFFF',
  overdue: '#EF4444',
  overdueBg: '#450A0A',
  overdueBorder: '#7F1D1D',
  repaid: '#10B981',
  repaidBg: '#064E3B',
  repaidBorder: '#065F46',
  pending: '#F59E0B',
  pendingBg: '#451A03',
  pendingBorder: '#78350F',
  error: '#EF4444',
  errorBg: '#450A0A',
};
