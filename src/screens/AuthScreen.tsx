import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../auth/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { colors, family, font, radius, spacing } from '../theme';

type Mode = 'signIn' | 'signUp';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignUp = mode === 'signUp';

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (isSignUp && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    const { error: authError } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);
    setSubmitting(false);

    if (authError) {
      setError(authError);
      return;
    }
    if (isSignUp) {
      // If email confirmation is enabled, there's no session yet.
      setNotice('Account created. If asked, confirm your email, then sign in.');
      setMode('signIn');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.brandBlock}>
            <View style={styles.mark}>
              <Text style={styles.markText}>PR</Text>
            </View>
            <Text style={styles.brand}>PROGRESSIVE</Text>
            <Text style={styles.tagline}>
              {isSignUp ? 'CREATE YOUR ACCOUNT' : 'SIGN IN TO YOUR TRAINING LOG'}
            </Text>
          </View>

          {!isSupabaseConfigured ? (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>
                Backend not configured. Copy .env.example to .env and add your Supabase URL and anon
                key, then restart the app.
              </Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@email.com"
                placeholderTextColor={colors.textFaint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                autoCapitalize="none"
                textContentType={isSignUp ? 'newPassword' : 'password'}
                style={styles.input}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}

            <PrimaryButton
              title={isSignUp ? 'Create account' : 'Sign in'}
              onPress={submit}
              loading={submitting}
              disabled={!isSupabaseConfigured}
              fullWidth
              style={{ marginTop: spacing.sm }}
            />

            <Pressable
              onPress={() => {
                setMode(isSignUp ? 'signIn' : 'signUp');
                setError(null);
                setNotice(null);
              }}
              style={styles.toggle}
            >
              <Text style={styles.toggleText}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={styles.toggleLink}>{isSignUp ? 'Sign in' : 'Sign up'}</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.xxl },
  brandBlock: { alignItems: 'center' },
  mark: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    color: colors.bg,
    fontSize: 36,
    lineHeight: 42,
    fontFamily: family.display,
    includeFontPadding: false,
    marginTop: 6,
  },
  brand: {
    color: colors.text,
    fontSize: font.h1,
    lineHeight: Math.ceil(font.h1 * 1.15),
    fontFamily: family.display,
    includeFontPadding: false,
    letterSpacing: 2,
    marginTop: spacing.lg,
  },
  tagline: {
    color: colors.primary,
    fontSize: font.tiny,
    fontFamily: family.medium,
    letterSpacing: 2,
    marginTop: 4,
    textAlign: 'center',
  },
  banner: {
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  bannerText: { color: colors.text, fontFamily: family.body, fontSize: font.small, lineHeight: 18 },
  form: { gap: spacing.lg },
  field: { gap: spacing.sm },
  label: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.4 },
  input: {
    backgroundColor: colors.card2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 52,
    color: colors.text,
    fontFamily: family.medium,
    fontSize: font.body,
  },
  error: { color: colors.text, fontFamily: family.medium, fontSize: font.small, lineHeight: 18 },
  notice: { color: colors.primary, fontFamily: family.medium, fontSize: font.small, lineHeight: 18 },
  toggle: { alignItems: 'center', paddingVertical: spacing.sm },
  toggleText: { color: colors.textDim, fontFamily: family.body, fontSize: font.label },
  toggleLink: { color: colors.primary, fontFamily: family.semibold },
});
