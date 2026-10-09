
import { StyleSheet, Text, View } from 'react-native';

import ActionButton from '../components/ActionButton';
import Panel from '../components/Panel';
import { COLORS } from '../constants/colors';
import type { Screen } from '../types';

type Props = {
  onNavigate: (screen: Screen) => void;
};

const STATS = [
  { value: '128', label: 'Families registered' },
  { value: '463', label: 'Individuals recorded' },
  { value: '12', label: 'Pending reviews' },
  { value: '3', label: 'Low-stock items' },
];

export default function DashboardScreen({ onNavigate }: Props) {
  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>CAMP STATUS</Text>
        <Text style={styles.heroTitle}>Relief center overview</Text>
        <Text style={styles.heroDescription}>
          View sample household records, track family needs, and review
          supply alerts in one place.
        </Text>

        <ActionButton
          title="Register a family"
          onPress={() => onNavigate('intake')}
        />
      </View>

      <View style={styles.statsGrid}>
        {STATS.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statNumber}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Quick actions</Text>

      <Panel>
        <Text style={styles.panelTitle}>Family registration</Text>
        <Text style={styles.body}>
          Record household details, review possible duplicates, and preview a
          family relief card.
        </Text>
        <ActionButton
          title="Open registration"
          onPress={() => onNavigate('intake')}
        />
      </Panel>

      <Panel>
        <Text style={styles.panelTitle}>Family needs</Text>
        <Text style={styles.body}>
          Record infant, senior, and medical support needs.
        </Text>
        <ActionButton
          title="Open needs screen"
          secondary
          onPress={() => onNavigate('needs')}
        />
      </Panel>

      <Panel>
        <Text style={styles.panelTitle}>Reports and synchronization</Text>
        <Text style={styles.body}>
          Review low-stock alerts and sample offline status.
        </Text>
        <ActionButton
          title="View reports"
          secondary
          onPress={() => onNavigate('reports')}
        />
      </Panel>

      <Text style={styles.disclaimer}>
        Demonstration data only. No records are saved to a server.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 14,
  },
  hero: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 23,
    gap: 10,
  },
  eyebrow: {
    color: '#D7E2F0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '800',
  },
  heroDescription: {
    color: '#E2ECE4',
    fontSize: 15,
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 104,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    gap: 5,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
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
  disclaimer: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 4,
  },
});