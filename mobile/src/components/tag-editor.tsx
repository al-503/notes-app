import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

type TagEditorProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
};

export function TagEditor({ tags, onChange }: TagEditorProps) {
  const theme = useTheme();
  const [tagInput, setTagInput] = useState('');

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setTagInput('');
  };

  return (
    <View style={styles.chipRow}>
      {tags.map((tag) => (
        <View key={tag} style={styles.tagChip}>
          <ThemedText type="smallBold">{tag}</ThemedText>
          <Pressable onPress={() => onChange(tags.filter((t) => t !== tag))}>
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
        style={[styles.newInput, { color: theme.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'center',
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
