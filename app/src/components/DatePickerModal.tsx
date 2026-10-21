/**
 * Module: Accessible Date Picker Modal
 * Responsibility: Provides a cross-platform calendar modal date picker.
 * Enforces calendar date invariants: disables past dates, supports month navigation,
 * and outputs exact YYYY-MM-DD strings without timezone drift.
 */

import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';

export interface DatePickerModalProps {
  visible: boolean;
  currentDate: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DatePickerModal({
  visible,
  currentDate,
  onSelect,
  onClose,
}: DatePickerModalProps) {
  const { colors, spacing, radius, typography } = useTheme();

  // Parse initial year, month, day
  const [initYear, initMonth, initDay] = (currentDate || new Date().toISOString().slice(0, 10))
    .split('-')
    .map(Number);

  const [year, setYear] = useState(initYear || new Date().getFullYear());
  const [month, setMonth] = useState((initMonth ?? 1) - 1); // 0-indexed
  const [selectedDay, setSelectedDay] = useState(initDay || new Date().getDate());

  const today = new Date();
  const todayZero = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  // Number of days in current view month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayWeekday = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleConfirm = () => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(selectedDay).padStart(2, '0');
    const result = `${year}-${formattedMonth}-${formattedDay}`;
    onSelect(result);
    onClose();
  };

  const renderDays = () => {
    const items = [];

    // Empty padding cells before first weekday
    for (let i = 0; i < firstDayWeekday; i++) {
      items.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(Date.UTC(year, month, d));
      const isPast = cellDate < todayZero;
      const isSelected = selectedDay === d;

      items.push(
        <Pressable
          key={`day-${d}`}
          disabled={isPast}
          onPress={() => setSelectedDay(d)}
          style={[
            styles.dayCell,
            {
              borderRadius: radius.full,
              backgroundColor: isSelected ? colors.primary : 'transparent',
              opacity: isPast ? 0.3 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${d} ${MONTH_NAMES[month]} ${year}`}
          accessibilityState={{ selected: isSelected, disabled: isPast }}
        >
          <Text
            style={[
              typography.captionBold,
              {
                color: isSelected
                  ? '#FFFFFF'
                  : isPast
                  ? colors.textSubtle
                  : colors.text,
              },
            ]}
          >
            {d}
          </Text>
        </Pressable>
      );
    }

    return items;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
              padding: spacing.lg,
            },
          ]}
        >
          {/* Header Month / Year Navigation */}
          <View style={styles.monthHeader}>
            <Pressable
              onPress={handlePrevMonth}
              style={[styles.navButton, { borderColor: colors.border, borderRadius: radius.sm }]}
              accessibilityLabel="Previous month"
            >
              <Text style={[typography.bodyBold, { color: colors.text }]}>‹</Text>
            </Pressable>

            <Text style={[typography.h3, { color: colors.text }]}>
              {MONTH_NAMES[month]} {year}
            </Text>

            <Pressable
              onPress={handleNextMonth}
              style={[styles.navButton, { borderColor: colors.border, borderRadius: radius.sm }]}
              accessibilityLabel="Next month"
            >
              <Text style={[typography.bodyBold, { color: colors.text }]}>›</Text>
            </Pressable>
          </View>

          {/* Weekday labels */}
          <View style={[styles.weekDaysRow, { marginTop: spacing.md }]}>
            {WEEK_DAYS.map((wd) => (
              <Text
                key={wd}
                style={[styles.weekDayText, typography.micro, { color: colors.textMuted }]}
              >
                {wd}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={[styles.grid, { marginVertical: spacing.sm }]}>
            {renderDays()}
          </View>

          {/* Action Buttons */}
          <View style={[styles.actions, { marginTop: spacing.md }]}>
            <Button
              title="Cancel"
              variant="outline"
              size="md"
              onPress={onClose}
              style={{ flex: 1, marginRight: spacing.sm }}
            />
            <Button
              title="Select Date"
              variant="primary"
              size="md"
              onPress={handleConfirm}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weekDayText: {
    width: 36,
    textAlign: 'center',
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  actions: {
    flexDirection: 'row',
  },
});
