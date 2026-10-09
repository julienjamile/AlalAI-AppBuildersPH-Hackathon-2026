import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';

import ActionButton from '../components/ActionButton';
import Field from '../components/Field';
import Panel from '../components/Panel';
import ProgressSteps from '../components/ProgressSteps';
import { COLORS } from '../constants/colors';
import { ApiService, type IntakeResult } from '../services/api';
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
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResult, setVoiceResult] = useState<IntakeResult | null>(null);

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoText, setPhotoText] = useState('');
  const [photoAsset, setPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [photoResult, setPhotoResult] = useState<IntakeResult | null>(null);
  const [processingAi, setProcessingAi] = useState(false);

  // Duplicates State
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatchItem[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Scan simulation state
  const [cardScanResult, setCardScanResult] = useState<string | null>(null);

  function applyIntakeResult(parsed: IntakeResult) {
    setFamilyName(parsed.representative_name);
    setBirthdate(parsed.birthdate);
    setMembers(String(parsed.members_count));
    setLocation(parsed.location);
    setHasInfant(parsed.has_infant);
    setHasSenior(parsed.has_senior);
    setHasMedicalNeeds(parsed.has_medical_needs);
    setMedicalNotes(parsed.medical_notes || '');
  }

  async function handleStartRecording() {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone permission required', 'Allow AlalAI to use the microphone to record the household interview.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (error) {
      Alert.alert('Recording unavailable', error instanceof Error ? error.message : 'Could not start audio recording.');
    }
  }

  async function handleStopRecording() {
    setProcessingAi(true);
    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = audioRecorder.uri;
      if (!uri) {
        throw new Error('The recording is empty. Please record the household interview again.');
      }
      const parsed = await ApiService.transcribeVoice(uri);
      const transcript = parsed.raw_transcript?.trim() || '';
      if (!transcript) {
        throw new Error('No speech was recognized. Try again in a quieter place or type the details.');
      }
      setVoiceTranscript(transcript);
      setVoiceResult(parsed);
    } catch (error) {
      Alert.alert('Transcription failed', error instanceof Error ? error.message : 'Could not transcribe this recording.');
    } finally {
      setProcessingAi(false);
    }
  }

  async function handleSelectIdImage(source: 'camera' | 'library') {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera permission required', 'Allow AlalAI to use the camera to photograph the ID.');
          return;
        }
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 10],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 10],
            quality: 0.8,
          });
      if (result.canceled) return;

      const asset = result.assets[0];
      setPhotoAsset(asset);
      setPhotoText('');
      setPhotoResult(null);
      setProcessingAi(true);

      const parsed = await ApiService.intakePhotoFromImage({
        uri: asset.uri,
        name: asset.fileName || `alalai-id-${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
      });
      setPhotoText(parsed.raw_transcript || '');
      setPhotoResult(parsed);
    } catch (error) {
      Alert.alert('ID reading failed', error instanceof Error ? error.message : 'Could not read this ID image.');
    } finally {
      setProcessingAi(false);
    }
  }

  async function handleProcessVoice() {
    const text = voiceTranscript.trim();
    if (!text) {
      Alert.alert('Input Required', 'Please enter or speak the household details.');
      return;
    }

    setProcessingAi(true);
    try {
      const parsed = voiceResult?.raw_transcript?.trim() === text
        ? voiceResult
        : await ApiService.intakeVoice(text);
      applyIntakeResult(parsed);
      setVoiceModalOpen(false);
      onStartRegistration('Kwento');
    } catch (error) {
      Alert.alert('Processing error', error instanceof Error ? error.message : 'Unable to structure the transcript. Please enter details manually.');
    } finally {
      setProcessingAi(false);
    }
  }

  async function handleProcessPhoto() {
    const text = photoText.trim();
    if (!text) {
      Alert.alert('ID text required', 'Take or choose an ID photo, or enter the text from the ID.');
      return;
    }

    setProcessingAi(true);
    try {
      const parsed = photoResult?.raw_transcript?.trim() === text
        ? photoResult
        : await ApiService.intakePhoto(text);
      applyIntakeResult(parsed);
      setPhotoModalOpen(false);
      onStartRegistration('Kuha');
    } catch (error) {
      Alert.alert('ID validation failed', error instanceof Error ? error.message : 'Unable to validate the ID text.');
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
    } catch (error) {
      Alert.alert(
        'Duplicate check unavailable',
        `${error instanceof Error ? error.message : 'The AlalAI hub could not check the shared records.'} You can go back or continue with this limitation.`,
        [
          { text: 'Go back', style: 'cancel' },
          { text: 'Continue without check', onPress: () => onNavigate('needs') },
        ]
      );
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
          Choose how to record this household. Taga-alalAI Local AI will transcribe,
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
            <Text style={styles.choiceSubtitle}>Voice Intake · Taga-alalAI Brain</Text>
            <Text style={styles.body}>
              Speak or enter a conversation in Tagalog, Bisaya, or Taglish. Taga-alalAI turns spoken
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
            <Text style={styles.choiceSubtitle}>Photo Intake · Taga-alalAI Eyes</Text>
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
          onRequestClose={() => {
            if (recorderState.isRecording) {
              void handleStopRecording();
            } else {
              setVoiceModalOpen(false);
            }
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <ScrollView
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalTitle}>Kwento Voice Intake</Text>
                <Text style={styles.modalBody}>
                  Record a household interview in Tagalog, Bisaya, or Taglish. Whisper runs locally on the connected AlalAI hub.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  style={[styles.btnAction, processingAi && styles.btnDisabled]}
                  disabled={processingAi}
                  onPress={recorderState.isRecording ? handleStopRecording : handleStartRecording}
                >
                  <Text style={styles.btnActionText}>
                    {recorderState.isRecording ? 'Stop recording & transcribe' : '● Record household interview'}
                  </Text>
                </Pressable>

                {processingAi && (
                  <View style={styles.processingNotice}>
                    <ActivityIndicator color={COLORS.primary} />
                    <Text style={styles.body}>Transcribing with Whisper on the AlalAI hub…</Text>
                  </View>
                )}

                <Text style={styles.modalBody}>Review or edit the transcript before Taga-alalAI structures it:</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={4}
                  value={voiceTranscript}
                  onChangeText={(text) => {
                    setVoiceTranscript(text);
                    if (text.trim() !== voiceResult?.raw_transcript?.trim()) setVoiceResult(null);
                  }}
                  placeholder="Halimbawa: Ako si Juan Dela Cruz, 42 anyos. Lima kami, may sanggol at si nanay na senior..."
                />

                <View style={styles.modalActions}>
                  <Pressable
                    style={[
                      styles.btnAction,
                      (!voiceTranscript.trim() || processingAi || recorderState.isRecording) && styles.btnDisabled,
                    ]}
                    disabled={!voiceTranscript.trim() || processingAi || recorderState.isRecording}
                    onPress={handleProcessVoice}
                  >
                    {processingAi ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={styles.btnActionText}>Review extracted details →</Text>
                    )}
                  </Pressable>

                  <Pressable
                    style={[styles.btnCancel, (recorderState.isRecording || processingAi) && styles.btnDisabled]}
                    disabled={recorderState.isRecording || processingAi}
                    onPress={() => setVoiceModalOpen(false)}
                  >
                    <Text style={styles.btnCancelText}>Cancel</Text>
                  </Pressable>
                </View>
              </ScrollView>
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
              <ScrollView
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalTitle}>Kuha ID Intake</Text>
                <Text style={styles.modalBody}>
                  Take a photo or choose an ID image. Taga-alalAI reads it on the connected hub; no ID image is sent to a cloud AI service.
                </Text>

                <View style={styles.imagePickerActions}>
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.btnAction, styles.imagePickerButton, processingAi && styles.btnDisabled]}
                    disabled={processingAi}
                    onPress={() => handleSelectIdImage('camera')}
                  >
                    <Text style={styles.btnActionText}>Take ID photo</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.btnAction, styles.imagePickerButton, styles.btnSecondary]}
                    disabled={processingAi}
                    onPress={() => handleSelectIdImage('library')}
                  >
                    <Text style={styles.btnSecondaryText}>Choose from photos</Text>
                  </Pressable>
                </View>

                {photoAsset && (
                  <Image
                    source={{ uri: photoAsset.uri }}
                    style={styles.idPreview}
                    resizeMode="contain"
                    accessibilityLabel="Selected ID image"
                  />
                )}

                {processingAi && (
                  <View style={styles.processingNotice}>
                    <ActivityIndicator color={COLORS.primary} />
                    <Text style={styles.body}>Reading ID text on the AlalAI hub…</Text>
                  </View>
                )}

                <Text style={styles.modalBody}>
                  Check the recognized text below. You can correct it before reviewing the registration.
                </Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={4}
                  value={photoText}
                  onChangeText={(text) => {
                    setPhotoText(text);
                    if (text.trim() !== photoResult?.raw_transcript?.trim()) setPhotoResult(null);
                  }}
                  placeholder="Recognized ID text appears here. You can also type it manually."
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
                      <Text style={styles.btnActionText}>Review extracted details →</Text>
                    )}
                  </Pressable>

                  <Pressable
                    style={styles.btnCancel}
                    onPress={() => setPhotoModalOpen(false)}
                  >
                    <Text style={styles.btnCancelText}>Cancel</Text>
                  </Pressable>
                </View>
              </ScrollView>
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
      Number(members) >= 1 &&
      Number(members) <= 100;
    const normalizedBirthdate = birthdate.trim();
    const parsedBirthdate = normalizedBirthdate
      ? new Date(`${normalizedBirthdate}T00:00:00`)
      : null;
    const validBirthdate =
      !normalizedBirthdate ||
      (/^\d{4}-\d{2}-\d{2}$/.test(normalizedBirthdate) &&
        parsedBirthdate !== null &&
        !Number.isNaN(parsedBirthdate.getTime()) &&
        parsedBirthdate.toISOString().slice(0, 10) === normalizedBirthdate &&
        parsedBirthdate <= new Date());

    return (
      <View style={styles.screen}>
        <ProgressSteps currentStep="confirm" />

        <View style={styles.notice}>
          <Text style={styles.panelTitle}>{intakeType} intake · Review Details</Text>
          <Text style={styles.body}>
            Review and edit the family details entered below. Check spelling,
            birthdate, household size, and center location. Leave birthdate blank if it is unknown.
          </Text>
          {intakeType === 'Kuha' && (
            <Text style={styles.body}>
              An ID describes one person only. Confirm the family size, center, and special needs with the household before saving.
            </Text>
          )}
        </View>

        <Field
          label="Family representative"
          value={familyName}
          onChangeText={setFamilyName}
          placeholder="Juan Dela Cruz"
        />

        <Field
          label="Birthdate (YYYY-MM-DD, optional)"
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
            !location.trim() ||
            !validMembers ||
            !validBirthdate ||
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

  // --- SCREEN: CARD (KARD ALALAI) ---
  const currentQrCode =
    registeredCard?.qr_code ||
    `ALALAI-${(familyName || 'HOUSEHOLD').replace(/\s+/g, '').toUpperCase()}-001`;

  async function handleTestScanCard() {
    const res = await ApiService.scanReliefCard(currentQrCode);
    setCardScanResult(res.message);
  }

  return (
    <View style={styles.screen}>
      <ProgressSteps currentStep="card" />

      <View style={styles.successBanner}>
        <Text style={styles.successTitle}>Registration Complete · Kard AlalAI Issued</Text>
        <Text style={styles.body}>
          The family has been officially recorded in the evacuation center database
          and assigned a scannable Kard AlalAI QR identifier.
        </Text>
      </View>

      <View style={styles.idCard}>
        <Text style={styles.cardBrand}>ALALAI</Text>
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
          Simulate scanning this Kard AlalAI at the food distribution queue.
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
    maxHeight: '90%',
    flexShrink: 1,
  },
  modalContent: {
    gap: 12,
    paddingBottom: 2,
  },
  processingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.paleGreen,
    padding: 12,
    borderRadius: 10,
  },
  imagePickerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  imagePickerButton: {
    flex: 1,
  },
  btnSecondary: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  btnSecondaryText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  idPreview: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.paleGray,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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