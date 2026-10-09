import { useState, useEffect } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as SMS from 'expo-sms';

import ActionButton from '../components/ActionButton';
import Panel from '../components/Panel';
import { COLORS } from '../constants/colors';
import { ApiService, getHubUrl } from '../services/api';
import type { SupplyAlertItem } from '../types';

type Props = {
  onBack: () => void;
};

export default function ReportsScreen({ onBack }: Props) {
  const [alerts, setAlerts] = useState<SupplyAlertItem[]>([]);
  const [approvedAlerts, setApprovedAlerts] = useState<Record<string, boolean>>({});
  const [smsData, setSmsData] = useState<{ sms_body: string; char_count: number }>({
    sms_body: '',
    char_count: 0,
  });
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('Hub Connected');
  const [syncing, setSyncing] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      const alertItems = await ApiService.getSupplyAlerts();
      setAlerts(alertItems);
      const report = await ApiService.getSmsReport('Evacuation Center A');
      setSmsData(report);
      setOfflineCount(ApiService.getOfflineQueueCount());
    }

    loadData();
  }, []);

  async function handleApproveResupply(item: SupplyAlertItem) {
    const res = await ApiService.requestResupply(item.id);
    setApprovedAlerts((prev) => ({ ...prev, [item.id]: true }));
    Alert.alert('Resupply Request Approved', res.message);
  }

  async function handleSendSms() {
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        await SMS.sendSMSAsync(
          ['+639171234567'], // MDRRMO Command Center hotline
          smsData.sms_body
        );
      } else {
        Alert.alert(
          'Text Ulat (SMS Ready)',
          `SMS app not directly available on this environment.\n\nPre-packed Text (160 chars):\n"${smsData.sms_body}"\n\nRecipient: MDRRMO Command Center`
        );
      }
    } catch {
      Alert.alert(
        'Text Ulat (SMS Ready)',
        `Pre-packed Text (160 chars):\n"${smsData.sms_body}"\n\nRecipient: MDRRMO Command Center`
      );
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await ApiService.syncOfflineData();
      setSyncStatusMsg(res.message);
      setOfflineCount(ApiService.getOfflineQueueCount());
      Alert.alert(
        res.success ? 'Sync Successful' : 'Sync Notice',
        res.message
      );
    } finally {
      setSyncing(false);
    }
  }

  function handleOpenPdf() {
    const pdfUrl = `${getHubUrl()}/api/reports/pdf`;
    if (Platform.OS === 'web') {
      window.open(pdfUrl, '_blank');
    } else {
      Linking.openURL(pdfUrl).catch(() => {
        Alert.alert(
          'PDF Report',
          `Connect to hub laptop browser to download report: ${pdfUrl}`
        );
      });
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.intro}>
        Tala Abiso predictive supply warnings, 160-character Text Ulat SMS for
        MDRRMO, and Pasa local hotspot synchronization.
      </Text>

      {/* 1. Abiso Supply Alerts */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Abiso: Supply Runout Alerts</Text>
        <View style={styles.alertBadge}>
          <Text style={styles.alertBadgeText}>{alerts.length} PREDICTED</Text>
        </View>
      </View>

      {alerts.map((item) => (
        <Panel key={item.id}>
          <View style={styles.supplyRow}>
            <View>
              <Text style={styles.panelTitle}>{item.name}</Text>
              <Text style={styles.body}>{item.quantity}</Text>
            </View>
            <View style={styles.statusCol}>
              <Text
                style={[
                  styles.warningText,
                  item.urgency === 'urgent' && styles.urgentText,
                ]}
              >
                {item.status}
              </Text>
              <Text style={styles.runoutHours}>
                Exhausts in ~{item.runout_hours} hrs
              </Text>
            </View>
          </View>

          <View style={styles.draftBox}>
            <Text style={styles.draftLabel}>TALA AI DRAFTED RESUPPLY REQUEST:</Text>
            <Text style={styles.draftText}>{item.draft_request}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => handleApproveResupply(item)}
            style={[
              styles.btnApprove,
              approvedAlerts[item.id] && styles.btnApproved,
            ]}
          >
            <Text style={styles.btnApproveText}>
              {approvedAlerts[item.id]
                ? '✓ Resupply Approved & Queued'
                : `Approve Resupply Request for ${item.name}`}
            </Text>
          </Pressable>
        </Panel>
      ))}

      {/* 2. Text Ulat (SMS Report) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Text Ulat · 160-Char SMS</Text>
        <Text style={styles.charCountPill}>
          {smsData.char_count} / 160 chars
        </Text>
      </View>

      <Panel>
        <Text style={styles.panelTitle}>Packed Disaster SMS Report</Text>
        <Text style={styles.body}>
          Standard 2G cellular SMS works when typhoon knocks out 4G/5G and fiber
          internet. Tala compresses the full status into 1 message.
        </Text>

        <Text style={styles.smsPreview}>{smsData.sms_body}</Text>

        <ActionButton
          title="📩 Send Text Ulat to MDRRMO via SMS"
          onPress={handleSendSms}
        />
      </Panel>

      {/* 3. Printable PDF Report */}
      <Text style={styles.sectionTitle}>Official Evacuation Report</Text>
      <Panel>
        <Text style={styles.panelTitle}>Printable PDF (ReportLab)</Text>
        <Text style={styles.body}>
          Download full roster of registered households, demographic breakdown,
          and inventory logs for local government archives.
        </Text>
        <ActionButton
          title="📄 Download Official PDF Report"
          secondary
          onPress={handleOpenPdf}
        />
      </Panel>

      {/* 4. Pasa (Synchronization) */}
      <Text style={styles.sectionTitle}>Pasa · Hotspot Synchronization</Text>
      <Panel>
        <Text style={styles.panelTitle}>Phone ↔ Laptop Sync</Text>
        <Text style={styles.body}>
          Connect phones and laptop to local Wi-Fi hotspot with mobile data OFF.
          {offlineCount > 0
            ? ` ${offlineCount} offline household records waiting to sync.`
            : ' All local household records are synchronized.'}
        </Text>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{syncStatusMsg.toUpperCase()}</Text>
        </View>

        <ActionButton
          title={syncing ? 'Synchronizing records...' : 'Sync records with Hub Laptop'}
          secondary
          onPress={handleSync}
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
  alertBadge: {
    backgroundColor: COLORS.paleOrange,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  alertBadgeText: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '800',
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  statusCol: {
    alignItems: 'flex-end',
  },
  warningText: {
    color: COLORS.warning,
    fontSize: 13,
    fontWeight: '800',
  },
  urgentText: {
    color: '#D32F2F',
  },
  runoutHours: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '700',
    marginTop: 2,
  },
  draftBox: {
    backgroundColor: COLORS.paleGray,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    gap: 4,
  },
  draftLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.muted,
    letterSpacing: 0.8,
  },
  draftText: {
    fontSize: 12,
    color: COLORS.dark,
    lineHeight: 18,
  },
  btnApprove: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  btnApproved: {
    backgroundColor: '#2E7D32',
  },
  btnApproveText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  charCountPill: {
    backgroundColor: COLORS.paleGreen,
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  smsPreview: {
    backgroundColor: COLORS.paleGray,
    borderRadius: 12,
    padding: 14,
    color: COLORS.dark,
    fontSize: 14,
    lineHeight: 23,
    fontWeight: '600',
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: COLORS.border,
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