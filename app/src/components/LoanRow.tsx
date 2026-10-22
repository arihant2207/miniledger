/**
 * Module: Loan Row Item Component
 * Responsibility: Renders a single loan entry in the feed:
 * - Friend name and INR formatted loan amount
 * - Relative due date text ("Due in 3 days", "Overdue by 5 days", "Due today")
 * - Status chip badge (Pending, Overdue, Repaid)
 * - Prominent visual highlighting for overdue pending debts
 * - Confirmation alert dialog before executing repayment
 */

import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Loan } from '../api/types';
import { formatINR, getRelativeDueDate } from '../utils/format';

export interface LoanRowProps {
  loan: Loan;
  onRepay: (loanId: string) => void;
  isRepaying?: boolean;
}

export function LoanRow({ loan, onRepay, isRepaying = false }: LoanRowProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const isRepaid = loan.status === 'repaid';
  const relativeDate = getRelativeDueDate(loan.dueDate, isRepaid);
  const isOverdue = loan.isOverdue && !isRepaid;

  const handleRepayPress = () => {
    Alert.alert(
      'Mark as Repaid',
      `Did ${loan.friendName} return ${formatINR(loan.amount)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Repaid',
          style: 'default',
          onPress: () => onRepay(loan.id),
        },
      ]
    );
  };

  const getCardStyle = () => {
    if (isOverdue) {
      return {
        backgroundColor: colors.overdueBg,
        borderColor: colors.overdueBorder,
        borderWidth: 1.5,
      };
    }
    return {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    };
  };

  const getStatusChipStyle = () => {
    if (isRepaid) {
      return {
        bg: colors.repaidBg,
        border: colors.repaidBorder,
        text: colors.repaid,
        label: 'Repaid',
      };
    }
    if (isOverdue) {
      return {
        bg: colors.overdueBg,
        border: colors.overdueBorder,
        text: colors.overdue,
        label: 'Overdue',
      };
    }
    return {
      bg: colors.pendingBg,
      border: colors.pendingBorder,
      text: colors.pending,
      label: 'Pending',
    };
  };

  const chip = getStatusChipStyle();

  return (
    <View
      style={[
        styles.card,
        getCardStyle(),
        {
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.sm,
        },
      ]}
      accessibilityLabel={`Loan to ${loan.friendName}, amount ${formatINR(loan.amount)}, status ${chip.label}, ${relativeDate.text}`}
    >
      <View style={styles.topRow}>
        <View style={styles.friendInfo}>
          <Text
            style={[
              typography.bodyBold,
              { color: colors.text },
            ]}
            numberOfLines={1}
          >
            {loan.friendName}
          </Text>

          <Text
            style={[
              typography.caption,
              {
                color: isOverdue ? colors.overdue : colors.textMuted,
                marginTop: spacing.xxs,
                fontWeight: isOverdue ? '600' : '400',
              },
            ]}
          >
            {relativeDate.text} ({loan.dueDate})
          </Text>
        </View>

        <View style={styles.amountInfo}>
          <Text
            style={[
              typography.bodyBold,
              {
                color: isRepaid ? colors.textMuted : isOverdue ? colors.overdue : colors.text,
                textAlign: 'right',
                textDecorationLine: isRepaid ? 'line-through' : 'none',
              },
            ]}
          >
            {formatINR(loan.amount)}
          </Text>

          <View
            style={[
              styles.statusChip,
              {
                backgroundColor: chip.bg,
                borderColor: chip.border,
                borderRadius: radius.sm,
                marginTop: spacing.xxs,
              },
            ]}
          >
            <Text
              style={[
                typography.micro,
                { color: chip.text, fontWeight: '700' },
              ]}
            >
              {chip.label}
            </Text>
          </View>
        </View>
      </View>

      {loan.notes ? (
        <Text
          style={[
            typography.caption,
            { color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },
          ]}
          numberOfLines={2}
        >
          "{loan.notes}"
        </Text>
      ) : null}

      {!isRepaid ? (
        <View style={[styles.actionRow, { marginTop: spacing.md }]}>
          <Pressable
            onPress={handleRepayPress}
            disabled={isRepaying}
            style={({ pressed }) => [
              styles.repayButton,
              {
                backgroundColor: pressed ? colors.repaidBorder : colors.repaidBg,
                borderColor: colors.repaidBorder,
                borderRadius: radius.sm,
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.md,
                opacity: isRepaying ? 0.6 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Mark loan from ${loan.friendName} as repaid`}
          >
            <Text
              style={[
                typography.captionBold,
                { color: colors.repaid },
              ]}
            >
              {isRepaying ? 'Updating...' : '✓ Mark Repaid'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  friendInfo: {
    flex: 1,
    marginRight: 8,
  },
  amountInfo: {
    alignItems: 'flex-end',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#00000015',
    paddingTop: 8,
  },
  repayButton: {
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
