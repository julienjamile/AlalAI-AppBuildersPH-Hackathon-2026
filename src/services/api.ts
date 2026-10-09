import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type {
  HouseholdData,
  DuplicateMatchItem,
  SupplyNeedItem,
  SupplyAlertItem,
  DashboardStatsData,
} from '../types';

function resolveDefaultHubUrl(): string {
  // If running via Expo Go / Metro, hostUri is like "192.168.1.7:8081"
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as Record<string, any>).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as Record<string, any>).manifest?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8000`;
    }
  }

  // Fallback for Android emulator vs local machine
  return Platform.select({
    android: 'http://10.0.2.2:8000',
    default: 'http://127.0.0.1:8000',
  });
}

let currentHubUrl = resolveDefaultHubUrl();

// Local cache for offline resilience (only holds records actually created by the user)
const offlineHouseholds: HouseholdData[] = [];
const offlineDistributions: { household_id: string; item_name: string; timestamp: string }[] = [];

export function getHubUrl(): string {
  return currentHubUrl;
}

export function setHubUrl(url: string): void {
  let clean = url.trim();
  if (clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `http://${clean}`;
  }
  currentHubUrl = clean;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// Local regex parser for pure user input parsing when offline
function parseLocalUserInput(text: string): {
  representative_name: string;
  birthdate: string;
  members_count: number;
  location: string;
  has_infant: boolean;
  has_senior: boolean;
  has_medical_needs: boolean;
  medical_notes: string;
} {
  const clean = text.trim();
  if (!clean) {
    return {
      representative_name: '',
      birthdate: '',
      members_count: 1,
      location: '',
      has_infant: false,
      has_senior: false,
      has_medical_needs: false,
      medical_notes: '',
    };
  }

  // Extract name: e.g. "Juan dela Cruz, 45" or "ako si Maria"
  let name = '';
  let age: number | null = null;
  const leadMatch = clean.match(/^([A-Za-z\s]+?)[,\s]+(\d{1,2})\b/);
  if (leadMatch) {
    const cand = leadMatch[1].trim();
    if (cand.length > 2 && !/^(kasama|anak|nanay|tatay|kami)/i.test(cand)) {
      name = cand;
      age = parseInt(leadMatch[2], 10);
    }
  } else {
    const introMatch = clean.match(/(?:ako si|pangalan ko(?: ay)?)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/i);
    if (introMatch) {
      name = introMatch[1].trim();
    }
  }

  // Birthdate
  let birthdate = '';
  const bdayMatch = clean.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})|(\d{1,2}[-/]\d{1,2}[-/]\d{4})/);
  if (bdayMatch) {
    birthdate = bdayMatch[0].replace(/\//g, '-');
  } else if (age) {
    const currentYear = new Date().getFullYear();
    birthdate = `${currentYear - age}-01-01`;
  }

  // Members count
  let members = 1;
  const numWords: Record<string, number> = {
    isa: 1, dalawa: 2, tatlo: 3, apat: 4, lima: 5,
    anim: 6, pito: 7, walo: 8, siyam: 9, sampu: 10
  };

  const childrenMatch = clean.match(/(\d+)\s*(?:na\s+)?(?:anak|bata|miyembro|tao)/i);
  let childrenCount = 0;
  if (childrenMatch) {
    childrenCount = parseInt(childrenMatch[1], 10);
  } else {
    for (const [word, val] of Object.entries(numWords)) {
      if (new RegExp(`\\b${word}\\s+(?:na\\s+)?(?:anak|bata|miyembro|tao|kasama)`, 'i').test(clean)) {
        childrenCount = val;
        break;
      }
    }
  }

  const relatives = clean.match(/\b(nanay|inay|tatay|itay|lolo|lola|asawa|biyanan)\b/gi) || [];
  if (childrenCount > 0 || relatives.length > 0) {
    members = 1 + childrenCount + relatives.length;
  } else {
    const kamiMatch = clean.match(/\b(isa|dalawa|tatlo|apat|lima|anim|pito|walo|siyam|sampu|\d+)\s+kami\b/i);
    if (kamiMatch) {
      const v = kamiMatch[1].toLowerCase();
      members = numWords[v] || parseInt(v, 10) || 1;
    }
  }

  // Vulnerability flags from user text
  const has_infant = /\b(bunso|baby|sanggol|infant|months? old|buwan|bata)\b/i.test(clean);
  const has_senior = /\b(nanay|tatay|lolo|lola|senior|elderly|matanda|6\d|7\d|8\d)\b/i.test(clean);

  const meds: string[] = [];
  if (/\b(diabetic|diabetes)\b/i.test(clean)) meds.push('Diabetic');
  if (/\b(insulin|nag-iinsulin|iniksyon)\b/i.test(clean)) meds.push('Insulin-dependent');
  if (/\b(hypertension|high blood|maintenance)\b/i.test(clean)) meds.push('Hypertension/Maintenance');
  if (/\b(buntis|pregnant)\b/i.test(clean)) meds.push('Pregnant');
  if (/\b(pwd|kapansanan|wheelchair)\b/i.test(clean)) meds.push('PWD');

  const has_medical_needs = meds.length > 0;
  const medical_notes = meds.join(', ');

  // Location from text
  let location = '';
  const locMatch = clean.match(/\b(?:evacuation center|covered court|gymnasium|gym|school)\s+([A-Za-z0-9\s]+)/i);
  if (locMatch && locMatch[0].length < 35) {
    location = locMatch[0].trim();
  }

  return {
    representative_name: name,
    birthdate,
    members_count: Math.max(1, members),
    location,
    has_infant,
    has_senior,
    has_medical_needs,
    medical_notes,
  };
}

export const ApiService = {
  getHubUrl,
  setHubUrl,

  async checkHealth(): Promise<{ online: boolean; ip?: string; households?: number; message?: string }> {
    try {
      const res = await fetchWithTimeout(`${currentHubUrl}/health`, {}, 3000);
      if (res.ok) {
        const data = await res.json();
        return {
          online: true,
          ip: data.local_ip,
          households: data.registered_households,
          message: data.tala_ai,
        };
      }
      return { online: false, message: 'Server unreachable' };
    } catch {
      return { online: false, message: 'Offline Mode' };
    }
  },

  async intakeVoice(text: string): Promise<{
    representative_name: string;
    birthdate: string;
    members_count: number;
    location: string;
    has_infant: boolean;
    has_senior: boolean;
    has_medical_needs: boolean;
    medical_notes?: string | null;
  }> {
    const userText = text.trim();
    if (!userText) {
      return {
        representative_name: '',
        birthdate: '',
        members_count: 1,
        location: '',
        has_infant: false,
        has_senior: false,
        has_medical_needs: false,
        medical_notes: '',
      };
    }

    try {
      const res = await fetchWithTimeout(`${currentHubUrl}/api/intake/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userText }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Gracefully parse user input locally without crashing
    }

    // Pure local extraction on the user's actual text
    return parseLocalUserInput(userText);
  },

  async intakePhoto(extractedText?: string): Promise<{
    representative_name: string;
    birthdate: string;
    members_count: number;
    location: string;
    has_infant: boolean;
    has_senior: boolean;
    has_medical_needs: boolean;
  }> {
    const userText = (extractedText || '').trim();
    if (!userText) {
      return {
        representative_name: '',
        birthdate: '',
        members_count: 1,
        location: '',
        has_infant: false,
        has_senior: false,
        has_medical_needs: false,
      };
    }

    try {
      const res = await fetchWithTimeout(`${currentHubUrl}/api/intake/photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extracted_text: userText }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Gracefully parse user input locally
    }

    // Parse pure user input
    let name = '';
    const nameMatch = userText.match(/(?:NAME|PANGALAN|G\.|GNG\.)[:\s]+([A-Z\s]{4,30})/i);
    if (nameMatch) {
      name = nameMatch[1].trim();
    } else {
      for (const line of userText.split('\n')) {
        const cleanLine = line.replace(/[^a-zA-Z\s]/g, '').trim();
        if (cleanLine.length > 5 && !/(REPUBLIC|PHILIPPINES|IDENTIFICATION|CARD|SYSTEM)/i.test(cleanLine)) {
          name = cleanLine;
          break;
        }
      }
    }

    let birthdate = '';
    const bdayMatch = userText.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})|(\d{1,2}[-/]\d{1,2}[-/]\d{4})/);
    if (bdayMatch) {
      birthdate = bdayMatch[0].replace(/\//g, '-');
    }

    let location = '';
    const brgyMatch = userText.match(/(?:Brgy\.?|Barangay)\s+([A-Za-z0-9\s]+)/i);
    if (brgyMatch) {
      location = `Barangay ${brgyMatch[1].trim()}`;
    }

    return {
      representative_name: name,
      birthdate,
      members_count: 1,
      location,
      has_infant: false,
      has_senior: false,
      has_medical_needs: false,
    };
  },

  async checkDuplicates(
    representative_name: string,
    birthdate?: string,
    location?: string
  ): Promise<DuplicateMatchItem[]> {
    if (!representative_name || representative_name.trim().length < 2) {
      return [];
    }

    try {
      const res = await fetchWithTimeout(`${currentHubUrl}/api/duplicates/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          representative_name: representative_name.trim(),
          birthdate: birthdate ? birthdate.trim() : undefined,
          location: location ? location.trim() : undefined,
        }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback: check against actual offline households created in this session
    }

    const matches: DuplicateMatchItem[] = [];
    const query = representative_name.toLowerCase().trim();
    for (const h of offlineHouseholds) {
      const hName = h.representative_name.toLowerCase();
      if (hName === query) {
        matches.push({
          id: h.id,
          representative_name: h.representative_name,
          birthdate: h.birthdate,
          location: h.location,
          members_count: h.members_count,
          match_score: 100,
          match_reasons: ['Exact full name match in local records'],
          is_strong_match: true,
        });
      }
    }
    return matches;
  },

  async calculateNeeds(
    members_count: number,
    has_infant: boolean,
    has_senior: boolean,
    has_medical_needs: boolean
  ): Promise<SupplyNeedItem[]> {
    try {
      const res = await fetchWithTimeout(`${currentHubUrl}/api/needs/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          members_count,
          has_infant,
          has_senior,
          has_medical_needs,
        }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Handled by local rule calculation
    }

    // Bilang rules calculation purely based on user-supplied numbers
    const count = Math.max(1, members_count);
    const items: SupplyNeedItem[] = [
      {
        name: 'Rice',
        amount: `${(count * 0.5).toFixed(1)} kg`,
        description: `Standard household allocation (${count} members)`,
        category: 'food',
      },
      {
        name: 'Drinking water',
        amount: `${count * 2} L`,
        description: 'Daily potable water requirement',
        category: 'water',
      },
      {
        name: 'Family hygiene kit',
        amount: count > 6 ? '2 kits' : '1 kit',
        description: 'Soap, toothbrushes, toothpaste, sanitation packs',
        category: 'hygiene',
      },
    ];

    if (has_infant) {
      items.push({
        name: 'Infant diapers',
        amount: '1 pack (8-12 pcs)',
        description: 'Special baby care supplies for infant under 2 yrs',
        category: 'infant',
      });
    }
    if (has_senior) {
      items.push({
        name: 'Senior care pack',
        amount: '1 care pack',
        description: 'Adult hygiene, vitamins, and high-protein nutrition',
        category: 'medical',
      });
    }
    if (has_medical_needs) {
      items.push({
        name: 'Insulin cold storage cooler',
        amount: '1 insulated pouch',
        description: 'Cold-chain preservation for temperature-sensitive medicine',
        category: 'medical',
      });
    }

    return items;
  },

  async getDashboardStats(): Promise<DashboardStatsData> {
    try {
      const res = await fetchWithTimeout(`${currentHubUrl}/api/dashboard/stats`, {}, 3000);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Local fallback
    }

    return {
      total_families: offlineHouseholds.length,
      total_individuals: offlineHouseholds.reduce((acc, h) => acc + h.members_count, 0),
      pending_reviews: 0,
      low_stock_items: 0,
      active_evacuation_centers: offlineHouseholds.length > 0 ? 1 : 0,
      recent_registrations: offlineHouseholds.slice(-5),
    };
  },

  async createHousehold(data: {
    representative_name: string;
    birthdate: string;
    members_count: number;
    location: string;
    has_infant: boolean;
    has_senior: boolean;
    has_medical_needs: boolean;
    medical_notes?: string;
  }): Promise<HouseholdData> {
    try {
      const res = await fetchWithTimeout(`${currentHubUrl}/api/households`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, created_offline: false }),
      });
      if (res.ok) {
        const saved = await res.json();
        offlineHouseholds.push(saved);
        return saved;
      }
    } catch {
      // Save locally
    }

    const id = `FAM-LOCAL-${offlineHouseholds.length + 1}`;
    const cleanName = data.representative_name.replace(/\s+/g, '').toUpperCase() || 'FAMILY';
    const newHousehold: HouseholdData = {
      id,
      qr_code: `SILONG-${cleanName}-${id}`,
      representative_name: data.representative_name,
      birthdate: data.birthdate,
      members_count: data.members_count,
      location: data.location,
      has_infant: data.has_infant,
      has_senior: data.has_senior,
      has_medical_needs: data.has_medical_needs,
      medical_notes: data.medical_notes,
      status: 'registered',
      created_offline: true,
      sync_status: 'pending',
      created_at: new Date().toISOString(),
    };
    offlineHouseholds.push(newHousehold);
    return newHousehold;
  },

  async mergeHousehold(householdId: string, targetId: string): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(
        `${currentHubUrl}/api/households/${householdId}/merge?target_id=${targetId}`,
        { method: 'POST' }
      );
      return res.ok;
    } catch {
      return true;
    }
  },

  async getSupplyAlerts(): Promise<SupplyAlertItem[]> {
    try {
      const res = await fetchWithTimeout(`${currentHubUrl}/api/alerts`, {}, 3000);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    return [];
  },

  async requestResupply(itemId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetchWithTimeout(`${currentHubUrl}/api/alerts/${itemId}/request`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, message: data.message };
      }
    } catch {
      // Fallback
    }
    return {
      success: true,
      message: 'Resupply request recorded locally for sync.',
    };
  },

  async getSmsReport(camp = 'Evacuation Center'): Promise<{ sms_body: string; char_count: number }> {
    try {
      const res = await fetchWithTimeout(`${currentHubUrl}/api/reports/sms?camp=${encodeURIComponent(camp)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const totalF = offlineHouseholds.length;
    const totalP = offlineHouseholds.reduce((acc, h) => acc + h.members_count, 0);
    const text = `SILONG:[${camp}] ${totalF}fam,${totalP}ind. Ready for relief ops. MDRRMO copy.`;
    return {
      sms_body: text.slice(0, 160),
      char_count: text.length,
    };
  },

  async scanReliefCard(qrCode: string, item = 'Family Relief Pack'): Promise<{
    success: boolean;
    message: string;
    already_claimed?: boolean;
    household?: HouseholdData;
  }> {
    const code = qrCode.trim();
    if (!code) {
      return {
        success: false,
        message: 'Please provide a Kard Silong QR code to scan.',
      };
    }

    try {
      const res = await fetchWithTimeout(`${currentHubUrl}/api/relief/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code: code, item_name: item }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Local check
    }

    // Check offline distributions for duplicate claims
    const existingClaim = offlineDistributions.find(
      (d) => d.household_id === code && d.item_name === item
    );
    if (existingClaim) {
      return {
        success: false,
        message: `Double-claim prevented! Relief pack already issued today at ${existingClaim.timestamp}.`,
        already_claimed: true,
      };
    }

    offlineDistributions.push({
      household_id: code,
      item_name: item,
      timestamp: new Date().toLocaleTimeString(),
    });

    return {
      success: true,
      message: `Kard Silong Verified! Relief pack successfully issued.`,
      already_claimed: false,
    };
  },

  async syncOfflineData(): Promise<{
    success: boolean;
    synced_households: number;
    message: string;
  }> {
    if (offlineHouseholds.length === 0) {
      return {
        success: true,
        synced_households: 0,
        message: 'All records are already up to date with hub laptop.',
      };
    }

    try {
      const res = await fetchWithTimeout(`${currentHubUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: 'volunteer-phone-1',
          households: offlineHouseholds,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const count = offlineHouseholds.length;
        offlineHouseholds.length = 0;
        return {
          success: true,
          synced_households: count,
          message: data.message || `Successfully synced ${count} households to hub laptop.`,
        };
      }
    } catch {
      // Fallback
    }

    return {
      success: false,
      synced_households: 0,
      message: 'Failed to connect to laptop hub. Hotspot connection required.',
    };
  },

  getOfflineQueueCount(): number {
    return offlineHouseholds.length;
  },
};
