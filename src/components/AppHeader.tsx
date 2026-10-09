
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../constants/colors';

type Props = {
  title: string;
  showBack: boolean;
  onBack: () => void;
  onHome: () => void;
};

export default function AppHeader({
  title,
  showBack,
  onBack,
  onHome,
}: Props) {
  return (
    <>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to dashboard"
          onPress={onHome}
          style={styles.brandButton}
        >
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>ins</Text>
          </View>

          <View>
            <Text style={styles.brandName}>AlalAI</Text>
            <Text style={styles.brandCaption}>RELIEF CENTER</Text>
          </View>
        </Pressable>

        <View style={styles.offlinePill}>
          <View style={styles.offlineDot} />
          <Text style={styles.offlineText}>DEMO</Text>
        </View>
      </View>

      <View style={styles.pageHeading}>
        {showBack && (
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            hitSlop={8}
          >
            <Text style={styles.backLink}>‹ Back</Text>
          </Pressable>
        )}

        <Text style={styles.pageTitle}>{title}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    minHeight: 72,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  brandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 42,
    height: 42,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: '800',
  },
  brandName: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.dark,
  },
  brandCaption: {
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.paleGreen,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
  },
  offlineDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: COLORS.warning,
  },
  offlineText: {
    color: COLORS.dark,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  pageHeading: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    gap: 8,
  },
  backLink: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 4,
  },
  pageTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.dark,
  },
});