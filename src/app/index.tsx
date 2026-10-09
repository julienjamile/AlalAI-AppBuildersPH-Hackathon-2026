
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../components/AppHeader';
import { COLORS } from '../constants/colors';
import DashboardScreen from '../screen/DashboardScreen';
import NeedsScreen from '../screen/NeedsScreen';
import RegistrationScreen from '../screen/RegistrationScreen';
import ReportsScreen from '../screen/ReportsScreen';
import type { Screen } from '../types';

export default function HomeScreen() {
  const [screen, setScreen] = useState<Screen>('dashboard');

  const [intakeType, setIntakeType] = useState('Kwento');
  const [familyName, setFamilyName] = useState('Rosa Santos');
  const [birthdate, setBirthdate] = useState('1985-04-12');
  const [members, setMembers] = useState('5');
  const [location, setLocation] = useState('Evacuation Center A');

  const [hasInfant, setHasInfant] = useState(true);
  const [hasSenior, setHasSenior] = useState(false);
  const [hasMedicalNeeds, setHasMedicalNeeds] = useState(false);

  function startRegistration(type: string) {
    setIntakeType(type);
    setScreen('confirm');
  }

  function resetRegistration() {
    setFamilyName('');
    setBirthdate('');
    setMembers('1');
    setLocation('Evacuation Center A');

    setHasInfant(false);
    setHasSenior(false);
    setHasMedicalNeeds(false);

    setScreen('intake');
  }

  function completeStep(
    _step: 'confirm' | 'duplicate' | 'card',
    next: Screen
  ) {
    setScreen(next);
  }

  const pageTitles: Record<Screen, string> = {
    dashboard: 'Camp overview',
    intake: 'Register a family',
    confirm: 'Confirm details',
    duplicate: 'Check duplicates',
    needs: 'Family needs',
    card: 'Kard Silong',
    reports: 'Reports and sync',
  };

  function goBack() {
    const previousScreen: Partial<Record<Screen, Screen>> = {
      intake: 'dashboard',
      confirm: 'intake',
      duplicate: 'confirm',
      needs: 'duplicate',
      card: 'needs',
      reports: 'dashboard',
    };

    setScreen(previousScreen[screen] ?? 'dashboard');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <AppHeader
        title={pageTitles[screen]}
        showBack={screen !== 'dashboard'}
        onBack={goBack}
        onHome={() => setScreen('dashboard')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {screen === 'dashboard' && (
          <DashboardScreen onNavigate={setScreen} />
        )}

        {(screen === 'intake' ||
          screen === 'confirm' ||
          screen === 'duplicate' ||
          screen === 'card') && (
          <RegistrationScreen
            screen={screen}
            intakeType={intakeType}
            familyName={familyName}
            setFamilyName={setFamilyName}
            birthdate={birthdate}
            setBirthdate={setBirthdate}
            members={members}
            setMembers={setMembers}
            location={location}
            setLocation={setLocation}
            onNavigate={setScreen}
            onCompleteStep={completeStep}
            onStartRegistration={startRegistration}
            onResetRegistration={resetRegistration}
          />
        )}

        {screen === 'needs' && (
          <NeedsScreen
            familyName={familyName}
            members={members}
            location={location}
            hasInfant={hasInfant}
            setHasInfant={setHasInfant}
            hasSenior={hasSenior}
            setHasSenior={setHasSenior}
            hasMedicalNeeds={hasMedicalNeeds}
            setHasMedicalNeeds={setHasMedicalNeeds}
            onContinue={() => completeStep('card', 'card')}
            onBack={() => setScreen('duplicate')}
          />
        )}

        {screen === 'reports' && (
          <ReportsScreen onBack={() => setScreen('dashboard')} />
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <NavigationItem
          icon="⌂"
          label="Home"
          active={screen === 'dashboard'}
          onPress={() => setScreen('dashboard')}
        />

        <NavigationItem
          icon="＋"
          label="Register"
          active={[
            'intake',
            'confirm',
            'duplicate',
            'needs',
            'card',
          ].includes(screen)}
          onPress={() => setScreen('intake')}
        />

        <NavigationItem
          icon="▤"
          label="Reports"
          active={screen === 'reports'}
          onPress={() => setScreen('reports')}
        />
      </View>
    </SafeAreaView>
  );
}

type NavigationItemProps = {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
};

function NavigationItem({
  icon,
  label,
  active,
  onPress,
}: NavigationItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={styles.bottomItem}
    >
      <Text style={styles.bottomIcon}>{icon}</Text>
      <Text style={[styles.bottomLabel, active && styles.bottomLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 14,
  },
  bottomBar: {
    minHeight: 70,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bottomItem: {
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  bottomIcon: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: '700',
  },
  bottomLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  bottomLabelActive: {
    color: COLORS.primary,
    fontWeight: '900',
  },
});