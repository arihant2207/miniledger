/**
 * Module: Typography Tokens
 * Responsibility: Centralizes font sizes, line heights, and weights in a unified scale.
 */

import { TextStyle } from 'react-native';

export const typography = {
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  } as TextStyle,
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  } as TextStyle,
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  } as TextStyle,
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  } as TextStyle,
  bodyBold: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  } as TextStyle,
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  } as TextStyle,
  captionBold: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  } as TextStyle,
  micro: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  } as TextStyle,
} as const;

export type Typography = typeof typography;
