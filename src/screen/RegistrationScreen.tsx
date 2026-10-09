
import { Pressable, StyleSheet, Text, View } from 'react-native';

import ActionButton from '../components/ActionButton';
import Field from '../components/Field';
import Panel from '../components/Panel';
import ProgressSteps from '../components/ProgressSteps';
import { COLORS } from '../constants/colors';
import type { RegistrationScreen as RegistrationPage, Screen } from '../types';

type Props = {
  screen: RegistrationPage;
  intakeType: string;
  familyName: string;
  setFamilyName: (value: string) => void;
  birthdate: string;
  setBirthdate: (value: string) => void;
  members: string;
  setMembers: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  onNavigate: (screen: Screen) => void;
  onCompleteStep: (
    step: 'confirm' | 'duplicate' | 'card',
    next: Screen
  ) => void;
  onStartRegistration: (type: string) => void;
  onResetRegistration: () => void;
};

export default function RegistrationScreen({
  screen,
  intakeType,
  familyName,
  setFamilyName,
  birthdate,
  setBirthdate,
  members,
  setMembers,
  location,
  setLocation,
  onNavigate,
  onCompleteStep,
  onStartRegistration,
  onResetRegistration,
}: Props) {
  if (screen === 'intake') {
    return (
      <View style={styles.screen}>
        <ProgressSteps currentStep="intake" />

        <Text style={styles.intro}>
          Choose how to record this household. You can review all details
          before saving.
        </Text>

        <Pressable
          accessibilityRole="button"
          style={styles.choiceCard}
          onPress={() => onStartRegistration('Kwento')}
        >
          <Text style={styles.choiceNumber}>01</Text>

          <View style={styles.choiceContent}>
            <Text style={styles.choiceTitle}>Kwento</Text>
            <Text style={styles.choiceSubtitle}>Voice intake</Text>
            <Text style={styles.body}>
              Record a conversation in Tagalog, Bisaya, or Taglish.
            </Text>
            <Text style={styles.demoTag}>SIMULATED IN THIS PROTOTYPE</Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={styles.choiceCard}
          onPress={() => onStartRegistration('Kuha')}
        >
          <Text style={styles.choiceNumber}>02</Text>

          <View style={styles.choiceContent}>
            <Text style={styles.choiceTitle}>Kuha</Text>
            <Text style={styles.choiceSubtitle}>Photo intake</Text>
            <Text style={styles.body}>
              Use a sample ID or paper form to enter family details.
            </Text>
            <Text style={styles.demoTag}>SIMULATED IN THIS PROTOTYPE</Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Panel>
          <Text style={styles.panelTitle}>What happens next?</Text>
          <Text style={styles.body}>
            The volunteer checks the information, reviews possible duplicates,
            and confirms the family's needs.
          </Text>
        </Panel>
      </View>
    );
  }

  if (screen === 'confirm') {
    const validMembers =
      members.trim() !== '' &&
      Number.isInteger(Number(members)) &&
      Number(members) >= 1;

    return (
      <View style={styles.screen}>
        <ProgressSteps currentStep="confirm" />

        <View style={styles.notice}>
          <Text style={styles.panelTitle}>{intakeType} intake</Text>
          <Text style={styles.body}>
            Review these sample details. Edit any field that needs correction.
            No information is sent to a server.
          </Text>
        </View>

        <Field
          label="Family representative"
          value={familyName}
          onChangeText={setFamilyName}
        />

        <Field
          label="Birthdate (YYYY-MM-DD)"
          value={birthdate}
          onChangeText={setBirthdate}
          placeholder="YYYY-MM-DD"
        />

        <Field
          label="Number of household members"
          value={members}
          onChangeText={setMembers}
          placeholder="Enter number"
        />

        <Field
          label="Center or location"
          value={location}
          onChangeText={setLocation}
        />

        <Panel>
          <Text style={styles.panelTitle}>Review checklist</Text>
          <Text style={styles.body}>
            Check spelling, birthdates, household size, and the assigned
            location with the family.
          </Text>
          <Text style={styles.demoTag}>EXAMPLE RECORD ONLY</Text>
        </Panel>

        <ActionButton
          title="Confirm details and continue →"
          disabled={
            !familyName.trim() ||
            !birthdate.trim() ||
            !location.trim() ||
            !validMembers
          }
          onPress={() => onCompleteStep('confirm', 'duplicate')}
        />

        <ActionButton
          title="Back"
          secondary
          onPress={() => onNavigate('intake')}
        />
      </View>
    );
  }

  if (screen === 'duplicate') {
    return (
      <View style={styles.screen}>
        <ProgressSteps currentStep="duplicate" />

        <View style={styles.notice}>
          <Text style={styles.panelTitle}>Possible matching record</Text>
          <Text style={styles.body}>
            This is a sample match to demonstrate how a volunteer would review
            a duplicate warning.
          </Text>
        </View>

        <Panel>
          <Text style={styles.eyebrow}>CURRENT REGISTRATION</Text>
          <Text style={styles.matchName}>{familyName}</Text>
          <Text style={styles.body}>Location: {location}</Text>
          <Text style={styles.body}>Household members: {members}</Text>
        </Panel>

        <Panel>
          <View style={styles.alertHeader}>
            <Text style={styles.alertSymbol}>?</Text>

            <View style={styles.matchContent}>
              <Text style={styles.panelTitle}>Possible existing record</Text>
              <Text style={styles.matchName}>Rosa D. Santos</Text>
              <Text style={styles.body}>
                Sample location: Evacuation Center B
              </Text>
              <Text style={styles.body}>
                Similarity: Needs human review
              </Text>
            </View>
          </View>
        </Panel>

        <Text style={styles.helper}>
          A similar name does not prove that two records belong to the same
          family. Review the information before deciding.
        </Text>

        <ActionButton
          title="Reviewed, continue registration →"
          onPress={() => onCompleteStep('duplicate', 'needs')}
        />

        <ActionButton
          title="Go back and edit details"
          secondary
          onPress={() => onNavigate('confirm')}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ProgressSteps currentStep="card" />

      <View style={styles.successBanner}>
        <Text style={styles.successTitle}>Review complete</Text>
        <Text style={styles.body}>
          The sample registration has reached the card preview stage.
        </Text>
      </View>

      <View style={styles.idCard}>
        <Text style={styles.cardBrand}>SILONG</Text>
        <Text style={styles.cardSubtitle}>FAMILY RELIEF CARD</Text>
        <View style={styles.cardDivider} />

        <View style={styles.qrPlaceholder}>
          {Array.from({ length: 81 }, (_, index) => {
            const row = Math.floor(index / 9);
            const col = index % 9;

            const darkCell =
              (row * 7 + col * 3 + row * col) % 5 < 2 ||
              (row < 3 && col < 3) ||
              (row < 3 && col > 5) ||
              (row > 5 && col < 3);

            return (
              <View
                key={index}
                style={[styles.qrCell, darkCell && styles.qrCellDark]}
              />
            );
          })}
        </View>

        <Text style={styles.cardName}>
          {familyName || 'Family Name'}
        </Text>

        <Text style={styles.cardInfo}>Center: {location}</Text>
        <Text style={styles.cardInfo}>
          Household size: {Math.max(1, Number(members) || 1)}
        </Text>

        <Text style={styles.cardFooter}>
          DEMONSTRATION CARD · NOT SCANNABLE
        </Text>
      </View>

      <Panel>
        <Text style={styles.panelTitle}>What happens in the full app?</Text>
        <Text style={styles.body}>
          A real implementation would generate a unique QR code linked to a
          family record. This preview uses a decorative pattern only.
        </Text>
      </Panel>

      <ActionButton
        title="Return to camp dashboard"
        onPress={() => onCompleteStep('card', 'dashboard')}
      />

      <ActionButton
        title="Register another family"
        secondary
        onPress={onResetRegistration}
      />
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
  body: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: COLORS.white,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 17,
    minHeight: 150,
  },
  choiceNumber: {
    width: 42,
    height: 42,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.lightGreen,
    color: COLORS.primary,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 15,
    fontWeight: '800',
  },
  choiceContent: {
    flex: 1,
    gap: 6,
  },
  choiceTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.dark,
  },
  choiceSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  chevron: {
    fontSize: 28,
    color: COLORS.primary,
    paddingTop: 4,
  },
  demoTag: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 4,
  },
  panelTitle: {
    color: COLORS.dark,
    fontSize: 17,
    fontWeight: '800',
  },
  notice: {
    backgroundColor: COLORS.lightGreen,
    borderRadius: 14,
    padding: 16,
    gap: 7,
  },
  eyebrow: {
    color: '#718778',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  matchName: {
    color: COLORS.dark,
    fontSize: 19,
    fontWeight: '800',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  alertSymbol: {
    width: 34,
    height: 34,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: COLORS.paleOrange,
    color: COLORS.warning,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 21,
    fontWeight: '800',
  },
  matchContent: {
    flex: 1,
    gap: 6,
  },
  helper: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  successBanner: {
    backgroundColor: COLORS.lightGreen,
    padding: 17,
    borderRadius: 15,
    gap: 6,
  },
  successTitle: {
    color: COLORS.dark,
    fontSize: 19,
    fontWeight: '800',
  },
  idCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 10,
  },
  cardBrand: {
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 3,
    color: COLORS.primary,
  },
  cardSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: COLORS.muted,
  },
  cardDivider: {
    height: 1,
    width: '100%',
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  qrPlaceholder: {
    width: 153,
    height: 153,
    padding: 7,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  qrCell: {
    width: '11.111%',
    height: '11.111%',
    backgroundColor: COLORS.white,
  },
  qrCellDark: {
    backgroundColor: COLORS.qrDark,
  },
  cardName: {
    color: COLORS.dark,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  cardInfo: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  cardFooter: {
    color: COLORS.warning,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 6,
  },
});