import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecordButton } from '@/components/record-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { formatDuration, formatRelativeDate } from '@/notes/format';
import { Note } from '@/notes/noteFormat';
import { listFolders, listNotes } from '@/notes/noteStorage';
import { Feather } from '@expo/vector-icons';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function GridIcon() {
  return (
    <View style={styles.gridIcon}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.gridDot} />
      ))}
    </View>
  );
}

const EMPTY_STEPS = [
  'Vous parlez, même 20 secondes',
  'La transcription arrive à l’arrêt',
  'Un dossier, deux tags, c’est rangé',
];

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyMicCircle}>
        <Feather name="mic" size={26} color={Colors.accent} />
      </View>
      <ThemedText type="title" style={styles.emptyTitle}>
        Aucune note pour l’instant
      </ThemedText>
      <ThemedText type="default" themeColor="textSecondary" style={styles.emptyBody}>
        Appuyez sur le bouton violet et parlez normalement. Le reste se fait tout seul.
      </ThemedText>
      <View style={styles.stepList}>
        {EMPTY_STEPS.map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <ThemedText type="code" themeColor="accent">
                {index + 1}
              </ThemedText>
            </View>
            <ThemedText type="smallBold">{step}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
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
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold" numberOfLines={1} style={styles.cardTitle}>
          {note.frontmatter.title}
        </ThemedText>
        <ThemedText type="code" themeColor="textMuted">
          {formatDuration(note.frontmatter.duration_sec * 1000)}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
        {note.body}
      </ThemedText>
      <View style={styles.cardMeta}>
        <View style={styles.folderPill}>
          <ThemedText type="smallBold" themeColor="accent">
            {note.frontmatter.folder}
          </ThemedText>
        </View>
        <View style={styles.metaDot} />
        <ThemedText type="code" themeColor="textMuted">
          {formatRelativeDate(note.frontmatter.created)}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { folder: folderParam } = useLocalSearchParams<{ folder?: string }>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      setNotes(listNotes());
      setFolders(listFolders().map((f) => f.name));
    }, []),
  );

  useEffect(() => {
    if (folderParam) setSelectedFolder(folderParam);
  }, [folderParam]);

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((note) => {
      const matchesFolder = !selectedFolder || note.frontmatter.folder === selectedFolder;
      const matchesQuery =
        !q ||
        note.frontmatter.title.toLowerCase().includes(q) ||
        note.body.toLowerCase().includes(q) ||
        note.frontmatter.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchesFolder && matchesQuery;
    });
  }, [notes, selectedFolder, query]);

  const notesThisWeek = useMemo(
    () => notes.filter((note) => Date.now() - new Date(note.frontmatter.created).getTime() < ONE_WEEK_MS).length,
    [notes],
  );

  const isEmpty = notes.length === 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <ThemedText type="title" style={styles.title}>
              Notes
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {isEmpty ? 'Tout commence par une voix' : `${notesThisWeek} note${notesThisWeek > 1 ? 's' : ''} cette semaine`}
            </ThemedText>
          </View>
          <Pressable onPress={() => router.push('/folders')} style={styles.gridButton}>
            <GridIcon />
          </Pressable>
        </View>

        <View style={[styles.searchBar, isEmpty && styles.searchBarEmpty]}>
          <Feather name="search" size={16} color={Colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            editable={!isEmpty}
            placeholder={isEmpty ? 'Recherche dès la 1re note' : 'Rechercher un mot, un tag…'}
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
          />
        </View>

        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => setSelectedFolder(null)}
                style={[styles.chip, !selectedFolder && styles.chipSelected]}>
                <ThemedText type="smallBold" themeColor={!selectedFolder ? 'accent' : 'textSecondary'}>
                  Tout
                </ThemedText>
              </Pressable>
              {folders.map((name) => (
                <Pressable
                  key={name}
                  onPress={() => setSelectedFolder(name)}
                  style={[styles.chip, selectedFolder === name && styles.chipSelected]}>
                  <ThemedText
                    type="smallBold"
                    themeColor={selectedFolder === name ? 'accent' : 'textSecondary'}>
                    {name}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={styles.listHeader}>
              <ThemedText type="small" themeColor="textMuted" style={styles.sectionLabel}>
                RÉCENTES
              </ThemedText>
              <ThemedText type="code" themeColor="textMuted">
                {notes.length} au total
              </ThemedText>
            </View>

            <FlatList
              data={filteredNotes}
              keyExtractor={(note) => note.frontmatter.id}
              renderItem={({ item }) => <NoteCard note={item} />}
              contentContainerStyle={styles.list}
            />
          </>
        )}

        <View style={styles.recordZone}>
          <ThemedText type="smallBold" themeColor={isEmpty ? 'accent' : 'textSecondary'}>
            {isEmpty ? 'Enregistrer ma première note' : 'Appuyez pour enregistrer'}
          </ThemedText>
          <RecordButton onPress={() => router.push('/record')} />
        </View>
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
  header: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 30,
  },
  gridButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: Colors.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridIcon: {
    width: 17,
    height: 17,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  gridDot: {
    width: 7,
    height: 7,
    borderRadius: 2,
    backgroundColor: Colors.textSecondary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 52,
    borderRadius: 18,
    backgroundColor: Colors.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.three,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  searchBarEmpty: {
    borderStyle: 'dashed',
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.four,
    gap: Spacing.two,
  },
  emptyMicCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#6366F11F',
    borderWidth: 1,
    borderColor: '#6366F142',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    fontSize: 24,
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
    maxWidth: 280,
  },
  stepList: {
    width: '100%',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 20,
    backgroundColor: Colors.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: '#1E1E28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  chipSelected: {
    borderColor: Colors.accent,
    backgroundColor: '#6366F12E',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionLabel: {
    letterSpacing: 1,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  cardTitle: {
    flex: 1,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 2,
  },
  folderPill: {
    borderRadius: 9,
    backgroundColor: '#6366F124',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  recordZone: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
});
