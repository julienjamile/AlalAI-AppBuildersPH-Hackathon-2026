
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import ActionButton from '../components/ActionButton';
import Panel from '../components/Panel';
import { COLORS } from '../constants/colors';

type Props = {
  onContinue: (centerName: string) => void;
};

export default function CenterSelectionScreen({
  onContinue,
}: Props) {
  const [centerName, setCenterName] = useState('');

  const handleContinue = () => {
    const name = centerName.trim();

    if (!name) return;

    onContinue(name);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>ins</Text>
          </View>

          <View>
            <Text style={styles.brandName}>AlalAI</Text>
            <Text style={styles.brandCaption}>RELIEF CENTER</Text>
          </View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>CENTER SETUP</Text>
          <Text style={styles.title}>
            Which evacuation center are you managing?
          </Text>
          <Text style={styles.description}>
            Enter the evacuation center where you will record
            and manage family, individual, and supply data.
          </Text>
        </View>

        <Panel>
          <Text style={styles.label}>Evacuation center name</Text>

          <TextInput
            value={centerName}
            onChangeText={setCenterName}
            placeholder="e.g. Barangay Hall Evacuation Center"
            placeholderTextColor={COLORS.placeholder}
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            accessibilityLabel="Evacuation center name"
          />

          <Text style={styles.helper}>
            Make sure the center name is correct before continuing.
          </Text>

          <ActionButton
            title="Continue to Dashboard"
            onPress={handleContinue}
            disabled={!centerName.trim()}
          />
        </Panel>

        <Text style={styles.footer}>
          The selected center will be used as the active center
          for this session.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: 22,
    gap: 28,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: '800',
  },
  brandName: {
    color: COLORS.dark,
    fontSize: 22,
    fontWeight: '800',
  },
  brandCaption: {
    color: COLORS.muted,
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  intro: {
    gap: 10,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    color: COLORS.dark,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
  },
  description: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  label: {
    color: COLORS.dark,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 54,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: COLORS.dark,
  },
  helper: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});