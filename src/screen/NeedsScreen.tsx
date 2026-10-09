
import { Pressable, StyleSheet, Text, View } from 'react-native';

import ActionButton from '../components/ActionButton';
import Panel from '../components/Panel';
import ProgressSteps from '../components/ProgressSteps';
import { COLORS } from '../constants/colors';

type Props = {
  familyName: string;
  members: string;
  location: string;
  hasInfant: boolean;
  setHasInfant: (value: boolean) => void;
  hasSenior: boolean;
  setHasSenior: (value: boolean) => void;
  hasMedicalNeeds: boolean;
  setHasMedicalNeeds: (value: boolean) => void;
  onContinue: () => void;
  onBack: () => void;
};

const SUPPLIES = [
  { name: 'Rice', amount: '2.5 kg', description: 'Estimated household allocation' },
  { name: 'Drinking water', amount: '10 L', description: 'Estimated household allocation' },
  { name: 'Family hygiene kit', amount: '1 kit', description: 'Standard sample allocation' },
];

export default function NeedsScreen({
  familyName,
  members,
  location,
  hasInfant,
  setHasInfant,
  hasSenior,
  setHasSenior,
  hasMedicalNeeds,
  setHasMedicalNeeds,
  onContinue,
  onBack,
}: Props) {
  const householdSize = Math.max(1, Number(members) || 1);

  const needs = [
    {
      title: 'Infant in household',
      description: 'The household needs infant supplies.',
      value: hasInfant,
      onChange: setHasInfant,
    },
    {
      title: 'Senior in household',
      description: 'The household includes an older adult.',
      value: hasSenior,
      onChange: setHasSenior,
    },
    {
      title: 'Medical needs',
      description: 'The household needs medical support.',
      value: hasMedicalNeeds,
      onChange: setHasMedicalNeeds,
    },
  ];

  return (
    <View style={styles.screen}>
      <ProgressSteps currentStep="needs" />

      <View style={styles.notice}>
        <Text style={styles.panelTitle}>Confirm family needs</Text>
        <Text style={styles.body}>
          Review the household details and select any additional support
          requirements before completing the registration.
        </Text>
      </View>

      <Panel>
        <Text style={styles.eyebrow}>CURRENT REGISTRATION</Text>
        <Text style={styles.familyName}>{familyName || 'Family Name'}</Text>
        <Text style={styles.body}>Location: {location}</Text>
        <Text style={styles.body}>Household members: {householdSize}</Text>
      </Panel>

      <Text style={styles.sectionTitle}>Additional support</Text>

      {needs.map((need) => (
        <Pressable
          key={need.title}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: need.value }}
          onPress={() => need.onChange(!need.value)}
          style={styles.needRow}
        >
          <View
            style={[
              styles.checkbox,
              need.value && styles.checkboxActive,
            ]}
          >
            {need.value && <Text style={styles.checkmark}>✓</Text>}
          </View>

          <View style={styles.needContent}>
            <Text style={styles.needTitle}>{need.title}</Text>
            <Text style={styles.body}>{need.description}</Text>
          </View>
        </Pressable>
      ))}

      <Text style={styles.sectionTitle}>Estimated supplies</Text>

      <Panel>
        {SUPPLIES.map((supply) => (
          <View key={supply.name} style={styles.supplyRow}>
            <View style={styles.supplyDescription}>
              <Text style={styles.needTitle}>{supply.name}</Text>
              <Text style={styles.body}>{supply.description}</Text>
            </View>
            <Text style={styles.supplyValue}>{supply.amount}</Text>
          </View>
        ))}

        <Text style={styles.helper}>
          These are sample estimates for the prototype, not actual distribution
          quantities.
        </Text>
      </Panel>

      <ActionButton
        title="Complete review and preview card  →"
        onPress={onContinue}
      />

      <ActionButton
        title="Back"
        secondary
        onPress={onBack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 14,
  },
  notice: {
    backgroundColor: COLORS.lightGreen,
    borderRadius: 14,
    padding: 16,
    gap: 7,
  },
  panelTitle: {
    color: COLORS.dark,
    fontSize: 17,
    fontWeight: '800',
  },
  body: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  eyebrow: {
    color: '#718778',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  familyName: {
    color: COLORS.dark,
    fontSize: 19,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 8,
  },
  needRow: {
    minHeight: 82,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  checkbox: {
    width: 27,
    height: 27,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#9AA99C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  needContent: {
    flex: 1,
    gap: 3,
  },
  needTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
  },
  supplyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 5,
  },
  supplyDescription: {
    flex: 1,
    gap: 3,
  },
  supplyValue: {
    color: COLORS.dark,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  helper: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
  },
});