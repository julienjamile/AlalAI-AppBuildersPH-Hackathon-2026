
import { StyleSheet, Text, View } from 'react-native';

import { COLORS, REGISTRATION_STEPS } from '../constants/colors';
import type { RegistrationStep } from '../types';

type Props = {
  currentStep: RegistrationStep;
};

export default function ProgressSteps({ currentStep }: Props) {
  const currentIndex = REGISTRATION_STEPS.findIndex(
    (step) =>
      ({
        Intake: 'intake',
        Confirm: 'confirm',
        Duplicates: 'duplicate',
        Needs: 'needs',
        'QR Card': 'card',
      })[step] === currentStep
  );

  const progress = ((currentIndex + 1) / REGISTRATION_STEPS.length) * 100;

  return (
    <View style={styles.container}>
      <Text style={styles.progressText}>
        STEP {currentIndex + 1} OF {REGISTRATION_STEPS.length}
      </Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>

      <View style={styles.labels}>
        {REGISTRATION_STEPS.map((step, index) => (
          <Text
            key={step}
            style={[
              styles.label,
              index === currentIndex && styles.activeLabel,
            ]}
          >
            {step}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 15,
    gap: 10,
  },
  progressText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  track: {
    height: 7,
    backgroundColor: COLORS.track,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: 7,
    backgroundColor: COLORS.primary,
    borderRadius: 5,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 9,
    color: COLORS.muted,
  },
  activeLabel: {
    color: COLORS.primary,
    fontWeight: '800',
  },
});