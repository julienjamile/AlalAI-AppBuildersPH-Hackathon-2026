
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { COLORS } from '../constants/colors';

type Props = {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function ActionButton({
  title,
  onPress,
  secondary = false,
  disabled = false,
  style,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        secondary && styles.secondaryButton,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && styles.secondaryButtonText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    color: COLORS.primary,
  },
  disabled: {
    opacity: 0.45,
  },
});