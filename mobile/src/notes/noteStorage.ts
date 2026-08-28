import { Directory, File, Paths } from 'expo-file-system';

import { deriveTitle, makeNoteId, serializeNote } from './noteFormat';

export const DEFAULT_FOLDER = 'captures';

export function saveNote(transcript: string, durationMillis: number) {
  const now = new Date();
  const id = makeNoteId(now);

  const dir = new Directory(Paths.document, 'notes', DEFAULT_FOLDER);
  dir.create({ intermediates: true, idempotent: true });

  const file = new File(dir, `${id}.md`);
  const content = serializeNote(
    {
      id,
      created: now.toISOString(),
      folder: DEFAULT_FOLDER,
      title: deriveTitle(transcript),
      tags: [],
      status: 'raw',
      duration_sec: Math.round(durationMillis / 1000),
    },
    transcript,
  );
  file.create({ intermediates: true, overwrite: true });
  file.write(content);

  return file.uri;
}
