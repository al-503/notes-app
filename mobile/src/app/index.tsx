import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRecorder } from '@/audio/useRecorder';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { saveNote } from '@/notes/noteStorage';

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
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const transcriptInputRef = useRef<TextInput>(null);

  const onToggleRecording = async () => {
    setError(null);
    setSavedMessage(null);
    try {
      if (isRecording) {
        await stop();
      } else {
        transcriptInputRef.current?.focus();
        await start();
        // La popup de permission micro (1re fois seulement) referme le clavier :
        // on le rouvre après coup, au cas où.
        transcriptInputRef.current?.focus();
      }
    } catch {
      setError("Impossible d'accéder au micro. Vérifiez les permissions de l'app.");
    }
  };

  const canSave = !isRecording && transcript.trim().length > 0;

  const onSave = () => {
    setError(null);
    try {
      saveNote(transcript, durationMillis);
      setTranscript('');
      setSavedMessage('Note sauvegardée.');
    } catch {
      setError("Impossible de sauvegarder la note.");
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
        {savedMessage && (
          <ThemedText type="small" themeColor="text" style={styles.saved}>
            {savedMessage}
          </ThemedText>
        )}

        <ThemedView type="backgroundElement" style={styles.transcriptCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Le clavier s’ouvre à l’enregistrement : appuyez sur son icône micro pour dicter
          </ThemedText>
          <TextInput
            ref={transcriptInputRef}
            value={transcript}
            onChangeText={setTranscript}
            multiline
            placeholder="Le texte dicté apparaît ici…"
            placeholderTextColor={theme.textSecondary}
            style={[styles.transcriptInput, { color: theme.text }]}
          />
        </ThemedView>

        <Pressable
          onPress={onSave}
          disabled={!canSave}
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}>
          <ThemedText type="smallBold" style={styles.recordButtonLabel}>
            Sauver la note
          </ThemedText>
        </Pressable>
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
  saved: {
    color: '#4CAF7D',
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
  saveButton: {
    backgroundColor: '#7C5CFF',
    borderRadius: Spacing.four,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
});
