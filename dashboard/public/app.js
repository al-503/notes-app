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
  renderNotes(notes, commands);
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
    header.appendChild(el('span', 'note-meta', `${note.folder} · ${formatRelativeDate(note.created)} · ${formatDuration(note.duration_sec * 1000)}`));
    card.appendChild(header);

    if (note.excerpt) card.appendChild(el('p', 'note-excerpt', note.excerpt));

    if (note.tags.length > 0) {
      const tags = el('div', 'note-tags');
      for (const tag of note.tags) tags.appendChild(el('span', 'tag', tag));
      card.appendChild(tags);
    }

    const actions = el('div', 'note-actions');
    for (const command of commands) {
      const button = el('button', 'command-button', command.description || command.name);
      button.title = command.description || command.name;
      button.addEventListener('click', () => generate(note, command));
      actions.appendChild(button);
    }
    card.appendChild(actions);

    container.appendChild(card);
  }
}

async function generate(note, command) {
  const overlay = document.getElementById('result-overlay');
  const title = document.getElementById('result-title');
  const status = document.getElementById('result-status');
  const text = document.getElementById('result-text');
  const copyButton = document.getElementById('copy-result');

  title.textContent = `${command.name} — ${note.title || note.id}`;
  status.textContent = 'Génération en cours (jusqu’à 3 min)…';
  text.value = '';
  copyButton.disabled = true;
  overlay.classList.remove('hidden');

  document.querySelectorAll('.command-button').forEach((btn) => { btn.disabled = true; });

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notePath: note.path, command: command.name }),
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
