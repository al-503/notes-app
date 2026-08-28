import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRecorder } from '@/audio/useRecorder';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function RecordScreen() {
  const theme = useTheme();
  const { isRecording, durationMillis, start, stop } = useRecorder();
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onToggleRecording = async () => {
    setError(null);
    try {
      if (isRecording) {
        await stop();
      } else {
        await start();
      }
    } catch {
      setError("Impossible d'accéder au micro. Vérifiez les permissions de l'app.");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Voix
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.recordCard}>
          <Pressable
            onPress={onToggleRecording}
            style={[styles.recordButton, isRecording && styles.recordButtonActive]}>
            <ThemedText type="smallBold" style={styles.recordButtonLabel}>
              {isRecording ? 'Arrêter' : 'Enregistrer'}
            </ThemedText>
          </Pressable>
          <ThemedText type="code" themeColor="textSecondary">
            {formatDuration(durationMillis)}
          </ThemedText>
        </ThemedView>

        {error && (
          <ThemedText type="small" themeColor="text" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <ThemedView type="backgroundElement" style={styles.transcriptCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Dictez avec le micro du clavier pour obtenir le texte
          </ThemedText>
          <TextInput
            value={transcript}
            onChangeText={setTranscript}
            multiline
            placeholder="Le texte dicté apparaît ici…"
            placeholderTextColor={theme.textSecondary}
            style={[styles.transcriptInput, { color: theme.text }]}
          />
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  recordCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  recordButton: {
    backgroundColor: '#7C5CFF',
    borderRadius: 999,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
  },
  recordButtonActive: {
    backgroundColor: '#FF5C5C',
  },
  recordButtonLabel: {
    color: '#FFFFFF',
  },
  error: {
    color: '#FF5C5C',
  },
  transcriptCard: {
    flex: 1,
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  transcriptInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
});
