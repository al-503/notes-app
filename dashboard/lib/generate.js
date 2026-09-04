const { execFile } = require('child_process');

const TIMEOUT_MS = 180000;

// Référence au process en cours, pour pouvoir le tuer proprement sur SIGINT
// (pas de `claude` orphelin si on ferme le dashboard en plein milieu).
let activeChild = null;

// Un clic = un appel synchrone unique au `claude` CLI déjà authentifié par
// abonnement (pas de clé API — voir CLAUDE.md, "principe fondamental") :
// exactement l'équivalent de taper la commande soi-même dans le terminal.
function runGenerate({ repoRoot, command, notePaths }) {
  return new Promise((resolve, reject) => {
    // ANTHROPIC_API_KEY explicitement retirée de l'env de l'enfant, même si
    // elle n'est pas définie aujourd'hui : protège contre un futur export
    // oublié dans un profil shell qui basculerait la facturation en silence.
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;

    const child = execFile(
      'claude',
      [
        '-p', `/${command} ${notePaths.join(' ')}`,
        '--output-format', 'json',
        '--permission-mode', 'dontAsk',
        '--allowedTools', 'Read,Glob,Grep',
        '--disallowedTools', 'Write,Edit,NotebookEdit,Bash,BashOutput,KillShell,WebFetch,WebSearch,Task',
      ],
      {
        cwd: repoRoot,
        env,
        timeout: TIMEOUT_MS,
        killSignal: 'SIGKILL',
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(error.killed ? 'Génération interrompue (timeout).' : (stderr || error.message)));
          return;
        }

        let parsed;
        try {
          parsed = JSON.parse(stdout);
        } catch {
          reject(new Error(`Réponse illisible de claude : ${stdout.slice(0, 500)}`));
          return;
        }

        if (parsed.is_error) {
          reject(new Error(parsed.result || 'La génération a échoué.'));
          return;
        }

        resolve(parsed.result);
      },
    );

    activeChild = child;
  });
}

function killActive() {
  if (activeChild && !activeChild.killed) activeChild.kill('SIGKILL');
}

module.exports = { runGenerate, killActive };
