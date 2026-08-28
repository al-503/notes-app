import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { readNote } from '@/notes/noteStorage';

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

export default function NoteDetailScreen() {
  const { id, folder } = useLocalSearchParams<{ id: string; folder: string }>();
  const note = useMemo(() => readNote(folder, id), [folder, id]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            ← Retour
          </ThemedText>
        </Pressable>

        {note ? (
          <ScrollView contentContainerStyle={styles.content}>
            <ThemedText type="title" style={styles.title}>
              {note.frontmatter.title}
            </ThemedText>
            <ThemedText type="code" themeColor="textMuted">
              {note.frontmatter.folder} · {formatDate(note.frontmatter.created)} ·{' '}
              {note.frontmatter.duration_sec}s
            </ThemedText>
            <ThemedText type="default" style={styles.body}>
              {note.body}
            </ThemedText>
          </ScrollView>
        ) : (
          <ThemedText type="small" themeColor="textSecondary" style={styles.notFound}>
            Note introuvable.
          </ThemedText>
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
  backButton: {
    marginTop: Spacing.four,
    marginBottom: Spacing.three,
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
  notFound: {
    marginTop: Spacing.five,
    textAlign: 'center',
  },
});
