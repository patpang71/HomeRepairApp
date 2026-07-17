import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

interface Props {
  onSend: (text: string, imageUri: string | null) => void;
  disabled: boolean;
  loadingLabel?: string;
}

export default function ChatInput({ onSend, disabled, loadingLabel }: Props) {
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const canSend = (text.trim().length > 0 || imageUri !== null) && !disabled;

  const pickImage = async (source: 'camera' | 'library') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });
      if (!result.canceled) setImageUri(result.assets[0].uri);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library access is needed to attach photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });
      if (!result.canceled) setImageUri(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Add Photo', 'Choose a source', [
      { text: 'Take Photo', onPress: () => pickImage('camera') },
      { text: 'Photo Library', onPress: () => pickImage('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim(), imageUri);
    setText('');
    setImageUri(null);
  };

  const toggleListening = async () => {
    if (disabled) return;
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      Alert.alert(
        'Permission Required',
        'Microphone and speech recognition access are needed for voice input.',
      );
      return;
    }
    setText('');
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
      addsPunctuation: true,
    });
  };

  useSpeechRecognitionEvent('start', () => setIsListening(true));

  useSpeechRecognitionEvent('result', (event) => {
    setText(event.results[0]?.transcript ?? '');
  });

  // Auto-sends the transcribed text once the user stops speaking.
  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    setText((current) => {
      const trimmed = current.trim();
      if (!trimmed || disabled) return current;
      onSend(trimmed, imageUri);
      setImageUri(null);
      return '';
    });
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      Alert.alert('Speech Recognition Error', event.message || 'Please try again.');
    }
  });

  return (
    <View style={styles.container}>
      {imageUri && (
        <View style={styles.previewRow}>
          <Image source={{ uri: imageUri }} style={styles.preview} />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => setImageUri(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.removeText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {disabled && loadingLabel && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingLabel}>{loadingLabel}</Text>
        </View>
      )}

      {isListening && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#FF3B30" />
          <Text style={styles.loadingLabel}>Listening…</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={showImageOptions}
          disabled={disabled}
        >
          <Text style={[styles.iconText, disabled && styles.iconDisabled]}>📷</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconButton, isListening && styles.iconButtonListening]}
          onPress={toggleListening}
          disabled={disabled}
        >
          <Text style={[styles.iconText, disabled && styles.iconDisabled]}>
            {isListening ? '⏹️' : '🎤'}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Ask about your home repair…"
          placeholderTextColor="#8E8E93"
          multiline
          maxLength={2000}
          returnKeyType="default"
          editable={!disabled}
        />

        <TouchableOpacity
          style={[styles.sendButton, canSend && styles.sendButtonActive]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
    paddingBottom: Platform.OS === 'ios' ? 0 : 8,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  preview: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#E5E5EA',
  },
  removeButton: {
    marginLeft: 6,
    backgroundColor: '#3C3C43',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  loadingLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
  },
  iconButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  iconDisabled: {
    opacity: 0.4,
  },
  iconButtonListening: {
    backgroundColor: '#FFE5E5',
    borderRadius: 18,
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    color: '#1C1C1E',
    maxHeight: 120,
    minHeight: 40,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: -1,
  },
});
