/**
 * Composer - WhatsApp Web Style
 * Supports text, emoji, media, and voice recording
 */

import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Text,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { getTheme } from '../theme';

export interface ComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttach: () => void;
  onEmojiPress?: () => void;
  placeholder?: string;
  disabled?: boolean;
  onLongPressSend?: () => void;
  onVoiceRecord?: (uri: string) => void;
}

export default function Composer({
  value,
  onChangeText,
  onSend,
  onAttach,
  onEmojiPress,
  placeholder = 'Type a message...',
  disabled = false,
  onLongPressSend,
  onVoiceRecord,
}: ComposerProps) {
  const scheme = useColorScheme() || 'light';
  const theme = getTheme(scheme);
  const [isFocused, setIsFocused] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleSendPress = () => {
    if (value.trim()) {
      onSend();
    }
  };

  const handleSendLongPress = () => {
    if (onLongPressSend) {
      onLongPressSend();
    } else {
      setShowExpiryModal(true);
    }
  };

  const handleExpirySelect = (seconds: number | null) => {
    setShowExpiryModal(false);
    if (onLongPressSend) {
      onLongPressSend();
    }
  };

  const startRecording = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Voice Recording', 'Voice recording is only available on web.');
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
        ? 'audio/mp4' 
        : 'audio/ogg';
      
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = []; // Reset chunks
      setAudioChunks([]);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
          setAudioChunks([...chunksRef.current]); // Update state for UI
        }
      };

      recorder.onstop = async () => {
        try {
          // Use ref chunks which are guaranteed to be up to date
          const finalChunks = chunksRef.current;
          if (finalChunks.length === 0) {
            Alert.alert('Error', 'No audio data recorded');
            stream.getTracks().forEach((track) => track.stop());
            setRecording(null);
            setIsRecording(false);
            chunksRef.current = [];
            return;
          }
          
          const blob = new Blob(finalChunks, { type: mimeType });
          if (blob.size === 0) {
            Alert.alert('Error', 'Recording is empty');
            stream.getTracks().forEach((track) => track.stop());
            setRecording(null);
            setIsRecording(false);
            chunksRef.current = [];
            return;
          }
          
          const uri = URL.createObjectURL(blob);
          if (onVoiceRecord) {
            onVoiceRecord(uri);
          }
          stream.getTracks().forEach((track) => track.stop());
        } catch (err) {
          console.error('Recording stop error:', err);
          Alert.alert('Error', 'Failed to process recording: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
          setRecording(null);
          setAudioChunks([]);
          chunksRef.current = [];
          setIsRecording(false);
        }
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        Alert.alert('Error', 'Recording error occurred');
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        setRecording(null);
        setAudioChunks([]);
        chunksRef.current = [];
      };

      // Start recording with timeslice to ensure data is collected
      recorder.start(100); // Collect data every 100ms
      setRecording(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Recording start error:', err);
      Alert.alert('Error', 'Microphone access denied or not available: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      setIsRecording(false);
      return;
    }
    try {
      // Stop the recording - this will trigger onstop handler
      if (recording.state === 'recording') {
        recording.stop();
      }
      setIsRecording(false);
    } catch (err) {
      console.error('Stop recording error:', err);
      Alert.alert('Error', 'Failed to stop recording: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setIsRecording(false);
      setRecording(null);
      setAudioChunks([]);
      chunksRef.current = [];
    }
  };

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.header,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.content}>
          <TouchableOpacity
            onPress={onEmojiPress}
            style={styles.iconButton}
            disabled={disabled}
          >
            <Text style={styles.iconText}>😊</Text>
          </TouchableOpacity>

          <View style={[styles.inputWrapper, { backgroundColor: theme.colors.backgroundCard }]}>
            <TextInput
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.textSecondary}
              style={[
                styles.input,
                {
                  color: theme.colors.textPrimary,
                },
              ]}
              multiline
              maxLength={2000}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              editable={!disabled}
            />
          </View>

          <TouchableOpacity
            onPress={onAttach}
            style={styles.iconButton}
            disabled={disabled}
          >
            <Text style={styles.iconText}>📎</Text>
          </TouchableOpacity>
          {!isRecording ? (
            value.trim().length > 0 ? (
              <TouchableOpacity
                onPress={handleSendPress}
                onLongPress={handleSendLongPress}
                disabled={disabled || !value.trim()}
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: disabled || !value.trim()
                      ? theme.colors.border
                      : theme.colors.primary,
                  },
                ]}
              >
                <Text style={styles.sendIcon}>➤</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={startRecording}
                style={styles.iconButton}
                disabled={disabled}
              >
                <Text style={styles.iconText}>🎤</Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity
              onPress={stopRecording}
              style={[styles.recordButton, { backgroundColor: '#F15C6D' }]}
            >
              <Text style={styles.recordText}>Stop</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal
        visible={showExpiryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExpiryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.backgroundCard,
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                {
                  color: theme.colors.textPrimary,
                },
              ]}
            >
              Send with expiry?
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                {
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              Choose when this message should disappear
            </Text>
            <View style={styles.expiryOptions}>
              {[
                { label: '10 seconds', value: 10 },
                { label: '1 minute', value: 60 },
                { label: '5 minutes', value: 300 },
                { label: '1 hour', value: 3600 },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => handleExpirySelect(option.value)}
                  style={[
                    styles.expiryOption,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.expiryOptionText,
                      {
                        color: theme.colors.textPrimary,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => handleExpirySelect(null)}
                style={[
                  styles.expiryOption,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.expiryOptionText,
                    {
                      color: theme.colors.textSecondary,
                    },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 21,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 42,
    maxHeight: 120,
  },
  input: {
    fontSize: 15,
    lineHeight: 20,
    padding: 0,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  recordButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minHeight: 40,
    justifyContent: 'center',
  },
  recordText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 8,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  expiryOptions: {
    gap: 12,
  },
  expiryOption: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  expiryOptionText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
