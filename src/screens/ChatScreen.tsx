import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getUploadUrl, sendMessage, uploadImageToS3 } from '../services/api';
import { Message } from '../types';
import ChatInput from '../components/ChatInput';
import MessageBubble from '../components/MessageBubble';

type LoadingStep = 'uploading' | 'thinking' | null;

const LOADING_LABELS: Record<NonNullable<LoadingStep>, string> = {
  uploading: 'Uploading photo…',
  thinking: 'Thinking…',
};

export default function ChatScreen() {
  const { identityToken, sessionId: authSessionId, signOut, refreshToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const flatListRef = useRef<FlatList<Message>>(null);

  // Picks up the session the system message opened in AuthContext on connect.
  useEffect(() => {
    if (authSessionId) setSessionId(authSessionId);
  }, [authSessionId]);

  const getToken = useCallback(async (): Promise<string> => {
    if (identityToken) return identityToken;
    const fresh = await refreshToken();
    if (!fresh) throw Object.assign(new Error('Session expired'), { status: 401 });
    return fresh;
  }, [identityToken, refreshToken]);

  const handleSend = useCallback(
    async (text: string, imageUri: string | null) => {
      if (!text && !imageUri) return;

      const userMsg: Message = {
        id: String(Date.now()),
        role: 'user',
        content: text,
        imageUri: imageUri ?? undefined,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        let token = await getToken();
        let imageKey: string | undefined;

        if (imageUri) {
          setLoadingStep('uploading');
          const { uploadUrl, imageKey: key } = await getUploadUrl(token);
          await uploadImageToS3(uploadUrl, imageUri);
          imageKey = key;
        }

        setLoadingStep('thinking');
        let chatResult;

        try {
          chatResult = await sendMessage(token, text, sessionId, imageKey);
        } catch (err: unknown) {
          const e = err as { status?: number };
          if (e?.status === 401) {
            // Apple identity token expired — refresh silently and retry once
            const fresh = await refreshToken();
            if (!fresh) throw err;
            token = fresh;
            chatResult = await sendMessage(token, text, sessionId, imageKey);
          } else {
            throw err;
          }
        }

        setSessionId(chatResult.sessionId);

        const assistantMsg: Message = {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: chatResult.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (error) {
        const e = error as { status?: number };
        if (e?.status === 401) {
          Alert.alert(
            'Session Expired',
            'Please sign in again.',
            [{ text: 'Sign Out', onPress: signOut }],
          );
        } else {
          Alert.alert('Error', 'Something went wrong. Please try again.');
        }
      } finally {
        setLoadingStep(null);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    },
    [getToken, refreshToken, sessionId, signOut],
  );

  const renderItem: ListRenderItem<Message> = useCallback(
    ({ item }) => <MessageBubble message={item} />,
    [],
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HomeRepair</Text>
        <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messageList}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<EmptyState />}
        />

        <SafeAreaView edges={['bottom']}>
          <ChatInput
            onSend={handleSend}
            disabled={loadingStep !== null}
            loadingLabel={loadingStep ? LOADING_LABELS[loadingStep] : undefined}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🔧</Text>
      <Text style={styles.emptyTitle}>How can I help?</Text>
      <Text style={styles.emptySubtitle}>
        Describe your home repair issue or attach a photo and I'll guide you through fixing it.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  signOutButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  signOutText: {
    fontSize: 15,
    color: '#007AFF',
  },
  messageList: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6C6C70',
    textAlign: 'center',
    lineHeight: 22,
  },
});
