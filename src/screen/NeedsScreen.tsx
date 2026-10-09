import { useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import ActionButton from '../components/ActionButton';
import Panel from '../components/Panel';
import ProgressSteps from '../components/ProgressSteps';
import { COLORS } from '../constants/colors';
import { ApiService } from '../services/api';
import type { SupplyNeedItem } from '../types';

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
  const [supplies, setSupplies] = useState<SupplyNeedItem[]>([]);

  useEffect(() => {
    async function fetchCalculatedNeeds() {
      try {
        const result = await ApiService.calculateNeeds(
          householdSize,
          hasInfant,
          hasSenior,
          hasMedicalNeeds
        );
        setSupplies(result);
      } catch {
        // Handled in ApiService fallback
      }
    }

    fetchCalculatedNeeds();
  }, [householdSize, hasInfant, hasSenior, hasMedicalNeeds]);

  const needs = [
    {
      title: 'Infant in household (under 2 yrs)',
      description: 'Auto-allocates diapers, formula, and infant feeding pack.',
      value: hasInfant,
      onChange: setHasInfant,
    },
    {
      title: 'Senior in household (60+ yrs)',
      description: 'Auto-allocates adult care pack and senior nutrition.',
      value: hasSenior,
      onChange: setHasSenior,
    },
    {
      title: 'Medical needs / Chronic illness',
      description: 'Auto-allocates insulin cold-chain cooler pack and maintenance meds.',
      value: hasMedicalNeeds,
      onChange: setHasMedicalNeeds,
    },
  ];

  return (
    <View style={styles.screen}>
      <ProgressSteps currentStep="needs" />

      <View style={styles.notice}>
        <Text style={styles.panelTitle}>Bilang: Supply Needs Counter</Text>
        <Text style={styles.body}>
          Taga-alalAI automatically turns household demographics into precise relief allocations,
          ensuring vulnerable family members are not overlooked.
        </Text>
      </View>

      <Panel>
        <Text style={styles.eyebrow}>CURRENT REGISTRATION</Text>
        <Text style={styles.familyName}>{familyName || 'Household Representative'}</Text>
        <Text style={styles.body}>Location: {location || 'Not specified'}</Text>
        <Text style={styles.body}>Household members: {householdSize}</Text>
      </Panel>

      <Text style={styles.sectionTitle}>Vulnerability Flags</Text>

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

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Calculated Relief Allocation</Text>
        <Text style={styles.itemCountTag}>
          {supplies.length} items calculated
        </Text>
      </View>

      <Panel>
        {supplies.map((supply) => (
          <View key={supply.name} style={styles.supplyRow}>
            <View style={styles.supplyDescription}>
              <Text style={styles.needTitle}>{supply.name}</Text>
              <Text style={styles.body}>{supply.description}</Text>
            </View>
            <View style={styles.supplyBadge}>
              <Text style={styles.supplyValue}>{supply.amount}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.helper}>
          Calculated by Bilang Python rules: 0.5kg rice/person/day + 2L water/person/day
          + special infant, senior, and insulin cold-chain needs.
        </Text>
      </Panel>

      <ActionButton
        title="Complete review and generate Kard AlalAI  →"
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.dark,
  },
  itemCountTag: {
    backgroundColor: COLORS.paleGreen,
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.track,
  },
  supplyDescription: {
    flex: 1,
    gap: 2,
  },
  supplyBadge: {
    backgroundColor: COLORS.paleGreen,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  supplyValue: {
    color: COLORS.dark,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  helper: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
});