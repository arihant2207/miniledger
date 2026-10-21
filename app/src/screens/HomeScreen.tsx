/**
 * Module: Home Screen
 * Responsibility: Serves as the primary operational dashboard:
 * - SummaryCard at top with INR totals (Lent, Repaid, Overdue)
 * - Feed of loan entries sorted overdue-first with relative dates and status chips
 * - Mark as repaid action with confirmation dialog
 * - Pull-to-refresh, loading skeleton, empty state, and error handling
 * - Theme mode toggle and session logout
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { loansApi } from '../api/loans';
import { Loan, PortfolioSummary } from '../api/types';
import { ApiClientError } from '../api/client';
import { SummaryCard } from '../components/SummaryCard';
import { LoanRow } from '../components/LoanRow';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Button } from '../components/Button';
import { MainStackParamList } from '../navigation/types';

export function HomeScreen() {
  const { colors, spacing, typography, isDark, setThemeMode, themeMode } = useTheme();
  const { user, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repayingId, setRepayingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [loansData, summaryData] = await Promise.all([
        loansApi.getLoans(),
        loansApi.getSummary(),
      ]);
      setLoans(loansData);
      setSummary(summaryData);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load portfolio. Please pull down to refresh.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchData();
  };

  const handleRepay = async (loanId: string) => {
    setRepayingId(loanId);
    try {
      const updated = await loansApi.repayLoan(loanId);
      // Optimistically update list and refresh summary
      setLoans((prev) =>
        prev.map((item) => (item.id === loanId ? updated : item))
      );
      const updatedSummary = await loansApi.getSummary();
      setSummary(updatedSummary);
    } catch (err) {
      if (err instanceof ApiClientError) {
        Alert.alert('Repayment Failed', err.message);
      } else {
        Alert.alert('Repayment Failed', 'An unexpected error occurred while updating loan.');
      }
    } finally {
      setRepayingId(null);
    }
  };

  const toggleTheme = () => {
    if (themeMode === 'system') {
      setThemeMode(isDark ? 'light' : 'dark');
    } else {
      setThemeMode(themeMode === 'light' ? 'dark' : 'light');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top Header */}
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
        <View>
          <Text style={[typography.micro, { color: colors.textMuted, textTransform: 'uppercase' }]}>
            Logged In As
          </Text>
          <Text style={[typography.bodyBold, { color: colors.text }]}>
            {user?.phone ?? 'User'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {/* Theme Toggle Button */}
          <Pressable
            onPress={toggleTheme}
            style={[
              styles.iconButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                marginRight: spacing.sm,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Toggle Dark Mode"
          >
            <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
          </Pressable>

          {/* Logout Button */}
          <Pressable
            onPress={() => void logout()}
            style={[
              styles.iconButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Log Out"
          >
            <Text style={{ fontSize: 16 }}>🚪</Text>
          </Pressable>
        </View>
      </View>

      {/* Main Body */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.md }]}>
            Loading loans...
          </Text>
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void fetchData()} />
      ) : (
        <FlatList
          data={loans}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { padding: spacing.lg, paddingBottom: 100 },
          ]}
          ListHeaderComponent={
            <View style={{ marginBottom: spacing.lg }}>
              <SummaryCard summary={summary} />
              <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
                <Text style={[typography.h3, { color: colors.text }]}>
                  Loan Entries ({loans.length})
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <LoanRow
              loan={item}
              onRepay={handleRepay}
              isRepaying={repayingId === item.id}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No loans added yet"
              message="Keep track of money you lend to friends. Tap '+ Lend Money' below to start."
              actionTitle="+ Lend to a Friend"
              onAction={() => navigation.navigate('AddLoan')}
            />
          }
        />
      )}

      {/* Floating Action Button */}
      {!loading && !error && loans.length > 0 ? (
        <View style={[styles.fabContainer, { bottom: spacing.xl, right: spacing.xl }]}>
          <Button
            title="+ Lend Money"
            onPress={() => navigation.navigate('AddLoan')}
            size="lg"
            style={styles.fab}
          />
        </View>
      ) : null}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fabContainer: {
    position: 'absolute',
  },
  fab: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
