
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { COLORS } from '../constants/colors';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

export default function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
        placeholderTextColor={COLORS.placeholder}
        style={styles.input}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  label: {
    color: COLORS.dark,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 54,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: COLORS.dark,
  },
});