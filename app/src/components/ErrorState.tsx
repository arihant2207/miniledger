/**
 * Module: Error State Component
 * Responsibility: Renders a recoverable error message with a retry button.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.xxl }]}>
      <Text style={[styles.icon, { marginBottom: spacing.md }]}>⚠️</Text>
      <Text style={[typography.h3, { color: colors.text, textAlign: 'center' }]}>
        Something went wrong
      </Text>
      <Text
        style={[
          typography.body,
          { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
        ]}
      >
        {message}
      </Text>

      {onRetry ? (
        <Button
          title="Try Again"
          onPress={onRetry}
          variant="outline"
          size="md"
          style={{ marginTop: spacing.lg }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 48,
  },
});
