/**
 * Module: Login Screen
 * Responsibility: Implements two-stage passwordless authentication:
 * - Stage 1: Phone number entry with inline validation
 * - Stage 2: 6-digit OTP verification with active 30s resend cooldown countdown
 * Prevents double-submits, displays inline errors, and triggers session creation.
 */

import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/auth';
import { ApiClientError } from '../api/client';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export function LoginScreen() {
  const { colors, spacing, typography } = useTheme();
  const { login } = useAuth();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Resend cooldown timer
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setTimeout(() => {
        setCooldown((c) => c - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cooldown]);

  const validatePhone = (value: string): boolean => {
    const clean = value.replace(/[\s-]/g, '');
    if (!/^\+?[1-9]\d{9,14}$/.test(clean)) {
      setPhoneError('Enter a valid 10-15 digit phone number (e.g. +919876543210)');
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const handleRequestOtp = async () => {
    if (!validatePhone(phone)) return;

    setLoading(true);
    setGeneralError(null);
    try {
      await authApi.requestOtp(phone);
      setStep('otp');
      setCooldown(30);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setGeneralError(err.message);
      } else {
        setGeneralError('Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) {
      setOtpError('OTP must be exactly 6 numeric digits');
      return;
    }
    setOtpError(null);

    setLoading(true);
    setGeneralError(null);
    try {
      const result = await authApi.verifyOtp(phone, otp.trim());
      await login(result.token, result.user);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setOtpError(err.message);
      } else {
        setGeneralError('Failed to verify OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || loading) return;
    setOtp('');
    setOtpError(null);
    await handleRequestOtp();
  };

  const handleChangePhone = () => {
    setStep('phone');
    setOtp('');
    setOtpError(null);
    setGeneralError(null);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { padding: spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={[styles.header, { marginBottom: spacing.xxl }]}>
            <View
              style={[
                styles.logoBadge,
                {
                  backgroundColor: colors.primary,
                  borderRadius: 14,
                  marginBottom: spacing.md,
                },
              ]}
            >
              <Text style={styles.logoText}>₹</Text>
            </View>
            <Text style={[typography.h1, { color: colors.text }]}>MiniLedger</Text>
            <Text
              style={[
                typography.body,
                { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
              ]}
            >
              Track money lent to friends with clarity and ease.
            </Text>
          </View>

          {/* General Error Banner */}
          {generalError ? (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: colors.errorBg,
                  borderColor: colors.error,
                  borderRadius: 8,
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

          {/* Form Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: 16,
                padding: spacing.xl,
              },
            ]}
          >
            {step === 'phone' ? (
              <>
                <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.xs }]}>
                  Log in or Sign up
                </Text>
                <Text
                  style={[
                    typography.caption,
                    { color: colors.textMuted, marginBottom: spacing.lg },
                  ]}
                >
                  Enter your mobile number to receive a 6-digit verification code.
                </Text>

                <Input
                  label="Phone Number"
                  value={phone}
                  onChangeText={(val) => {
                    setPhone(val);
                    if (phoneError) validatePhone(val);
                  }}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  placeholder="+919876543210"
                  error={phoneError}
                  containerStyle={{ marginBottom: spacing.lg }}
                />

                <Button
                  title="Send Verification Code"
                  onPress={handleRequestOtp}
                  loading={loading}
                  disabled={loading}
                />
              </>
            ) : (
              <>
                <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.xs }]}>
                  Verify OTP
                </Text>
                <Text
                  style={[
                    typography.caption,
                    { color: colors.textMuted, marginBottom: spacing.sm },
                  ]}
                >
                  We sent a code to <Text style={{ fontWeight: '700', color: colors.text }}>{phone}</Text>
                </Text>

                <Pressable
                  onPress={handleChangePhone}
                  style={{ marginBottom: spacing.lg }}
                  accessibilityRole="button"
                >
                  <Text style={[typography.captionBold, { color: colors.primary }]}>
                    Edit Phone Number
                  </Text>
                </Pressable>

                <Input
                  label="6-Digit Code"
                  value={otp}
                  onChangeText={(val) => {
                    setOtp(val);
                    if (otpError) setOtpError(null);
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="123456"
                  error={otpError}
                  containerStyle={{ marginBottom: spacing.lg }}
                />

                <Button
                  title="Verify & Enter"
                  onPress={handleVerifyOtp}
                  loading={loading}
                  disabled={loading || otp.length !== 6}
                  style={{ marginBottom: spacing.md }}
                />

                {/* Resend Cooldown */}
                <View style={styles.resendRow}>
                  {cooldown > 0 ? (
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      Resend code in {cooldown}s
                    </Text>
                  ) : (
                    <Pressable
                      onPress={handleResendOtp}
                      disabled={loading}
                      accessibilityRole="button"
                    >
                      <Text style={[typography.captionBold, { color: colors.primary }]}>
                        Resend Code
                      </Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
  },
  logoBadge: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  card: {
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  errorBanner: {
    borderWidth: 1,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 8,
  },
});
