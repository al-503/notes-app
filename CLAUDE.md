# Projet : VoiceNotes → Contenu

Appli **personnelle** (un seul utilisateur : moi) qui capture des notes vocales,
les transcrit, les range, puis me sert à générer des posts / scripts à partir
de leur contenu.

## Principe fondamental (à ne jamais enfreindre)

Il y a deux moments distincts, ne pas les confondre :

1. **Développement** — Claude Code écrit l'appli. Couvert par mon abonnement. OK.
2. **Génération de contenu au quotidien** — je déclenche moi-même une slash command
   (`/post-linkedin`, `/script-youtube`, `/thread-x`) dans Claude Code, assis devant
   ma machine. C'est un usage interactif d'une appli native Anthropic → autorisé.

**Interdit** : faire appeler Claude par l'appli mobile toute seule, en arrière-plan,
via un proxy sur l'abonnement. Ça sort de l'usage prévu et risque le compte.
Si un jour on veut de la génération 100 % automatique dans l'appli → modèle local
(Ollama), jamais l'abonnement.

## Stack

- **Mobile** : Expo (SDK 56, React Native, expo-router), testé via Expo Go sur mon téléphone. Pas d'App Store.
  Rester sur la dernière version taguée `sdk-XX` stable (voir `npm view expo dist-tags`) : le SDK "latest"
  npm est parfois en avance sur ce que l'appli Expo Go publiée sur les stores supporte réellement.
- **Audio** : `expo-audio` pour l'enregistrement (`expo-av` est déprécié sur ce SDK).
- **Transcription** : dictée du clavier système sur un `TextInput` (gratuite, on-device, 100% Expo Go — voir docs/ARCHITECTURE.md §2bis). Pas de Whisper hébergé.
- **Stockage** : fichiers Markdown dans `notes/`, un fichier par note.
- **Sync** : Syncthing sur un Raspberry Pi 4 (hub entre téléphone et PC). Zéro cloud.
- **Génération** : Claude Code lit `notes/`, les slash commands produisent le contenu.

## Contrat de données : le format de note

Chaque note = un fichier `notes/<dossier>/<id>.md` avec frontmatter YAML.
Le format est le **contrat** entre l'appli mobile (qui écrit) et Claude Code (qui lit).
Ne jamais le casser sans mettre à jour les deux côtés. Détail dans `docs/ARCHITECTURE.md`.

## Conventions de code

- TypeScript partout, mode strict.
- Pas de dépendance lourde sans raison : c'est une appli perso, on garde léger.
- Commits petits et atomiques, message en français, à l'impératif.
- Toute nouvelle brique est testée à la main sur le téléphone avant de passer à la suivante.
- Les secrets (aucun pour l'instant) ne sont jamais commités.

## Ordre de construction (MVP d'abord)

1. Enregistrer un audio → transcription on-device → afficher le texte.
2. Sauver la note au format `.md` (frontmatter + corps) dans `notes/`.
3. Dossiers / tags + écran de liste.
4. Setup Syncthing sur le Pi.
5. Slash commands de génération côté Claude Code.

Ne pas coder l'étape N+1 tant que l'étape N ne tourne pas sur le téléphone.

## Les subagents (voir .claude/agents/)

- `architect` : tient le plan, découpe les tâches, garde ce CLAUDE.md à jour.
- `mobile-dev` : tout ce qui est Expo / React Native.
- `infra-dev` : Syncthing, Raspberry Pi, sync.
- `reviewer` : relit le code produit avant qu'on le garde.
