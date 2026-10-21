/**
 * Module: Empty State Component
 * Responsibility: Displays a friendly placeholder when no loan entries exist,
 * encouraging the user to add their first loan.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  message: string;
  actionTitle?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  message,
  actionTitle,
  onAction,
}: EmptyStateProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.xxl }]}>
      <Text style={[styles.icon, { marginBottom: spacing.md }]}>🤝</Text>
      <Text style={[typography.h3, { color: colors.text, textAlign: 'center' }]}>
        {title}
      </Text>
      <Text
        style={[
          typography.body,
          { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
        ]}
      >
        {message}
      </Text>

      {actionTitle && onAction ? (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="primary"
          size="md"
          style={{ marginTop: spacing.xl }}
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
