import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { listFolders } from '@/notes/noteStorage';

export default function FoldersScreen() {
  const [folders, setFolders] = useState<{ name: string; count: number }[]>([]);

  useFocusEffect(
    useCallback(() => {
      setFolders(listFolders());
    }, []),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            ← Retour
          </ThemedText>
        </Pressable>

        <ThemedText type="title" style={styles.title}>
          Dossiers
        </ThemedText>

        <FlatList
          data={folders}
          keyExtractor={(folder) => folder.name}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/', params: { folder: item.name } })}
              style={styles.row}>
              <ThemedText type="smallBold">{item.name}</ThemedText>
              <ThemedText type="code" themeColor="textMuted">
                {item.count}
              </ThemedText>
            </Pressable>
          )}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              Aucun dossier pour l’instant.
            </ThemedText>
          }
        />
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
  title: {
    marginBottom: Spacing.three,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  empty: {
    marginTop: Spacing.five,
    textAlign: 'center',
  },
});
