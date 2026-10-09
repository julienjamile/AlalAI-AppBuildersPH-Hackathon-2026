import { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { COLORS } from '../constants/colors';
import { ApiService, getHubUrl, setHubUrl } from '../services/api';

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
  const [isOnline, setIsOnline] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [inputUrl, setInputUrl] = useState(getHubUrl());
  const [pingStatus, setPingStatus] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    function pollHealth() {
      ApiService.checkHealth().then((health) => {
        if (active) {
          setIsOnline(health.online);
        }
      });
    }

    pollHealth();
    const interval = setInterval(pollHealth, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  async function handlePing() {
    setPingStatus('Testing connection...');
    setHubUrl(inputUrl);
    const health = await ApiService.checkHealth();
    setIsOnline(health.online);
    if (health.online) {
      setPingStatus(`Connected to Hub (${health.households} records)!`);
    } else {
      setPingStatus('Failed to connect. Laptop hub not reachable.');
    }
  }

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
            <Text style={styles.brandMarkText}>SL</Text>
          </View>

          <View>
            <Text style={styles.brandName}>Silong</Text>
            <Text style={styles.brandCaption}>TALA LOCAL AI HUB</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setInputUrl(getHubUrl());
            setPingStatus(null);
            setShowConfig(true);
          }}
          style={[styles.offlinePill, isOnline && styles.onlinePill]}
        >
          <View style={[styles.offlineDot, isOnline && styles.onlineDot]} />
          <Text style={[styles.offlineText, isOnline && styles.onlineText]}>
            {isOnline ? 'HUB CONNECTED' : 'OFFLINE'}
          </Text>
        </Pressable>
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

      {/* Hub Config Modal */}
      <Modal
        visible={showConfig}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfig(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Hub Laptop Connection</Text>
            <Text style={styles.modalSub}>
              Connect phones to laptop over local hotspot (Zero-Internet Mode)
            </Text>

            <Text style={styles.inputLabel}>Hub Laptop Address / Port</Text>
            <TextInput
              style={styles.input}
              value={inputUrl}
              onChangeText={setInputUrl}
              placeholder="http://192.168.43.10:8000"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.presetRow}>
              <Pressable
                style={styles.presetButton}
                onPress={() => setInputUrl('http://127.0.0.1:8000')}
              >
                <Text style={styles.presetText}>Localhost</Text>
              </Pressable>
              <Pressable
                style={styles.presetButton}
                onPress={() => setInputUrl('http://10.0.2.2:8000')}
              >
                <Text style={styles.presetText}>Android Emu</Text>
              </Pressable>
            </View>

            {pingStatus && (
              <Text
                style={[
                  styles.pingResult,
                  pingStatus.includes('Connected')
                    ? styles.pingSuccess
                    : styles.pingError,
                ]}
              >
                {pingStatus}
              </Text>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.btn, styles.btnPing]}
                onPress={handlePing}
              >
                <Text style={styles.btnText}>Test Connection</Text>
              </Pressable>

              <Pressable
                style={[styles.btn, styles.btnClose]}
                onPress={() => setShowConfig(false)}
              >
                <Text style={[styles.btnText, styles.btnCloseText]}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandName: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.dark,
  },
  brandCaption: {
    fontSize: 9,
    color: COLORS.muted,
    letterSpacing: 1.2,
    marginTop: 2,
    fontWeight: '700',
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.paleOrange,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
  },
  onlinePill: {
    backgroundColor: COLORS.lightGreen,
  },
  offlineDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: COLORS.warning,
  },
  onlineDot: {
    backgroundColor: '#2E7D32',
  },
  offlineText: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  onlineText: {
    color: '#1B5E20',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 22,
    width: '100%',
    maxWidth: 400,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.dark,
  },
  modalSub: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.dark,
    marginTop: 6,
  },
  input: {
    backgroundColor: COLORS.paleGray,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.dark,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.paleGreen,
  },
  presetText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  pingResult: {
    fontSize: 13,
    fontWeight: '700',
    padding: 8,
    borderRadius: 8,
  },
  pingSuccess: {
    backgroundColor: COLORS.lightGreen,
    color: '#2E7D32',
  },
  pingError: {
    backgroundColor: '#FFEBEE',
    color: '#C62828',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPing: {
    backgroundColor: COLORS.primary,
  },
  btnClose: {
    backgroundColor: COLORS.paleGray,
  },
  btnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
  },
  btnCloseText: {
    color: COLORS.dark,
  },
});