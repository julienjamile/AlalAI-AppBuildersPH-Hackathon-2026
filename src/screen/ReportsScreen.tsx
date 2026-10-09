
import { Alert, StyleSheet, Text, View } from 'react-native';

import ActionButton from '../components/ActionButton';
import Panel from '../components/Panel';
import { COLORS } from '../constants/colors';

type Props = {
  onBack: () => void;
};

const SUPPLY_ALERTS = [
  { name: 'Rice', status: 'Low stock', quantity: '18 kg remaining' },
  { name: 'Drinking water', status: 'Low stock', quantity: '24 L remaining' },
  { name: 'Diapers', status: 'Needs review', quantity: '2 packs remaining' },
];

export default function ReportsScreen({ onBack }: Props) {
  return (
    <View style={styles.screen}>
      <Text style={styles.intro}>
        Review sample supply alerts, prepare an SMS report, and view
        synchronization status.
      </Text>

      <Text style={styles.sectionTitle}>Supply alerts</Text>

      {SUPPLY_ALERTS.map((item) => (
        <Panel key={item.name}>
          <View style={styles.supplyRow}>
            <Text style={styles.panelTitle}>{item.name}</Text>
            <Text style={styles.warningText}>{item.status}</Text>
          </View>
          <Text style={styles.body}>{item.quantity}</Text>
        </Panel>
      ))}

      <Text style={styles.sectionTitle}>Text Ulat</Text>

      <Panel>
        <Text style={styles.panelTitle}>Sample SMS report</Text>
        <Text style={styles.smsPreview}>
          {'SILONG CENTER REPORT\n'}
          {'Families: 128\n'}
          {'Individuals: 463\n'}
          {'Low-stock items: 3\n'}
          {'Pending reviews: 12\n'}
          {'Rice, water, and diapers need resupply review.'}
        </Text>
        <ActionButton
          title="Preview report"
          onPress={() =>
            Alert.alert(
              'Sample report',
              'This is a local preview. No SMS has been sent.'
            )
          }
        />
      </Panel>

      <Text style={styles.sectionTitle}>Pasa · Synchronization</Text>

      <Panel>
        <Text style={styles.panelTitle}>Phone ↔ Laptop</Text>
        <Text style={styles.body}>
          Example status: Local demo data. No devices are connected.
        </Text>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>OFFLINE DEMO</Text>
        </View>

        <ActionButton
          title="Check demo status"
          secondary
          onPress={() =>
            Alert.alert(
              'Synchronization',
              'This prototype does not transfer or sync records.'
            )
          }
        />
      </Panel>

      <ActionButton title="Back to dashboard" onPress={onBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 14,
  },
  intro: {
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.muted,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 8,
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
  supplyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  warningText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '800',
  },
  smsPreview: {
    backgroundColor: COLORS.paleGray,
    borderRadius: 12,
    padding: 14,
    color: COLORS.dark,
    fontSize: 14,
    lineHeight: 23,
    overflow: 'hidden',
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF4ED',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  statusText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
});