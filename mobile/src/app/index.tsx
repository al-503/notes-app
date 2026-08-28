import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { Note } from '@/notes/noteFormat';
import { listNotes } from '@/notes/noteStorage';

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function NoteCard({ note }: { note: Note }) {
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/note/[id]',
          params: { id: note.frontmatter.id, folder: note.frontmatter.folder },
        })
      }
      style={styles.card}>
      <ThemedText type="smallBold" numberOfLines={1}>
        {note.frontmatter.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
        {note.body}
      </ThemedText>
      <ThemedText type="code" themeColor="textMuted">
        {note.frontmatter.folder} · {formatDate(note.frontmatter.created)}
      </ThemedText>
    </Pressable>
  );
}

export default function HomeScreen() {
  const [notes, setNotes] = useState<Note[]>([]);

  useFocusEffect(
    useCallback(() => {
      setNotes(listNotes());
    }, []),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Notes
        </ThemedText>

        <FlatList
          data={notes}
          keyExtractor={(note) => note.frontmatter.id}
          renderItem={({ item }) => <NoteCard note={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              Aucune note pour l’instant. Appuyez sur Enregistrer pour commencer.
            </ThemedText>
          }
        />

        <Pressable onPress={() => router.push('/record')} style={styles.recordButton}>
          <ThemedText type="smallBold" style={styles.recordButtonLabel}>
            Enregistrer
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
  title: {
    marginTop: Spacing.four,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  empty: {
    marginTop: Spacing.five,
    textAlign: 'center',
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  recordButton: {
    backgroundColor: Colors.accent,
    borderRadius: 999,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  recordButtonLabel: {
    color: '#FFFFFF',
  },
});
