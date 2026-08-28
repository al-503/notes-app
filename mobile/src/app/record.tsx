import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRecorder } from '@/audio/useRecorder';
import { RecordButton } from '@/components/record-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/notes/format';
import { DEFAULT_FOLDER, listFolders, saveNote } from '@/notes/noteStorage';

const WAVEFORM_BARS = 28;
const SILENCE_LEVEL = 0.06;

function meteringToLevel(db: number) {
  // dB approx. -60 (silence) .. 0 (max) -> 0..1
  return Math.min(1, Math.max(SILENCE_LEVEL, (db + 60) / 60));
}

function Waveform({ isRecording, metering }: { isRecording: boolean; metering: number }) {
  const [levels, setLevels] = useState<number[]>(() => Array(WAVEFORM_BARS).fill(SILENCE_LEVEL));

  useEffect(() => {
    if (!isRecording) {
      setLevels(Array(WAVEFORM_BARS).fill(SILENCE_LEVEL));
      return;
    }
    setLevels((prev) => [...prev.slice(1), meteringToLevel(metering)]);
  }, [metering, isRecording]);

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
  const { isRecording, durationMillis, metering, start, stop } = useRecorder();
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const transcriptInputRef = useRef<TextInput>(null);

  const [folders, setFolders] = useState<string[]>(uniqueFolders);
  const [selectedFolder, setSelectedFolder] = useState(DEFAULT_FOLDER);
  const [newFolderInput, setNewFolderInput] = useState<string | null>(null);

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const onToggleRecording = async () => {
    setError(null);
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
      saveNote(transcript, durationMillis, selectedFolder, tags);
      router.back();
    } catch {
      setError('Impossible de sauvegarder la note.');
    }
  };

  const confirmNewFolder = () => {
    const name = (newFolderInput ?? '').trim();
    if (name) {
      setFolders((prev) => (prev.includes(name) ? prev : [...prev, name]));
      setSelectedFolder(name);
    }
    setNewFolderInput(null);
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
    }
    setTagInput('');
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

          <Waveform isRecording={isRecording} metering={metering} />

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <ThemedView type="backgroundElement" style={styles.transcriptCard}>
            <ThemedText type="small" themeColor="textMuted" style={styles.sectionLabel}>
              TRANSCRIPTION
            </ThemedText>
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

          <View style={styles.recordZone}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {isRecording ? 'Appuyez pour arrêter et transcrire' : 'Appuyez pour enregistrer'}
            </ThemedText>
            <RecordButton onPress={onToggleRecording} active={isRecording} />
          </View>

          <ThemedText type="small" themeColor="textMuted" style={styles.sectionLabel}>
            DOSSIER
          </ThemedText>
          <View style={styles.chipRow}>
            {folders.map((name) => (
              <Pressable
                key={name}
                onPress={() => setSelectedFolder(name)}
                style={[styles.folderChip, name === selectedFolder && styles.folderChipSelected]}>
                <ThemedText
                  type="smallBold"
                  style={name === selectedFolder ? styles.folderChipLabelSelected : undefined}
                  themeColor={name === selectedFolder ? 'text' : 'textSecondary'}>
                  {name}
                </ThemedText>
              </Pressable>
            ))}
            {newFolderInput === null ? (
              <Pressable onPress={() => setNewFolderInput('')} style={styles.newFolderChip}>
                <ThemedText type="smallBold" themeColor="textMuted">
                  + Nouveau
                </ThemedText>
              </Pressable>
            ) : (
              <TextInput
                autoFocus
                value={newFolderInput}
                onChangeText={setNewFolderInput}
                onSubmitEditing={confirmNewFolder}
                onBlur={confirmNewFolder}
                placeholder="nom-du-dossier"
                placeholderTextColor={theme.textMuted}
                style={[styles.newFolderInput, { color: theme.text }]}
              />
            )}
          </View>

          <ThemedText type="small" themeColor="textMuted" style={styles.sectionLabel}>
            TAGS
          </ThemedText>
          <View style={styles.chipRow}>
            {tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <ThemedText type="smallBold">{tag}</ThemedText>
                <Pressable onPress={() => setTags((prev) => prev.filter((t) => t !== tag))}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {' '}
                    ×
                  </ThemedText>
                </Pressable>
              </View>
            ))}
            <TextInput
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
              onBlur={addTag}
              placeholder="Ajouter un tag"
              placeholderTextColor={theme.textMuted}
              style={[styles.newFolderInput, { color: theme.text }]}
            />
          </View>
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
    backgroundColor: '#7C5CFF24',
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
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    letterSpacing: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  folderChip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  folderChipSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  folderChipLabelSelected: {
    color: '#FFFFFF',
  },
  newFolderChip: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  newFolderInput: {
    minWidth: 120,
    borderRadius: 11,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 13,
    fontWeight: '600',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
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
