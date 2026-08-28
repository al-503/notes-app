# Architecture — VoiceNotes → Contenu

Appli perso mono-utilisateur. Trois briques : **capture (mobile)**, **sync (Pi 4)**,
**génération (Claude Code)**. Les trois communiquent par un seul dossier de fichiers
Markdown : `notes/`.

```
[Téléphone : appli Expo]        [Raspberry Pi 4 : Syncthing]        [PC : Claude Code]
   capture + transcription  →      hub de sync du dossier    →   lecture des notes +
   écrit notes/*.md                 notes/ (toujours allumé)      slash commands
```

L'appli mobile n'appelle jamais de LLM. Elle ne fait qu'écrire des fichiers.
La génération se fait sur le PC, déclenchée à la main dans Claude Code.

---

## 1. Le contrat : format d'une note

C'est LA pièce centrale. L'appli écrit ce format, Claude Code le lit. On ne le casse pas.

Un fichier par note : `notes/<dossier>/<id>.md`

```markdown
---
id: 2026-08-28-143205
created: 2026-08-28T14:32:05+02:00
folder: idees-youtube
title: Idée de vidéo sur les subagents Claude Code
tags: [claude, agents, tuto]
status: raw          # raw = brut | processed = déjà exploité
duration_sec: 47
---

Texte brut de la transcription vocale ici, tel quel.
Plusieurs paragraphes possibles.
```

Règles du format :
- `id` = horodatage `YYYY-MM-DD-HHMMSS`, sert aussi de nom de fichier (`<id>.md`).
- `folder` = le dossier de rangement, reflété dans le chemin (`notes/<folder>/<id>.md`).
- `title` = généré depuis les premiers mots, éditable par l'utilisateur.
- `status` passe à `processed` une fois qu'on a tiré un contenu de la note.
- Le corps = transcription brute, jamais nettoyée par l'appli (c'est le job des
  slash commands).

---

## 2. Structure du projet mobile (Expo)

```
mobile/
├── src/
│   ├── app/                  # écrans (expo-router)
│   │   ├── index.tsx         # écran d'accueil : bouton d'enregistrement + notes récentes
│   │   ├── record.tsx        # écran d'enregistrement + dictée
│   │   ├── note/[id].tsx     # détail + édition d'une note
│   │   └── folders.tsx       # liste des dossiers / navigation
│   ├── notes/
│   │   ├── noteFormat.ts     # (dé)sérialisation frontmatter + corps  ← le contrat
│   │   ├── noteStorage.ts    # lire/écrire les fichiers .md dans notes/
│   │   └── useNotes.ts       # hook : liste, filtre par dossier/tag
│   ├── audio/
│   │   └── useRecorder.ts    # expo-audio : start/stop, fichier temporaire
│   └── components/           # petits composants réutilisables
├── app.json                  # config Expo
└── tsconfig.json             # TS strict
```

Pas de `transcribe.ts` : la dictée passe par le clavier système sur un
`TextInput` (voir §2bis), rien à coder côté transcription.

Le dossier `notes/` (celui que Syncthing synchronise) vit **en dehors** de `mobile/`,
à la racine du projet, pour être partagé avec le PC.

---

## 2bis. Décision technique : transcription on-device (100 % Expo Go)

Les maquettes montrent une transcription "en direct" pendant l'enregistrement.
Une vraie transcription live nécessiterait un module natif type
`expo-speech-recognition`, qui exige un dev client / build EAS — donc de sortir
d'Expo Go. Contraire à la contrainte "testé via Expo Go, pas d'App Store".

**Décision retenue : dictée du clavier système.** Sur l'écran d'enregistrement,
un `TextInput` est autofocus pendant que `expo-audio` enregistre l'audio (pour la
lecture ultérieure). L'utilisateur active la dictée native via le micro du
clavier iOS/Android pour obtenir le texte — zéro module natif, zéro dev client,
100 % Expo Go. Écart assumé avec la maquette : le texte n'apparaît pas "tout
seul" au fil de la parole (animation de la maquette), il apparaît via le
clavier système comme dans n'importe quel champ de texte iOS/Android.

Si un jour l'UX à bouton unique devient prioritaire, réévaluer un dev client
EAS (reste gratuit et local, aucun lien avec l'abonnement Claude).

## 3. Les écrans (MVP)

1. **Accueil (`index`)** — un gros bouton "Enregistrer", et en dessous la liste des
   dernières notes (titre + date + dossier). Tap sur une note → détail.
2. **Enregistrement (`record`)** — enregistre l'audio, lance la transcription
   on-device, affiche le texte obtenu, laisse choisir dossier + tags, puis "Sauver"
   écrit le fichier `.md` au bon format.

   Implémenté pour l'étape 2 du MVP sur l'écran unique (`index`, avant que
   dossiers/tags n'existent) : le dossier est fixé à `captures/` en dur, `tags`
   est toujours `[]`, `title` est dérivé des ~8 premiers mots de la
   transcription, `created` est en UTC (`Date.toISOString()`, pas d'offset
   local — pas de dépendance timezone pour si peu). Le fichier `.md` est écrit
   dans `Paths.document` (sandbox de l'app sur le téléphone, via
   `expo-file-system`), pas littéralement à la racine du repo : c'est ce
   dossier qu'infra-dev devra pointer avec Syncthing à l'étape 4. L'audio
   enregistré n'est pas encore persisté (pas de champ dans le contrat pour son
   chemin) — à revoir quand l'écran détail (lecture audio) sera construit.
3. **Détail de note (`note/[id]`)** — voir / éditer le texte, changer dossier/tags,
   supprimer.
4. **Dossiers (`folders`)** — liste des dossiers, nombre de notes, filtrage.

Post-MVP : recherche plein texte, marquage `processed`, export.

---

## 4. Sync (rempli par infra-dev)

Syncthing sur le Pi 4, service systemd au boot, partage du dossier `notes/` entre
téléphone, Pi et PC, sur le réseau local uniquement. Sauvegarde locale datée du
dossier `notes/`. Procédure détaillée à ajouter ici une fois installée.

---

## 5. Génération (Claude Code)

Sur le PC, dans le repo, Claude Code voit `notes/`. Pour produire un contenu :

```
/post-linkedin notes/idees-youtube/2026-08-28-143205.md
/script-youtube notes/idees-youtube/2026-08-28-143205.md
/thread-x       notes/idees-youtube/2026-08-28-143205.md
```

Chaque commande nettoie la transcription, trouve l'angle, et rédige dans le bon format.
Déclenché à la main = usage interactif = couvert par l'abonnement.
