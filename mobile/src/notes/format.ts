export function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const WEEKDAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];

export function formatRelativeDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (daysAgo === 0) return `Auj. ${time}`;
  if (daysAgo === 1) return `Hier ${time}`;
  if (daysAgo > 1 && daysAgo < 7) return `${WEEKDAYS[date.getDay()]} ${time}`;
  return `${date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${time}`;
}
