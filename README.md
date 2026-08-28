# VoiceNotes → Contenu

Appli perso : capture de notes vocales → rangement → génération de posts/scripts
via Claude Code.

## Démarrer avec l'équipe agentique
1. Ouvre ce dossier dans Claude Code.
2. Lance : `@architect planifie l'étape 1 du MVP` (voir CLAUDE.md, ordre de construction).
3. L'architecte découpe, mobile-dev / infra-dev exécutent, reviewer relit.

## Structure
- `CLAUDE.md` — brief + règles du projet (à lire en premier).
- `.claude/agents/` — les subagents de build (architect, mobile-dev, infra-dev, reviewer).
- `.claude/commands/` — les commandes du quotidien (/post-linkedin, /script-youtube, /thread-x).
- `docs/ARCHITECTURE.md` — appli Expo, écrans, format de note.
- `notes/` — les notes synchronisées (le contrat entre appli et Claude Code).
