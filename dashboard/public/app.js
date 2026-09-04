// Portées telles quelles depuis mobile/src/notes/format.ts (cosmétique, sûr à
// dupliquer côté navigateur — contrairement au parseur de note, réutilisé lui
// à la source côté serveur, cf. dashboard/lib/notes.js).
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const WEEKDAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];

function formatRelativeDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const now = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (daysAgo === 0) return `Auj. ${time}`;
  if (daysAgo === 1) return `Hier ${time}`;
  if (daysAgo > 1 && daysAgo < 7) return `${WEEKDAYS[date.getDay()]} ${time}`;
  return `${date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${time}`;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function loadData() {
  const [notesRes, commandsRes] = await Promise.all([
    fetch('/api/notes'),
    fetch('/api/commands'),
  ]);
  const { notes } = await notesRes.json();
  const { commands } = await commandsRes.json();
  renderFolders(notes, commands);
  renderNotes(notes, commands);
}

function groupByFolder(notes) {
  const groups = new Map();
  for (const note of notes) {
    if (!groups.has(note.folder)) groups.set(note.folder, []);
    groups.get(note.folder).push(note);
  }
  return groups;
}

function renderFolders(notes, commands) {
  const section = document.getElementById('folders-section');
  const container = document.getElementById('folders-list');
  container.textContent = '';

  const groups = [...groupByFolder(notes).entries()].filter(([, group]) => group.length >= 2);
  if (groups.length === 0) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');

  for (const [folder, group] of groups) {
    const card = el('article', 'folder-card');

    const header = el('div', 'note-header');
    header.appendChild(el('h3', null, folder));
    header.appendChild(el('span', 'note-duration', `${group.length} notes`));
    card.appendChild(header);

    const actions = el('div', 'note-actions');
    for (const command of commands) {
      const button = el('button', 'command-button', `Combiner en ${command.description || command.name}`);
      button.title = `Combine les ${group.length} notes de "${folder}" en un seul ${command.name}`;
      button.addEventListener('click', () =>
        runGeneration({
          label: `${command.name} — ${folder} (${group.length} notes combinées)`,
          notePaths: group.map((n) => n.path),
          command,
        }),
      );
      actions.appendChild(button);
    }
    card.appendChild(actions);

    container.appendChild(card);
  }
}

function renderNotes(notes, commands) {
  const container = document.getElementById('notes-list');
  container.textContent = '';

  if (notes.length === 0) {
    container.appendChild(el('p', 'loading', 'Aucune note pour le moment.'));
    return;
  }

  for (const note of notes) {
    const card = el('article', 'note-card');

    const header = el('div', 'note-header');
    header.appendChild(el('h3', null, note.title || 'Note sans titre'));
    header.appendChild(el('span', 'note-duration', formatDuration(note.duration_sec * 1000)));
    card.appendChild(header);

    const subline = el('div', 'note-subline');
    subline.appendChild(el('span', 'folder-pill', note.folder));
    subline.appendChild(el('span', 'dot'));
    subline.appendChild(el('span', 'note-date', formatRelativeDate(note.created)));
    card.appendChild(subline);

    if (note.excerpt) {
      const excerptEl = el('p', 'note-excerpt', note.excerpt);
      let expanded = false;
      excerptEl.addEventListener('click', () => {
        expanded = !expanded;
        excerptEl.textContent = expanded ? note.body : note.excerpt;
        excerptEl.classList.toggle('note-excerpt-expanded', expanded);
      });
      card.appendChild(excerptEl);
    }

    if (note.tags.length > 0) {
      const tags = el('div', 'note-tags');
      for (const tag of note.tags) tags.appendChild(el('span', 'tag', tag));
      card.appendChild(tags);
    }

    const actions = el('div', 'note-actions');
    for (const command of commands) {
      const button = el('button', 'command-button', command.description || command.name);
      button.title = command.description || command.name;
      button.addEventListener('click', () =>
        runGeneration({
          label: `${command.name} — ${note.title || note.id}`,
          notePaths: [note.path],
          command,
        }),
      );
      actions.appendChild(button);
    }
    card.appendChild(actions);

    container.appendChild(card);
  }
}

async function runGeneration({ label, notePaths, command }) {
  const overlay = document.getElementById('result-overlay');
  const title = document.getElementById('result-title');
  const status = document.getElementById('result-status');
  const text = document.getElementById('result-text');
  const copyButton = document.getElementById('copy-result');

  title.textContent = label;
  status.textContent = 'Génération en cours (jusqu’à 3 min)…';
  text.value = '';
  copyButton.disabled = true;
  overlay.classList.remove('hidden');

  document.querySelectorAll('.command-button').forEach((btn) => { btn.disabled = true; });

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notePaths, command: command.name }),
    });
    const data = await res.json();

    if (data.ok) {
      status.textContent = '';
      text.value = data.result;
      copyButton.disabled = false;
    } else {
      status.textContent = `Erreur : ${data.detail || data.error}`;
    }
  } catch (error) {
    status.textContent = `Erreur réseau : ${error.message}`;
  } finally {
    document.querySelectorAll('.command-button').forEach((btn) => { btn.disabled = false; });
  }
}

document.getElementById('close-result').addEventListener('click', () => {
  document.getElementById('result-overlay').classList.add('hidden');
});

document.getElementById('copy-result').addEventListener('click', async () => {
  const text = document.getElementById('result-text');
  await navigator.clipboard.writeText(text.value);
  const copyButton = document.getElementById('copy-result');
  const original = copyButton.textContent;
  copyButton.textContent = 'Copié !';
  setTimeout(() => { copyButton.textContent = original; }, 1500);
});

loadData();
