import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { deriveTitle, makeNoteId, Note, parseNote, serializeNote } from './noteFormat';

export const DEFAULT_FOLDER = 'captures';

// Sur Android, un dossier public (pas le stockage privé de l'app) pour que
// Syncthing puisse le lire — voir ARCHITECTURE.md, la sync du contrat.
const ANDROID_PUBLIC_SEGMENTS = ['Documents', 'Voix', 'notes'];

function notesRoot() {
  if (Platform.OS === 'android') {
    return new Directory('file:///storage/emulated/0', ...ANDROID_PUBLIC_SEGMENTS);
  }
  return new Directory(Paths.document, 'notes');
}

// expo-file-system valide la permission d'écriture sur la cible elle-même
// avant de la créer : sur un chemin externe non encore existant, ce test
// répond toujours "refusé" (Java File.canWrite() sur un chemin inexistant
// vaut toujours false), permission Android accordée ou pas. On contourne en
// ne créant jamais un dossier/fichier "à distance" : on avance d'un niveau à
// la fois via .createDirectory()/.createFile() du PARENT (qui, lui, existe
// déjà au moment de l'appel).
function ensureDirectory(parent: Directory, name: string): Directory {
  const child = new Directory(parent, name);
  return child.exists ? child : parent.createDirectory(name);
}

function ensureNotesRoot(): Directory {
  if (Platform.OS !== 'android') {
    // Stockage privé de l'app (sandbox) : toujours lisible/inscriptible par
    // elle-même, la validation par existence ci-dessus ne s'y applique pas.
    const root = notesRoot();
    root.create({ intermediates: true, idempotent: true });
    return root;
  }
  let dir = new Directory('file:///storage/emulated/0');
  for (const segment of ANDROID_PUBLIC_SEGMENTS) {
    dir = ensureDirectory(dir, segment);
  }
  return dir;
}

function ensureFile(dir: Directory, fileName: string): File {
  const file = new File(dir, fileName);
  return file.exists ? file : dir.createFile(fileName, 'text/markdown');
}

export function canAccessNotesStorage(): boolean {
  try {
    ensureNotesRoot();
    return true;
  } catch {
    return false;
  }
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

  const dir = ensureDirectory(ensureNotesRoot(), cleanFolder);
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
  const file = ensureFile(dir, `${id}.md`);
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
    const targetDir = ensureDirectory(notesRoot(), nextFolder);
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
