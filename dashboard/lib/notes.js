const fs = require('fs');
const path = require('path');

// Réutilise le vrai parseur du contrat de note (mobile/src/notes/noteFormat.ts,
// aucun import RN/Expo, TS effaçable) au lieu d'en dupliquer un — le contrat
// entre l'appli mobile et la génération ne peut alors jamais diverger.
const { parseNote } = require('../../mobile/src/notes/noteFormat.ts');

function excerpt(body, maxLength = 160) {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length > maxLength ? `${flat.slice(0, maxLength)}…` : flat;
}

function listNotes(repoRoot) {
  const notesRoot = path.join(repoRoot, 'notes');
  if (!fs.existsSync(notesRoot)) return [];

  const notes = [];
  for (const folderEntry of fs.readdirSync(notesRoot, { withFileTypes: true })) {
    // Ignore les dotdirs (ex. .stfolder, marqueur Syncthing) : pas un vrai dossier de notes.
    if (!folderEntry.isDirectory() || folderEntry.name.startsWith('.')) continue;

    const folderPath = path.join(notesRoot, folderEntry.name);
    for (const fileEntry of fs.readdirSync(folderPath, { withFileTypes: true })) {
      if (!fileEntry.isFile() || !fileEntry.name.endsWith('.md')) continue;

      const absPath = path.join(folderPath, fileEntry.name);
      const note = parseNote(fs.readFileSync(absPath, 'utf8'));
      if (!note) continue;

      notes.push({
        path: path.posix.join('notes', folderEntry.name, fileEntry.name),
        id: note.frontmatter.id,
        folder: note.frontmatter.folder,
        title: note.frontmatter.title,
        created: note.frontmatter.created,
        tags: note.frontmatter.tags,
        status: note.frontmatter.status,
        duration_sec: note.frontmatter.duration_sec,
        excerpt: excerpt(note.body),
      });
    }
  }

  // L'horodatage `created` a un format inconsistant selon la source (cf.
  // ARCHITECTURE.md) ; `id` (YYYY-MM-DD-HHMMSS) est la clé de tri fiable.
  return notes.sort((a, b) => b.id.localeCompare(a.id));
}

module.exports = { listNotes };
