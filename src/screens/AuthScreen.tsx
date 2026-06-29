import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await signIn();
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err?.code !== 'ERR_CANCELED') {
        Alert.alert(
          'Sign In Failed',
          'Unable to sign in with Apple. Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🔧</Text>
          <Text style={styles.title}>HomeRepair</Text>
          <Text style={styles.subtitle}>
            Your AI-powered home repair assistant
          </Text>
        </View>

        <View style={styles.features}>
          <FeatureRow icon="📸" text="Upload photos of the issue" />
          <FeatureRow icon="💬" text="Ask repair questions in plain English" />
          <FeatureRow icon="🛠️" text="Get step-by-step guidance" />
        </View>

        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={12}
            style={styles.appleButton}
            onPress={handleSignIn}
          />
        )}

        <Text style={styles.disclaimer}>
          Your data is kept private and used only to answer your repair questions.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    gap: 32,
  },
  logoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    fontSize: 64,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 17,
    color: '#6C6C70',
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 16,
    color: '#1C1C1E',
    flex: 1,
  },
  appleButton: {
    height: 52,
    width: '100%',
  },
  disclaimer: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
});
