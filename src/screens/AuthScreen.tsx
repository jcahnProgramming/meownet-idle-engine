// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Auth Screen
// ─────────────────────────────────────────────

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { gameConfig } from '../config/gameConfig';
import { useAuth } from '../hooks/useAuth';

const theme = gameConfig.theme;

interface Props {
  onAuthenticated: () => void;
}

export default function AuthScreen({ onAuthenticated }: Props) {
  const { signIn, signUp, signInAnon } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return;
    setBusy(true);
    const { error } =
      mode === 'signup'
        ? await signUp(email, password, username || email.split('@')[0])
        : await signIn(email, password);
    setBusy(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      onAuthenticated();
    }
  };

  const handleGuest = async () => {
    setBusy(true);
    await signInAnon();
    setBusy(false);
    onAuthenticated();
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        {/* Game title */}
        <Text style={styles.icon}>{gameConfig.resources[0]?.icon ?? '🎮'}</Text>
        <Text style={styles.title}>{gameConfig.gameName}</Text>
        <Text style={styles.subtitle}>
          {mode === 'signin' ? 'Welcome back!' : 'Create your account'}
        </Text>

        {/* Inputs */}
        {mode === 'signup' && (
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Primary action */}
        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Toggle mode */}
        <TouchableOpacity
          onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          style={styles.toggleButton}
        >
          <Text style={styles.toggleText}>
            {mode === 'signin'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Guest play */}
        <TouchableOpacity style={styles.guestButton} onPress={handleGuest} disabled={busy}>
          <Text style={styles.guestButtonText}>Play as Guest</Text>
        </TouchableOpacity>
        <Text style={styles.guestNote}>
          Guest saves are device-only. Sign up to sync across devices.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.backgroundColor },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: { fontSize: 64, marginBottom: 12 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.textColor,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 32,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: theme.surfaceColor,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: theme.textColor,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  primaryButton: {
    width: '100%',
    height: 50,
    backgroundColor: theme.primaryColor,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  toggleButton: { marginTop: 16, padding: 4 },
  toggleText: { color: theme.accentColor, fontSize: 13 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 24,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginHorizontal: 12,
  },
  guestButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestButtonText: { color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 15 },
  guestNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    marginTop: 10,
    textAlign: 'center',
  },
});
