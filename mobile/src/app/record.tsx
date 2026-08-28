import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRecorder } from '@/audio/useRecorder';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_FOLDER, listFolders, saveNote } from '@/notes/noteStorage';

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function uniqueFolders() {
  const names = listFolders().map((f) => f.name);
  return Array.from(new Set([DEFAULT_FOLDER, ...names]));
}

export default function RecordScreen() {
  const theme = useTheme();
  const { isRecording, durationMillis, start, stop } = useRecorder();
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
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Annuler
          </ThemedText>
        </Pressable>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
            <ThemedText type="small" style={styles.error}>
              {error}
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
  backButton: {
    marginTop: Spacing.four,
  },
  scroll: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  recordCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  recordButton: {
    backgroundColor: Colors.accent,
    borderRadius: 999,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
  },
  recordButtonActive: {
    backgroundColor: Colors.danger,
  },
  recordButtonLabel: {
    color: '#FFFFFF',
  },
  error: {
    color: Colors.danger,
  },
  transcriptCard: {
    minHeight: 160,
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
