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
} as const;

export const REGISTRATION_STEPS = [
  'Intake',
  'Confirm',
  'Duplicates',
  'Needs',
  'QR Card',
] as const;