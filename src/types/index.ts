export type Screen =
  | 'dashboard'
  | 'intake'
  | 'confirm'
  | 'duplicate'
  | 'needs'
  | 'card'
  | 'reports';

export type RegistrationScreen = Extract<
  Screen,
  'intake' | 'confirm' | 'duplicate' | 'card'
>;

export type RegistrationStep = Extract<
  Screen,
  'intake' | 'confirm' | 'duplicate' | 'needs' | 'card'
>;

export type Navigate = (screen: Screen) => void;

export type CompleteStep = (
  step: RegistrationStep,
  next: Screen
) => void;

export interface HouseholdData {
  id: string;
  qr_code: string;
  representative_name: string;
  birthdate: string;
  members_count: number;
  location: string;
  has_infant: boolean;
  has_senior: boolean;
  has_medical_needs: boolean;
  medical_notes?: string | null;
  status: string;
  merged_into_id?: string | null;
  created_offline?: boolean;
  sync_status?: string;
  created_at?: string;
}

export interface DuplicateMatchItem {
  id: string;
  representative_name: string;
  birthdate: string;
  location: string;
  members_count: number;
  match_score: number;
  match_reasons: string[];
  is_strong_match: boolean;
}

export interface SupplyNeedItem {
  name: string;
  amount: string;
  description: string;
  category: string;
}

export interface SupplyAlertItem {
  id: string;
  name: string;
  status: string;
  quantity: string;
  current_stock: number;
  unit: string;
  runout_hours: number;
  urgency: 'urgent' | 'warning' | 'normal';
  draft_request: string;
}

export interface DashboardStatsData {
  total_families: number;
  total_individuals: number;
  pending_reviews: number;
  low_stock_items: number;
  active_evacuation_centers: number;
  recent_registrations: HouseholdData[];
}