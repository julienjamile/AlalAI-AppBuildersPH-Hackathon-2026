import { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import ActionButton from '../components/ActionButton';
import Panel from '../components/Panel';
import { COLORS } from '../constants/colors';
import { ApiService } from '../services/api';
import type { DashboardStatsData, Screen } from '../types';

type Props = {
  onNavigate: (screen: Screen) => void;
  selectedCenter: string;
  onChangeCenter: () => void;
};

export default function DashboardScreen({
  onNavigate,
  selectedCenter,
  onChangeCenter,
}: Props) {
  const [stats, setStats] = useState<DashboardStatsData>({
    total_families: 0,
    total_individuals: 0,
    pending_reviews: 0,
    low_stock_items: 0,
    active_evacuation_centers: 0,
    recent_registrations: [],
  });

  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanQrInput, setScanQrInput] = useState('');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    already_claimed?: boolean;
  } | null>(null);

  useEffect(() => {
    let active = true;

    ApiService.getDashboardStats().then((data) => {
      if (active) {
        setStats(data);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  async function loadStats() {
    setLoading(true);

    try {
      const data = await ApiService.getDashboardStats();
      setStats(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyScan() {
    if (!scanQrInput.trim()) return;

    const res = await ApiService.scanReliefCard(scanQrInput.trim());
    setScanResult(res);
  }

  return (
    <View style={styles.screen}>
      {/* Active Evacuation Center */}
      <Panel>
        <Text style={styles.centerLabel}>
          ACTIVE EVACUATION CENTER
        </Text>

        <Text style={styles.centerName}>
          {selectedCenter}
        </Text>

        <ActionButton
          title="Change Center"
          secondary
          onPress={onChangeCenter}
        />
      </Panel>

      <View style={styles.hero}>
        <View style={styles.heroTop}>
<<<<<<< HEAD
          <Text style={styles.eyebrow}>CAMP STATUS · TAGA-ALALAI HUB</Text>
=======
          <Text style={styles.eyebrow}>
            CAMP STATUS · TALA HUB
          </Text>

>>>>>>> b74fea0f23df26d28db32635e9ca364854faa8f1
          <Pressable
            accessibilityRole="button"
            onPress={loadStats}
            style={styles.refreshBtn}
          >
            <Text style={styles.refreshBtnText}>
              {loading ? 'Refreshing...' : '↻ Refresh'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.heroTitle}>
          Relief Center Overview
        </Text>

        <Text style={styles.heroDescription}>
          Real-time household counts, predictive supply alerts, and zero-internet
          synchronization powered by Taga-alalAI Local AI.
        </Text>

        <ActionButton
          title="＋ Register a family"
          onPress={() => onNavigate('intake')}
        />
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {stats.total_families}
          </Text>
          <Text style={styles.statLabel}>
            Families registered
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {stats.total_individuals}
          </Text>
          <Text style={styles.statLabel}>
            Individuals recorded
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.warning }]}>
            {stats.pending_reviews}
          </Text>
          <Text style={styles.statLabel}>
            Pending reviews
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.warning }]}>
            {stats.low_stock_items}
          </Text>
          <Text style={styles.statLabel}>
            Low-stock alerts
          </Text>
        </View>
      </View>

      {/* Relief Line QR Scanner Action */}
      <Panel>
        <View style={styles.reliefHeader}>
<<<<<<< HEAD
          <Text style={styles.panelTitle}>Kard AlalAI Relief Line</Text>
=======
          <Text style={styles.panelTitle}>
            Kard Silong Relief Line
          </Text>

>>>>>>> b74fea0f23df26d28db32635e9ca364854faa8f1
          <View style={styles.tagLive}>
            <Text style={styles.tagLiveText}>
              ANTI-FRAUD
            </Text>
          </View>
        </View>

        <Text style={styles.body}>
          Scan a family&apos;s Kard AlalAI QR code at the relief distribution line.
          Instantly catches double-claims and updates inventory.
        </Text>

        <ActionButton
          title="Scan Kard AlalAI at relief line"
          secondary
          onPress={() => {
            setScanResult(null);
            setScannerOpen(true);
          }}
        />
      </Panel>

      <Text style={styles.sectionTitle}>
        Operations
      </Text>

      <Panel>
        <Text style={styles.panelTitle}>
          Family registration (Kwento &amp; Kuha)
        </Text>

        <Text style={styles.body}>
          Record household via speech or photo, review Kilala duplicate warnings,
          and issue Kard AlalAI QR card.
        </Text>

        <ActionButton
          title="Open registration"
          onPress={() => onNavigate('intake')}
        />
      </Panel>

      <Panel>
        <Text style={styles.panelTitle}>
          Family needs (Bilang)
        </Text>

        <Text style={styles.body}>
          Automated supply rules for infants (diapers/formula), seniors, and
          medical patients (insulin coolers).
        </Text>

        <ActionButton
          title="Open needs screen"
          secondary
          onPress={() => onNavigate('needs')}
        />
      </Panel>

      <Panel>
        <Text style={styles.panelTitle}>
          Abiso &amp; Text Ulat (Reports)
        </Text>

        <Text style={styles.body}>
          Stock runout predictions, Taga-alalAI resupply request approvals, and
          160-character SMS packing for MDRRMO.
        </Text>

        <ActionButton
          title="View reports and sync"
          secondary
          onPress={() => onNavigate('reports')}
        />
      </Panel>

      {/* QR Scanner Modal */}
      <Modal
        visible={scannerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setScannerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
<<<<<<< HEAD
            <Text style={styles.modalTitle}>Kard AlalAI QR Scanner</Text>
=======
            <Text style={styles.modalTitle}>
              Kard Silong QR Scanner
            </Text>

>>>>>>> b74fea0f23df26d28db32635e9ca364854faa8f1
            <Text style={styles.modalBody}>
              Enter or scan a family&apos;s Kard AlalAI QR identifier to verify
              eligibility and prevent double distribution:
            </Text>

            <TextInput
              style={styles.qrInput}
              value={scanQrInput}
              onChangeText={setScanQrInput}
              placeholder="e.g. ALALAI-JUANDELACRUZ-001"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            {scanResult && (
              <View
                style={[
                  styles.resultBox,
                  scanResult.success
                    ? styles.resultSuccess
                    : styles.resultError,
                ]}
              >
                <Text
                  style={[
                    styles.resultTitle,
                    scanResult.success
                      ? styles.textSuccess
                      : styles.textError,
                  ]}
                >
                  {scanResult.success
                    ? '✓ VERIFIED & ISSUED'
                    : '⚠️ CLAIM DENIED'}
                </Text>

                <Text style={styles.resultDesc}>
                  {scanResult.message}
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.btnScan}
                onPress={handleVerifyScan}
              >
                <Text style={styles.btnScanText}>
                  Verify &amp; Distribute Pack
                </Text>
              </Pressable>

              <Pressable
                style={styles.btnClose}
                onPress={() => setScannerOpen(false)}
              >
                <Text style={styles.btnCloseText}>
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 14,
  },
  centerLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  centerName: {
    color: COLORS.dark,
    fontSize: 20,
    fontWeight: '800',
  },
  hero: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 23,
    gap: 12,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    color: COLORS.heroEyebrow,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  refreshBtn: {
    backgroundColor: COLORS.refreshOverlay,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '800',
  },
  heroDescription: {
    color: COLORS.heroDescription,
    fontSize: 14,
    lineHeight: 21,
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
  reliefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagLive: {
    backgroundColor: COLORS.antiFraudBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagLiveText: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '800',
  },
  body: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
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
    gap: 14,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.dark,
  },
  modalBody: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 19,
  },
  qrInput: {
    backgroundColor: COLORS.paleGray,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  scannerPresets: {
    gap: 6,
  },
  presetChip: {
    backgroundColor: COLORS.paleGreen,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  presetChipText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  resultBox: {
    padding: 14,
    borderRadius: 12,
    gap: 4,
  },
  resultSuccess: {
    backgroundColor: COLORS.lightGreen,
  },
  resultError: {
    backgroundColor: COLORS.errorBackground,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  textSuccess: {
    color: COLORS.successText,
  },
  textError: {
    color: COLORS.errorText,
  },
  resultDesc: {
    fontSize: 12,
    color: COLORS.dark,
    lineHeight: 17,
  },
  modalActions: {
    gap: 8,
    marginTop: 6,
  },
  btnScan: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnScanText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  btnClose: {
    backgroundColor: COLORS.paleGray,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnCloseText: {
    color: COLORS.dark,
    fontSize: 14,
    fontWeight: '700',
  },
});