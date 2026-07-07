import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { sendSystemMessage } from '../services/api';

const TOKEN_KEY = 'apple_identity_token';

interface AuthContextType {
  identityToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionId: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [identityToken, setIdentityToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Tells the backend a client has connected so it can open a session before any user message arrives.
  const announceConnection = useCallback(async (token: string) => {
    try {
      const { sessionId: newSessionId } = await sendSystemMessage(
        token,
        `Client connected (${Platform.OS})`,
      );
      setSessionId(newSessionId);
    } catch {
      // Non-fatal — the first user message will still establish a session.
    }
  }, []);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((token) => {
        setIdentityToken(token);
        if (token) announceConnection(token);
      })
      .finally(() => setIsLoading(false));
    console.log('AuthProvider mounted');
  }, [announceConnection]);

  const signIn = useCallback(async () => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    console.log('Apple sub:', credential.user);
    if (credential.identityToken) {
      await SecureStore.setItemAsync(TOKEN_KEY, credential.identityToken);
      setIdentityToken(credential.identityToken);
      await announceConnection(credential.identityToken);
    }
  }, [announceConnection]);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setIdentityToken(null);
    setSessionId(null);
  }, []);

  // Apple identity tokens expire in 10 minutes — re-sign in silently when a 401 occurs.
  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      console.log('Apple sub:', credential.user);
      if (credential.identityToken) {
        await SecureStore.setItemAsync(TOKEN_KEY, credential.identityToken);
        setIdentityToken(credential.identityToken);
        return credential.identityToken;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        identityToken,
        isLoading,
        isAuthenticated: !!identityToken,
        sessionId,
        signIn,
        signOut,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
