import { Directory, File, Paths } from 'expo-file-system';

import { deriveTitle, makeNoteId, Note, parseNote, serializeNote } from './noteFormat';

export const DEFAULT_FOLDER = 'captures';

function notesRoot() {
  return new Directory(Paths.document, 'notes');
}

export function saveNote(
  transcript: string,
  durationMillis: number,
  folder: string = DEFAULT_FOLDER,
  tags: string[] = [],
) {
  const now = new Date();
  const id = makeNoteId(now);
  const cleanFolder = folder.trim() || DEFAULT_FOLDER;

  const dir = new Directory(notesRoot(), cleanFolder);
  dir.create({ intermediates: true, idempotent: true });

  const file = new File(dir, `${id}.md`);
  const content = serializeNote(
    {
      id,
      created: now.toISOString(),
      folder: cleanFolder,
      title: deriveTitle(transcript),
      tags,
      status: 'raw',
      duration_sec: Math.round(durationMillis / 1000),
    },
    transcript,
  );
  file.create({ intermediates: true, overwrite: true });
  file.write(content);

  return file.uri;
}

export function listNotes(): Note[] {
  const root = notesRoot();
  if (!root.exists) return [];

  const notes: Note[] = [];
  for (const entry of root.list()) {
    if (!(entry instanceof Directory)) continue;
    for (const item of entry.list()) {
      if (!(item instanceof File) || item.extension !== '.md') continue;
      const note = parseNote(item.textSync());
      if (note) notes.push(note);
    }
  }

  return notes.sort((a, b) => b.frontmatter.id.localeCompare(a.frontmatter.id));
}

export function readNote(folder: string, id: string): Note | null {
  const file = new File(notesRoot(), folder, `${id}.md`);
  if (!file.exists) return null;
  return parseNote(file.textSync());
}

export function deleteNote(folder: string, id: string) {
  const file = new File(notesRoot(), folder, `${id}.md`);
  if (file.exists) file.delete();
}

export function updateNote(
  currentFolder: string,
  id: string,
  updates: { title?: string; body?: string; folder?: string; tags?: string[] },
): Note | null {
  const file = new File(notesRoot(), currentFolder, `${id}.md`);
  if (!file.exists) return null;
  const existing = parseNote(file.textSync());
  if (!existing) return null;

  const nextFolder = (updates.folder ?? currentFolder).trim() || DEFAULT_FOLDER;
  const nextFrontmatter = {
    ...existing.frontmatter,
    title: updates.title ?? existing.frontmatter.title,
    tags: updates.tags ?? existing.frontmatter.tags,
    folder: nextFolder,
  };
  const nextBody = updates.body ?? existing.body;

  if (nextFolder !== currentFolder) {
    const targetDir = new Directory(notesRoot(), nextFolder);
    targetDir.create({ intermediates: true, idempotent: true });
    file.move(targetDir);
  }
  file.write(serializeNote(nextFrontmatter, nextBody));

  return { frontmatter: nextFrontmatter, body: nextBody.trim() };
}

export function listFolders(): { name: string; count: number }[] {
  const root = notesRoot();
  if (!root.exists) return [];

  const folders: { name: string; count: number }[] = [];
  for (const entry of root.list()) {
    if (!(entry instanceof Directory)) continue;
    const count = entry.list().filter((item) => item instanceof File && item.extension === '.md').length;
    folders.push({ name: entry.name, count });
  }

  return folders.sort((a, b) => a.name.localeCompare(b.name));
}
