/**
 * Module: Accessible Button Component
 * Responsibility: Renders theme-aware pressable buttons with minimum 44px touch targets,
 * active micro-press opacity feedback, loading spinner, and disabled prevention.
 */

import {
  Pressable,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  style,
  testID,
}: ButtonProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const isDisabled = disabled || loading;

  const getContainerStyle = (pressed: boolean): ViewStyle => {
    let backgroundColor = colors.primary;
    let borderColor = 'transparent';
    let borderWidth = 0;

    switch (variant) {
      case 'primary':
        backgroundColor = pressed ? colors.primaryHover : colors.primary;
        break;
      case 'secondary':
        backgroundColor = pressed ? colors.surfaceSubtle : colors.border;
        break;
      case 'outline':
        backgroundColor = pressed ? colors.surfaceSubtle : 'transparent';
        borderColor = colors.border;
        borderWidth = 1.5;
        break;
      case 'danger':
        backgroundColor = pressed ? colors.overdueBg : colors.overdue;
        break;
    }

    if (isDisabled) {
      backgroundColor = variant === 'outline' ? 'transparent' : colors.surfaceSubtle;
      borderColor = colors.border;
    }

    const height = size === 'lg' ? 52 : 44; // Always >= 44px touch target

    return {
      height,
      minHeight: 44,
      borderRadius: radius.md,
      backgroundColor,
      borderColor,
      borderWidth,
      paddingHorizontal: spacing.xl,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      opacity: pressed && !isDisabled ? 0.9 : 1,
    };
  };

  const getTextStyle = (): TextStyle => {
    let color = colors.primaryText;

    if (variant === 'outline') {
      color = colors.text;
    } else if (variant === 'secondary') {
      color = colors.text;
    } else if (variant === 'danger') {
      color = '#FFFFFF';
    }

    if (isDisabled) {
      color = colors.textSubtle;
    }

    return {
      ...(size === 'lg' ? typography.bodyBold : typography.captionBold),
      color,
      textAlign: 'center',
    };
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [getContainerStyle(pressed), style]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' ? colors.primary : '#FFFFFF'}
        />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </Pressable>
  );
}
