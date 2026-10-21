/**
 * Module: Accessible Input Component
 * Responsibility: Standardizes form text inputs with labels, active focus borders,
 * inline error messages, and accessible touch boundaries.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface InputProps extends TextInputProps {
  label: string;
  error?: string | null;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  containerStyle,
  style,
  ...props
}: InputProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? colors.error
    : isFocused
    ? colors.primary
    : colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      <Text
        style={[
          typography.captionBold,
          { color: error ? colors.error : colors.text, marginBottom: spacing.xs },
        ]}
      >
        {label}
      </Text>

      <TextInput
        style={[
          typography.body,
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            minHeight: 48, // Touch target >= 44px
          },
          style,
        ]}
        placeholderTextColor={colors.textSubtle}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        accessibilityLabel={label}
        aria-invalid={Boolean(error)}
        {...props}
      />

      {error ? (
        <Text
          style={[
            typography.caption,
            { color: colors.error, marginTop: spacing.xs },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    borderWidth: 1.5,
  },
});
