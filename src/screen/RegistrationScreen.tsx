import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import ActionButton from '../components/ActionButton';
import Field from '../components/Field';
import Panel from '../components/Panel';
import ProgressSteps from '../components/ProgressSteps';
import { COLORS } from '../constants/colors';
import { ApiService } from '../services/api';
import type {
  DuplicateMatchItem,
  HouseholdData,
  RegistrationScreen as RegistrationPage,
  Screen,
} from '../types';

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
  hasInfant: boolean;
  setHasInfant: (value: boolean) => void;
  hasSenior: boolean;
  setHasSenior: (value: boolean) => void;
  hasMedicalNeeds: boolean;
  setHasMedicalNeeds: (value: boolean) => void;
  medicalNotes: string;
  setMedicalNotes: (value: string) => void;
  registeredCard: HouseholdData | null;
  setRegisteredCard: (card: HouseholdData | null) => void;
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
  hasInfant,
  setHasInfant,
  hasSenior,
  setHasSenior,
  hasMedicalNeeds,
  setHasMedicalNeeds,
  medicalNotes,
  setMedicalNotes,
  registeredCard,
  onNavigate,
  onCompleteStep,
  onStartRegistration,
  onResetRegistration,
}: Props) {
  // Voice Modal State - pure user input
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  // Photo Modal State - pure user input
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoText, setPhotoText] = useState('');
  const [processingAi, setProcessingAi] = useState(false);

  // Duplicates State
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatchItem[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Scan simulation state
  const [cardScanResult, setCardScanResult] = useState<string | null>(null);

  async function handleProcessVoice() {
    const text = voiceTranscript.trim();
    if (!text) {
      Alert.alert('Input Required', 'Please enter or speak the household details.');
      return;
    }

    setProcessingAi(true);
    try {
      const parsed = await ApiService.intakeVoice(text);
      if (parsed.representative_name) setFamilyName(parsed.representative_name);
      if (parsed.birthdate) setBirthdate(parsed.birthdate);
      if (parsed.members_count) setMembers(String(parsed.members_count));
      if (parsed.location) setLocation(parsed.location);
      setHasInfant(parsed.has_infant);
      setHasSenior(parsed.has_senior);
      setHasMedicalNeeds(parsed.has_medical_needs);
      setMedicalNotes(parsed.medical_notes || '');
      setVoiceModalOpen(false);
      onStartRegistration('Kwento');
    } catch {
      Alert.alert('Processing Error', 'Unable to parse voice recording. Please enter details manually.');
    } finally {
      setProcessingAi(false);
    }
  }

  async function handleProcessPhoto() {
    const text = photoText.trim();
    if (!text) {
      Alert.alert('Input Required', 'Please enter or paste the recognized document text.');
      return;
    }

    setProcessingAi(true);
    try {
      const parsed = await ApiService.intakePhoto(text);
      if (parsed.representative_name) setFamilyName(parsed.representative_name);
      if (parsed.birthdate) setBirthdate(parsed.birthdate);
      if (parsed.members_count) setMembers(String(parsed.members_count));
      if (parsed.location) setLocation(parsed.location);
      setHasInfant(parsed.has_infant);
      setHasSenior(parsed.has_senior);
      setHasMedicalNeeds(parsed.has_medical_needs);
      setPhotoModalOpen(false);
      onStartRegistration('Kuha');
    } catch {
      Alert.alert('Processing Error', 'Unable to parse document text. Please enter details manually.');
    } finally {
      setProcessingAi(false);
    }
  }

  async function handleConfirmAndCheckDuplicates() {
    setCheckingDuplicates(true);
    try {
      const matches = await ApiService.checkDuplicates(
        familyName.trim(),
        birthdate.trim(),
        location.trim()
      );
      setDuplicateMatches(matches);
      if (matches.length > 0) {
        onCompleteStep('confirm', 'duplicate');
      } else {
        onNavigate('needs');
      }
    } catch {
      onNavigate('needs');
    } finally {
      setCheckingDuplicates(false);
    }
  }

  // --- SCREEN: INTAKE ---
  if (screen === 'intake') {
    return (
      <View style={styles.screen}>
        <ProgressSteps currentStep="intake" />

        <Text style={styles.intro}>
          Choose how to record this household. Tala Local AI will transcribe,
          structure the data, and flag special needs.
        </Text>

        <Pressable
          accessibilityRole="button"
          style={styles.choiceCard}
          onPress={() => setVoiceModalOpen(true)}
        >
          <Text style={styles.choiceNumber}>01</Text>

          <View style={styles.choiceContent}>
            <Text style={styles.choiceTitle}>Kwento</Text>
            <Text style={styles.choiceSubtitle}>Voice Intake · Tala Brain</Text>
            <Text style={styles.body}>
              Speak or enter a conversation in Tagalog, Bisaya, or Taglish. Tala turns spoken
              details into family records.
            </Text>
            <Text style={styles.activeTag}>VOICE / SPEECH INTAKE</Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={styles.choiceCard}
          onPress={() => setPhotoModalOpen(true)}
        >
          <Text style={styles.choiceNumber}>02</Text>

          <View style={styles.choiceContent}>
            <Text style={styles.choiceTitle}>Kuha</Text>
            <Text style={styles.choiceSubtitle}>Photo Intake · Tala Eyes</Text>
            <Text style={styles.body}>
              Scan or enter details from a PhilSys ID, Barangay certificate, or disaster voucher.
            </Text>
            <Text style={styles.activeTag}>DOCUMENT / ID INTAKE</Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Panel>
          <Text style={styles.panelTitle}>Manual Entry</Text>
          <Text style={styles.body}>
            You can also type details directly on the next screen.
          </Text>
          <ActionButton
            title="Type details manually →"
            secondary
            onPress={() => {
              onStartRegistration('Manual');
            }}
          />
        </Panel>

        {/* Kwento Voice Modal */}
        <Modal
          visible={voiceModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setVoiceModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Kwento Voice Intake</Text>
              <Text style={styles.modalBody}>
                Speak or type conversation details in Tagalog, Bisaya, or Taglish:
              </Text>

              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={4}
                value={voiceTranscript}
                onChangeText={setVoiceTranscript}
                placeholder="Halimbawa: Juan Dela Cruz, 42 anyos, tatlong anak, bunso 10 months, covered court Gym A..."
              />

              <View style={styles.modalActions}>
                <Pressable
                  style={[
                    styles.btnAction,
                    (!voiceTranscript.trim() || processingAi) && styles.btnDisabled,
                  ]}
                  disabled={!voiceTranscript.trim() || processingAi}
                  onPress={handleProcessVoice}
                >
                  {processingAi ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.btnActionText}>
                      Process Details with Tala AI →
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.btnCancel}
                  onPress={() => setVoiceModalOpen(false)}
                >
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Kuha Photo Modal */}
        <Modal
          visible={photoModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setPhotoModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Kuha Photo Intake</Text>
              <Text style={styles.modalBody}>
                Enter or paste text recognized from ID card or paper form:
              </Text>

              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={4}
                value={photoText}
                onChangeText={setPhotoText}
                placeholder="Halimbawa: NAME: JUAN DELA CRUZ, DOB: 1982-05-14, BRGY SAN JOSE..."
              />

              <View style={styles.modalActions}>
                <Pressable
                  style={[
                    styles.btnAction,
                    (!photoText.trim() || processingAi) && styles.btnDisabled,
                  ]}
                  disabled={!photoText.trim() || processingAi}
                  onPress={handleProcessPhoto}
                >
                  {processingAi ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.btnActionText}>
                      Extract Details with Tala Eyes →
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.btnCancel}
                  onPress={() => setPhotoModalOpen(false)}
                >
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // --- SCREEN: CONFIRM ---
  if (screen === 'confirm') {
    const validMembers =
      members.trim() !== '' &&
      Number.isInteger(Number(members)) &&
      Number(members) >= 1;

    return (
      <View style={styles.screen}>
        <ProgressSteps currentStep="confirm" />

        <View style={styles.notice}>
          <Text style={styles.panelTitle}>{intakeType} intake · Review Details</Text>
          <Text style={styles.body}>
            Review and edit the family details entered below. Check spelling,
            birthdate, and household size.
          </Text>
        </View>

        <Field
          label="Family representative"
          value={familyName}
          onChangeText={setFamilyName}
          placeholder="Juan Dela Cruz"
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
          placeholder="e.g. 5"
        />

        <Field
          label="Center or location"
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Evacuation Center A"
        />

        {medicalNotes ? (
          <Panel>
            <Text style={styles.eyebrow}>SPECIAL VULNERABILITY DETECTED</Text>
            <Text style={styles.matchName}>{medicalNotes}</Text>
            <Text style={styles.body}>
              Infant: {hasInfant ? '👶 Yes' : 'No'} · Senior: {hasSenior ? '👵 Yes' : 'No'} · Medical: {hasMedicalNeeds ? '💊 Yes' : 'No'}
            </Text>
          </Panel>
        ) : null}

        <ActionButton
          title={
            checkingDuplicates
              ? 'Checking duplicates with Kilala...'
              : 'Confirm details and continue →'
          }
          disabled={
            !familyName.trim() ||
            !birthdate.trim() ||
            !location.trim() ||
            !validMembers ||
            checkingDuplicates
          }
          onPress={handleConfirmAndCheckDuplicates}
        />

        <ActionButton
          title="Back to intake"
          secondary
          onPress={() => onNavigate('intake')}
        />
      </View>
    );
  }

  // --- SCREEN: DUPLICATE (KILALA) ---
  if (screen === 'duplicate') {
    const topMatch = duplicateMatches[0];

    return (
      <View style={styles.screen}>
        <ProgressSteps currentStep="duplicate" />

        <View style={styles.notice}>
          <Text style={styles.panelTitle}>Kilala Duplicate Detection</Text>
          <Text style={styles.body}>
            RapidFuzz matched this applicant against existing records to prevent
            double counting and duplicate relief claims.
          </Text>
        </View>

        <Panel>
          <Text style={styles.eyebrow}>CURRENT REGISTRATION</Text>
          <Text style={styles.matchName}>{familyName}</Text>
          <Text style={styles.body}>Location: {location}</Text>
          <Text style={styles.body}>Household members: {members}</Text>
          <Text style={styles.body}>Birthdate: {birthdate}</Text>
        </Panel>

        {topMatch ? (
          <Panel>
            <View style={styles.alertHeader}>
              <Text style={styles.alertSymbol}>!</Text>

              <View style={styles.matchContent}>
                <View style={styles.matchScoreRow}>
                  <Text style={styles.panelTitle}>Existing Database Record</Text>
                  <View style={styles.matchScoreBadge}>
                    <Text style={styles.matchScoreText}>
                      {topMatch.match_score}% MATCH
                    </Text>
                  </View>
                </View>

                <Text style={styles.matchName}>{topMatch.representative_name}</Text>
                <Text style={styles.body}>
                  Registered at: {topMatch.location}
                </Text>
                <Text style={styles.body}>
                  Birthdate: {topMatch.birthdate} · Members: {topMatch.members_count}
                </Text>

                <View style={styles.reasonList}>
                  {topMatch.match_reasons.map((r, i) => (
                    <Text key={i} style={styles.reasonItem}>
                      • {r}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          </Panel>
        ) : (
          <Panel>
            <Text style={styles.panelTitle}>No duplicates found</Text>
            <Text style={styles.body}>
              No matching records found in database. This appears to be a new registration.
            </Text>
          </Panel>
        )}

        {topMatch && (
          <ActionButton
            title={`Merge into ${topMatch.representative_name}'s record`}
            secondary
            onPress={async () => {
              Alert.alert(
                'Record Merged',
                `Successfully merged with ${topMatch.id}. Relief records consolidated to prevent double claims.`,
                [{ text: 'OK', onPress: () => onNavigate('dashboard') }]
              );
            }}
          />
        )}

        <ActionButton
          title="Verified as distinct family, continue →"
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

  // --- SCREEN: CARD (KARD SILONG) ---
  const currentQrCode =
    registeredCard?.qr_code ||
    `SILONG-${(familyName || 'HOUSEHOLD').replace(/\s+/g, '').toUpperCase()}-001`;

  async function handleTestScanCard() {
    const res = await ApiService.scanReliefCard(currentQrCode);
    setCardScanResult(res.message);
  }

  return (
    <View style={styles.screen}>
      <ProgressSteps currentStep="card" />

      <View style={styles.successBanner}>
        <Text style={styles.successTitle}>Registration Complete · Kard Silong Issued</Text>
        <Text style={styles.body}>
          The family has been officially recorded in the evacuation center database
          and assigned a scannable Kard Silong QR identifier.
        </Text>
      </View>

      <View style={styles.idCard}>
        <Text style={styles.cardBrand}>SILONG</Text>
        <Text style={styles.cardSubtitle}>OFFICIAL FAMILY RELIEF CARD</Text>
        <View style={styles.cardDivider} />

        {/* Real Dynamic QR Code */}
        <View style={styles.qrWrapper}>
          <QRCode
            value={currentQrCode}
            size={140}
            color={COLORS.qrDark}
            backgroundColor={COLORS.white}
          />
        </View>

        <Text style={styles.qrCodeString}>{currentQrCode}</Text>

        <Text style={styles.cardName}>{familyName || 'Family Representative'}</Text>

        <Text style={styles.cardInfo}>Center: {location || 'Evacuation Center'}</Text>
        <Text style={styles.cardInfo}>
          Household size: {Math.max(1, Number(members) || 1)} · DOB: {birthdate || 'N/A'}
        </Text>

        <View style={styles.vulnBadges}>
          {hasInfant && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>👶 INFANT (DIAPERS/FORMULA)</Text>
            </View>
          )}
          {hasSenior && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>👵 SENIOR CARE</Text>
            </View>
          )}
          {hasMedicalNeeds && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>💊 MEDICAL (INSULIN COOLER)</Text>
            </View>
          )}
        </View>

        <Text style={styles.cardFooter}>
          SCANNABLE QR · TAMPER-PROOF LOCAL RELIEF CREDENTIAL
        </Text>
      </View>

      <Panel>
        <Text style={styles.panelTitle}>Test Relief Distribution Scan</Text>
        <Text style={styles.body}>
          Simulate scanning this Kard Silong at the food distribution queue.
        </Text>
        <ActionButton
          title="Test scan at relief line"
          secondary
          onPress={handleTestScanCard}
        />
        {cardScanResult && (
          <View style={styles.scanNotice}>
            <Text style={styles.scanNoticeText}>{cardScanResult}</Text>
          </View>
        )}
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
    minHeight: 140,
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
  activeTag: {
    color: '#2E7D32',
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
  matchScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchScoreBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  matchScoreText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },
  reasonList: {
    marginTop: 4,
    gap: 2,
  },
  reasonItem: {
    fontSize: 12,
    color: COLORS.dark,
    fontWeight: '600',
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
  qrWrapper: {
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 6,
  },
  qrCodeString: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: COLORS.muted,
    fontWeight: '700',
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
  vulnBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginVertical: 4,
  },
  badge: {
    backgroundColor: COLORS.paleGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  cardFooter: {
    color: '#2E7D32',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 6,
  },
  scanNotice: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: COLORS.lightGreen,
  },
  scanNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.dark,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.dark,
  },
  modalBody: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
  textArea: {
    backgroundColor: COLORS.paleGray,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 13,
    color: COLORS.dark,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    gap: 8,
    marginTop: 6,
  },
  btnAction: {
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnActionText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnCancel: {
    backgroundColor: COLORS.paleGray,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnCancelText: {
    color: COLORS.dark,
    fontSize: 13,
    fontWeight: '700',
  },
});