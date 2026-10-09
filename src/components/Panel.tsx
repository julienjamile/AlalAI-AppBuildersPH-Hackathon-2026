import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { COLORS } from '../constants/colors';

type Props = ViewProps & {
  children: ReactNode;
};

export default function Panel({ children, style, ...props }: Props) {
  return (
    <View {...props} style={[styles.panel, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: COLORS.white,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
});