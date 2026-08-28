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
