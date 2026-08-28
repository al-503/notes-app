import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { FolderPicker } from '@/components/folder-picker';
import { TagEditor } from '@/components/tag-editor';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Note } from '@/notes/noteFormat';
import { DEFAULT_FOLDER, deleteNote, listFolders, readNote, updateNote } from '@/notes/noteStorage';

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function uniqueFolders(current: string) {
  const names = listFolders().map((f) => f.name);
  return Array.from(new Set([DEFAULT_FOLDER, current, ...names]));
}

export default function NoteDetailScreen() {
  const theme = useTheme();
  const { id, folder: folderParam } = useLocalSearchParams<{ id: string; folder: string }>();

  const [currentFolder, setCurrentFolder] = useState(folderParam);
  const [note, setNote] = useState<Note | null>(() => readNote(folderParam, id));
  const [isEditing, setIsEditing] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [folder, setFolder] = useState(DEFAULT_FOLDER);
  const [folders, setFolders] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const startEditing = () => {
    if (!note) return;
    setTitle(note.frontmatter.title);
    setBody(note.body);
    setFolder(note.frontmatter.folder);
    setTags(note.frontmatter.tags);
    setFolders(uniqueFolders(note.frontmatter.folder));
    setIsEditing(true);
  };

  const onCreateFolder = (name: string) => {
    setFolders((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setFolder(name);
  };

  const onSave = () => {
    const updated = updateNote(currentFolder, id, { title, body, folder, tags });
    if (updated) {
      setNote(updated);
      setCurrentFolder(updated.frontmatter.folder);
    }
    setIsEditing(false);
  };

  const onDelete = () => {
    Alert.alert('Supprimer la note ?', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          deleteNote(currentFolder, id);
          router.back();
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <BackButton />
          {note && !isEditing && (
            <View style={styles.topBarActions}>
              <Pressable onPress={onDelete} style={styles.topBarButton}>
                <ThemedText type="smallBold" style={styles.deleteLabel}>
                  Supprimer
                </ThemedText>
              </Pressable>
              <Pressable onPress={startEditing} style={styles.topBarButton}>
                <ThemedText type="smallBold" themeColor="accent">
                  Éditer
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>

        {!note ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.notFound}>
            Note introuvable.
          </ThemedText>
        ) : isEditing ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Titre"
              placeholderTextColor={theme.textMuted}
              style={[styles.titleInput, { color: theme.text }]}
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              placeholder="Texte de la note"
              placeholderTextColor={theme.textMuted}
              style={[styles.bodyInput, { color: theme.text }]}
            />

            <ThemedText type="small" themeColor="textMuted" style={styles.sectionLabel}>
              DOSSIER
            </ThemedText>
            <FolderPicker folders={folders} selected={folder} onSelect={setFolder} onCreateFolder={onCreateFolder} />

            <ThemedText type="small" themeColor="textMuted" style={styles.sectionLabel}>
              TAGS
            </ThemedText>
            <TagEditor tags={tags} onChange={setTags} />

            <View style={styles.editActions}>
              <Pressable onPress={() => setIsEditing(false)} style={styles.cancelButton}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Annuler
                </ThemedText>
              </Pressable>
              <Pressable onPress={onSave} style={styles.saveButton}>
                <ThemedText type="smallBold" style={styles.saveButtonLabel}>
                  Enregistrer
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <ThemedText type="title" style={styles.title}>
              {note.frontmatter.title}
            </ThemedText>
            <ThemedText type="code" themeColor="textMuted">
              {note.frontmatter.folder} · {formatDate(note.frontmatter.created)} ·{' '}
              {note.frontmatter.duration_sec}s
            </ThemedText>
            {note.frontmatter.tags.length > 0 && (
              <View style={styles.tagRow}>
                {note.frontmatter.tags.map((tag) => (
                  <View key={tag} style={styles.tagPill}>
                    <ThemedText type="smallBold">{tag}</ThemedText>
                  </View>
                ))}
              </View>
            )}
            <ThemedText type="default" style={styles.body}>
              {note.body}
            </ThemedText>
          </ScrollView>
        )}
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
  },
  topBar: {
    marginTop: Spacing.four,
    marginBottom: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  topBarButton: {},
  deleteLabel: {
    color: Colors.danger,
  },
  content: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  body: {
    marginTop: Spacing.three,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  tagPill: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  notFound: {
    marginTop: Spacing.five,
    textAlign: 'center',
  },
  titleInput: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  bodyInput: {
    minHeight: 140,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  sectionLabel: {
    letterSpacing: 1,
    marginTop: Spacing.two,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: 19,
    backgroundColor: Colors.accent,
  },
  saveButtonLabel: {
    color: '#FFFFFF',
  },
});
