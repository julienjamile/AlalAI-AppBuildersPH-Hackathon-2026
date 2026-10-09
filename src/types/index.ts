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