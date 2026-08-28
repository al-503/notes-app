import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

type FolderPickerProps = {
  folders: string[];
  selected: string;
  onSelect: (name: string) => void;
  onCreateFolder: (name: string) => void;
};

export function FolderPicker({ folders, selected, onSelect, onCreateFolder }: FolderPickerProps) {
  const theme = useTheme();
  const [newFolderInput, setNewFolderInput] = useState<string | null>(null);

  const confirmNewFolder = () => {
    const name = (newFolderInput ?? '').trim();
    if (name) onCreateFolder(name);
    setNewFolderInput(null);
  };

  return (
    <View style={styles.chipRow}>
      {folders.map((name) => (
        <Pressable
          key={name}
          onPress={() => onSelect(name)}
          style={[styles.chip, name === selected && styles.chipSelected]}>
          <ThemedText
            type="smallBold"
            style={name === selected ? styles.chipLabelSelected : undefined}
            themeColor={name === selected ? 'text' : 'textSecondary'}>
            {name}
          </ThemedText>
        </Pressable>
      ))}
      {newFolderInput === null ? (
        <Pressable onPress={() => setNewFolderInput('')} style={styles.newChip}>
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
          style={[styles.newInput, { color: theme.text }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  chipSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  chipLabelSelected: {
    color: '#FFFFFF',
  },
  newChip: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  newInput: {
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
});
