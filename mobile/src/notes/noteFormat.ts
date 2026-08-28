export type NoteFrontmatter = {
  id: string;
  created: string;
  folder: string;
  title: string;
  tags: string[];
  status: 'raw' | 'processed';
  duration_sec: number;
};

function yamlString(value: string) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function unquote(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return trimmed;
}

function parseTags(value: string) {
  const inner = value.trim().replace(/^\[/, '').replace(/\]$/, '').trim();
  if (!inner) return [];
  return inner.split(',').map((tag) => unquote(tag)).filter(Boolean);
}

export type Note = {
  frontmatter: NoteFrontmatter;
  body: string;
};

export function parseNote(content: string): Note | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;
  const [, rawFrontmatter, rawBody] = match;

  const fields: Record<string, string> = {};
  for (const line of rawFrontmatter.split(/\r?\n/)) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    fields[key] = value;
  }

  if (!fields.id) return null;

  return {
    frontmatter: {
      id: fields.id,
      created: fields.created ?? '',
      folder: fields.folder ?? '',
      title: unquote(fields.title ?? ''),
      tags: parseTags(fields.tags ?? '[]'),
      status: fields.status === 'processed' ? 'processed' : 'raw',
      duration_sec: Number(fields.duration_sec) || 0,
    },
    body: rawBody.trim(),
  };
}

export function deriveTitle(transcript: string) {
  const firstLine = transcript.trim().split(/\r?\n/)[0] ?? '';
  const words = firstLine.split(/\s+/).filter(Boolean).slice(0, 8);
  return words.join(' ') || 'Note sans titre';
}

export function makeNoteId(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

export function serializeNote(frontmatter: NoteFrontmatter, body: string) {
  const lines = [
    '---',
    `id: ${frontmatter.id}`,
    `created: ${frontmatter.created}`,
    `folder: ${frontmatter.folder}`,
    `title: ${yamlString(frontmatter.title)}`,
    `tags: [${frontmatter.tags.map(yamlString).join(', ')}]`,
    `status: ${frontmatter.status}`,
    `duration_sec: ${frontmatter.duration_sec}`,
    '---',
    '',
    body.trim(),
    '',
  ];
  return lines.join('\n');
}
