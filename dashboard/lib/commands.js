const fs = require('fs');
const path = require('path');

// Découvre les slash commands de génération à chaud depuis .claude/commands/ :
// un nouveau fichier de commande apparaît dans le dashboard sans toucher au code.
function listCommands(repoRoot) {
  const commandsDir = path.join(repoRoot, '.claude', 'commands');
  if (!fs.existsSync(commandsDir)) return [];

  const commands = [];
  for (const entry of fs.readdirSync(commandsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

    const content = fs.readFileSync(path.join(commandsDir, entry.name), 'utf8');
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const descriptionMatch = frontmatterMatch
      ? frontmatterMatch[1].match(/^description:\s*(.+)$/m)
      : null;

    commands.push({
      name: entry.name.replace(/\.md$/, ''),
      description: descriptionMatch ? descriptionMatch[1].trim() : '',
    });
  }

  return commands.sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { listCommands };
