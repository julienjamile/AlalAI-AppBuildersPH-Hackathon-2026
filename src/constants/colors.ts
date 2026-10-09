export const COLORS = {
  primary: '#223d65',
  dark: '#29445F',
  background: '#F6F5EF',
  muted: '#66736A',
  border: '#DDE4DB',
  warning: '#A95B16',
  white: '#FFFFFF',
  lightGreen: '#EAF1E9',
  paleGreen: '#F0F3ED',
  paleGray: '#F3F5F0',
  track: '#E8ECE6',
  placeholder: '#89938B',
  inputBorder: '#CCD7CD',
  qrDark: '#183D30',
  paleOrange: '#FFF0DB',

  // Dashboard colors
  heroEyebrow: '#D7E2F0',
  heroDescription: '#E2ECE4',
  refreshOverlay: 'rgba(255,255,255,0.2)',
  antiFraudBackground: '#FFE8D6',
  errorBackground: '#FFEBEE',
  successText: '#2E7D32',
  errorText: '#C62828',
  overlay: 'rgba(0,0,0,0.5)',
} as const;

export const REGISTRATION_STEPS = [
  'Intake',
  'Confirm',
  'Duplicates',
  'Needs',
  'QR Card',
] as const;