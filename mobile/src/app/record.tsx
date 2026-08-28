import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSpeechToText } from '@/audio/useSpeechToText';
import { FolderPicker } from '@/components/folder-picker';
import { RecordButton } from '@/components/record-button';
import { TagEditor } from '@/components/tag-editor';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/notes/format';
import { DEFAULT_FOLDER, listFolders, saveNote } from '@/notes/noteStorage';

const WAVEFORM_BARS = 28;
const SILENCE_LEVEL = 0.06;

function volumeToLevel(value: number) {
  // volumechange value ranges roughly -2 (silence) .. 10 (loud) -> 0..1
  return Math.min(1, Math.max(SILENCE_LEVEL, (value + 2) / 12));
}

function Waveform({ isRecording, volume }: { isRecording: boolean; volume: number }) {
  const [levels, setLevels] = useState<number[]>(() => Array(WAVEFORM_BARS).fill(SILENCE_LEVEL));

  useEffect(() => {
    if (!isRecording) {
      setLevels(Array(WAVEFORM_BARS).fill(SILENCE_LEVEL));
      return;
    }
    setLevels((prev) => [...prev.slice(1), volumeToLevel(volume)]);
  }, [volume, isRecording]);

  return (
    <View style={styles.waveform}>
      {levels.map((level, index) => (
        <View key={index} style={[styles.waveformBar, { height: 6 + level * 90 }]} />
      ))}
    </View>
  );
}

function uniqueFolders() {
  const names = listFolders().map((f) => f.name);
  return Array.from(new Set([DEFAULT_FOLDER, ...names]));
}

export default function RecordScreen() {
  const theme = useTheme();
  const { isRecording, transcript, setTranscript, volume, durationMillis, start, stop } = useSpeechToText();
  const [error, setError] = useState<string | null>(null);

  const [folders, setFolders] = useState<string[]>(uniqueFolders);
  const [selectedFolder, setSelectedFolder] = useState(DEFAULT_FOLDER);
  const [tags, setTags] = useState<string[]>([]);

  const onToggleRecording = async () => {
    setError(null);
    try {
      if (isRecording) {
        stop();
      } else {
        await start();
      }
    } catch {
      setError("Impossible d'accéder au micro ou à la dictée. Vérifiez les permissions de l'app.");
    }
  };

  const canSave = !isRecording && transcript.trim().length > 0;

  const onSave = () => {
    setError(null);
    try {
      saveNote(transcript, durationMillis, selectedFolder, tags);
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Impossible de sauvegarder la note : ${message}`);
    }
  };

  const onCreateFolder = (name: string) => {
    setFolders((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setSelectedFolder(name);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Annuler
            </ThemedText>
          </Pressable>
          {isRecording && (
            <View style={styles.listeningBadge}>
              <View style={styles.listeningDot} />
              <ThemedText type="code" themeColor="accent" style={styles.listeningLabel}>
                EN ÉCOUTE
              </ThemedText>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.timerBlock}>
            <ThemedText type="title" style={styles.timer}>
              {formatDuration(durationMillis)}
            </ThemedText>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {isRecording
                ? 'Parlez, je vous écoute'
                : durationMillis > 0
                  ? 'Terminé — vérifiez le texte'
                  : 'Appuyez pour démarrer'}
            </ThemedText>
          </View>

          <Waveform isRecording={isRecording} volume={volume} />

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <ThemedView type="backgroundElement" style={styles.transcriptCard}>
            <ThemedText type="sectionLabel" themeColor="textMuted">
              TRANSCRIPTION
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

          <View style={styles.recordZone}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {isRecording ? 'Appuyez pour arrêter et transcrire' : 'Appuyez pour enregistrer'}
            </ThemedText>
            <RecordButton onPress={onToggleRecording} active={isRecording} />
          </View>

          <ThemedText type="sectionLabel" themeColor="textMuted">
            DOSSIER
          </ThemedText>
          <FolderPicker
            folders={folders}
            selected={selectedFolder}
            onSelect={setSelectedFolder}
            onCreateFolder={onCreateFolder}
          />

          <ThemedText type="sectionLabel" themeColor="textMuted">
            TAGS
          </ThemedText>
          <TagEditor tags={tags} onChange={setTags} />
        </ScrollView>

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
    gap: Spacing.three,
  },
  topBar: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {},
  listeningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: 14,
    backgroundColor: '#6366F124',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  listeningLabel: {
    letterSpacing: 1,
  },
  scroll: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  timerBlock: {
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  timer: {
    fontVariant: ['tabular-nums'],
    fontSize: 56,
  },
  waveform: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  error: {
    color: Colors.danger,
    textAlign: 'center',
  },
  transcriptCard: {
    minHeight: 140,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  transcriptInput: {
    minHeight: 90,
    fontSize: 16,
    lineHeight: 27,
    textAlignVertical: 'top',
  },
  recordZone: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  recordButtonLabel: {
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: 19,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
});
