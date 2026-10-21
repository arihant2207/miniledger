/**
 * Module: Add Loan Screen
 * Responsibility: Handles loan creation form:
 * - Friend name input (trimmed, max 100)
 * - Amount input with numeric/decimal keyboard (enforcing > 0)
 * - Date picker modal (future-or-today calendar dates)
 * - Optional notes input
 * - Inline validation errors and prevention of duplicate submits
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { loansApi } from '../api/loans';
import { ApiClientError } from '../api/client';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { DatePickerModal } from '../components/DatePickerModal';

export function AddLoanScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation();

  const todayStr = new Date().toISOString().slice(0, 10);

  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(todayStr);
  const [notes, setNotes] = useState('');

  const [nameError, setNameError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const validate = (): boolean => {
    let isValid = true;

    if (!friendName.trim()) {
      setNameError('Friend name is required');
      isValid = false;
    } else if (friendName.trim().length > 100) {
      setNameError('Friend name cannot exceed 100 characters');
      isValid = false;
    } else {
      setNameError(null);
    }

    const numAmount = parseFloat(amount.trim());
    if (isNaN(numAmount) || numAmount <= 0) {
      setAmountError('Enter a valid amount greater than 0');
      isValid = false;
    } else if (!/^\d+(\.\d{1,2})?$/.test(numAmount.toFixed(2))) {
      setAmountError('Amount cannot have more than 2 decimal places');
      isValid = false;
    } else {
      setAmountError(null);
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validate() || submitting) return;

    setSubmitting(true);
    setGeneralError(null);

    try {
      await loansApi.createLoan({
        friendName: friendName.trim(),
        amount: parseFloat(parseFloat(amount.trim()).toFixed(2)),
        dueDate,
        notes: notes.trim() ? notes.trim() : undefined,
      });

      navigation.goBack();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setGeneralError(err.message);
      } else {
        setGeneralError('Failed to create loan entry. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
        >
          <Text style={[typography.bodyBold, { color: colors.primary }]}>‹ Back</Text>
        </Pressable>

        <Text style={[typography.h3, { color: colors.text }]}>Lend Money</Text>

        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { padding: spacing.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          {generalError ? (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: colors.errorBg,
                  borderColor: colors.error,
                  borderRadius: radius.sm,
                  padding: spacing.md,
                  marginBottom: spacing.lg,
                },
              ]}
            >
              <Text style={[typography.captionBold, { color: colors.error }]}>
                {generalError}
              </Text>
            </View>
          ) : null}

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: spacing.xl,
              },
            ]}
          >
            {/* Friend Name Input */}
            <Input
              label="Friend's Name"
              value={friendName}
              onChangeText={(val) => {
                setFriendName(val);
                if (nameError) setNameError(null);
              }}
              placeholder="e.g. Alex Mercer"
              error={nameError}
              containerStyle={{ marginBottom: spacing.lg }}
            />

            {/* Amount Input */}
            <Input
              label="Amount (₹)"
              value={amount}
              onChangeText={(val) => {
                setAmount(val);
                if (amountError) setAmountError(null);
              }}
              placeholder="0.00"
              keyboardType="decimal-pad"
              error={amountError}
              containerStyle={{ marginBottom: spacing.lg }}
            />

            {/* Due Date Trigger */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[typography.captionBold, { color: colors.text, marginBottom: spacing.xs }]}>
                Due Date
              </Text>

              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={[
                  styles.dateTrigger,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.md,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Selected due date: ${dueDate}. Tap to change.`}
              >
                <Text style={[typography.body, { color: colors.text }]}>
                  📅 {dueDate}
                </Text>
                <Text style={[typography.captionBold, { color: colors.primary }]}>
                  Change
                </Text>
              </Pressable>
            </View>

            {/* Optional Notes */}
            <Input
              label="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Split for dinner & movies"
              multiline
              numberOfLines={3}
              style={{ minHeight: 70, textAlignVertical: 'top' }}
              containerStyle={{ marginBottom: spacing.xl }}
            />

            {/* Submit Button */}
            <Button
              title="Save Loan Entry"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        currentDate={dueDate}
        onSelect={(date) => setDueDate(date)}
        onClose={() => setShowDatePicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
  },
  card: {
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  errorBanner: {
    borderWidth: 1,
  },
  dateTrigger: {
    borderWidth: 1.5,
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
