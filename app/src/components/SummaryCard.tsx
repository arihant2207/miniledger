/**
 * Module: Summary Card Component
 * Responsibility: Displays portfolio financial metrics in three clear columns:
 * Total Lent, Repaid, and Overdue (highlighted in prominent warning color).
 * Formats all monetary figures in Indian Rupee (INR) representation.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { PortfolioSummary } from '../api/types';
import { formatINR } from '../utils/format';

export interface SummaryCardProps {
  summary: PortfolioSummary | null;
}

export function SummaryCard({ summary }: SummaryCardProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const totalLent = summary?.totalLent ?? 0;
  const totalRepaid = summary?.totalRepaid ?? 0;
  const totalOverdue = summary?.totalOverdue ?? 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.lg,
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`Summary: Total lent ${formatINR(totalLent)}, Repaid ${formatINR(totalRepaid)}, Overdue ${formatINR(totalOverdue)}`}
    >
      <Text
        style={[
          typography.micro,
          { color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
        ]}
      >
        Portfolio Overview
      </Text>

      <View style={[styles.figuresRow, { marginTop: spacing.md }]}>
        {/* Total Lent */}
        <View style={styles.metricColumn}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Total Lent
          </Text>
          <Text
            style={[
              typography.h3,
              { color: colors.text, marginTop: spacing.xxs },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatINR(totalLent)}
          </Text>
        </View>

        {/* Repaid */}
        <View style={styles.metricColumn}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Repaid
          </Text>
          <Text
            style={[
              typography.h3,
              { color: colors.repaid, marginTop: spacing.xxs },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatINR(totalRepaid)}
          </Text>
        </View>

        {/* Overdue */}
        <View style={styles.metricColumn}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Overdue
          </Text>
          <Text
            style={[
              typography.h3,
              {
                color: totalOverdue > 0 ? colors.overdue : colors.textSubtle,
                marginTop: spacing.xxs,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatINR(totalOverdue)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  figuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metricColumn: {
    flex: 1,
  },
});
