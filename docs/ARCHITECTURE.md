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

## 2bis. Décision technique : transcription on-device (historique)

Première approche (abandonnée) : dictée du clavier système sur un `TextInput`,
pour rester 100 % Expo Go. En usage réel, la double manipulation (bouton de
l'app puis micro du clavier séparément) était confuse — pas le comportement
attendu ("j'appuie sur le micro de l'app et le texte apparaît").

**Décision retenue (revue) : dev client + `expo-speech-recognition`.** L'appli
sort d'Expo Go pur ; elle tourne maintenant via un client de dev buildé une
fois avec EAS Build (`eas.json`, profil `development`) et installé
manuellement sur le téléphone (toujours gratuit, toujours local, toujours pas
d'App Store — juste un binaire perso à la place d'Expo Go). Le bouton micro de
l'app déclenche directement `ExpoSpeechRecognitionModule.start()`
(reconnaissance vocale native iOS/Android), le texte apparaît au fil de la
parole via l'événement `result` (`src/audio/useSpeechToText.ts`). `expo-audio`
est retiré : la forme d'onde utilise l'événement `volumechange` du module de
reconnaissance vocale, qui peut aussi persister l'audio plus tard
(`recordingOptions.persist`) si besoin pour l'écran détail.

Limite connue : chaque `start()` ouvre une nouvelle session de dictée — arrêter
puis relancer remplace le texte plutôt que de l'accumuler. Pas géré pour
l'instant (pas demandé, complexité réelle avec l'édition manuelle).

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

**Étape 3 du MVP (dossiers/tags + écran de liste)** — implémentée : `index` est
l'écran d'accueil (liste des notes via `listNotes()`, bouton "Enregistrer" vers
`/record`, lien "Dossiers" vers `/folders`, filtrable par `?folder=` en
paramètre de route). `record` a un sélecteur de dossier (chips des dossiers
existants + "+ Nouveau" pour en créer un à la volée) et un champ tags (chips
+ saisie libre), câblés sur `saveNote(transcript, durationMillis, folder,
tags)`. `folders` liste les dossiers avec leur nombre de notes
(`listFolders()`), tap → accueil filtré. `note/[id]` reste en lecture seule.

**Étape 3, dernier manque comblé** : `note/[id]` a maintenant un mode édition
(bouton "Éditer" → titre/texte/dossier/tags modifiables, "Enregistrer" ou
"Annuler") et un bouton "Supprimer" (confirmation via `Alert.alert`).
`noteStorage.ts` : `updateNote(currentFolder, id, updates)` déplace le fichier
si le dossier change (`File.move`) puis réécrit le contenu ;
`deleteNote(folder, id)` supprime le fichier. `FolderPicker` et `TagEditor`
extraits en composants partagés (`src/components/`) — utilisés par `record` et
`note/[id]`, pour ne pas dupliquer une 3e fois le même sélecteur.

Pas encore fait (pas dans le contrat actuel) : renommer un dossier/tag
partout d'un coup (il faut éditer note par note).

**Accueil aligné sur la maquette** (`design-handoff/.../images/Acceuil_avec_note.png`,
`Acceuil_sans_note.png`) :
sous-titre "X notes cette semaine", bouton grille → `/folders`, barre de
recherche (filtre titre/corps/tags, client-side, pas de recherche plein texte
indexée), chips de dossier ("Tout" + dossiers existants), compteur "X au
total", carte avec durée + pastille dossier + date relative
(`notes/format.ts` : `formatDuration`, `formatRelativeDate`), gros bouton micro
circulaire avec halo en bas plutôt que la pilule "Enregistrer". Ajout de
`@expo/vector-icons` (bundlé avec `expo`, juste jamais installé) pour les
icônes (loupe, micro) plutôt que de les dessiner à la main. État vide géré
(`Acceuil_sans_note.png`) : barre de recherche en pointillés désactivée, mic
discret, titre + sous-titre + 3 étapes numérotées, CTA "Enregistrer ma
première note".

**Écran d'enregistrement aligné sur la maquette**
(`images/Enregistrement_en_cours.png`) : minuteur central en gros, badge
"EN ÉCOUTE" (visible seulement pendant l'enregistrement), forme d'onde animée
sur le vrai niveau audio (`isMeteringEnabled` sur `expo-audio`, converti en
barres dans `Waveform`), bouton stop (carré blanc) au lieu du micro pendant
l'enregistrement. Le bloc "TRANSCRIPTION" garde le vrai mécanisme (dictée
clavier sur `TextInput`, cf. §2bis) — seul l'habillage change, pas la logique.
Le sélecteur dossier/tags et le bouton Sauver (propres à notre écran fusionné,
pas dans cette maquette précise) restent en dessous, inchangés.

**Alignement sur le panneau système de design** (`images/Systéme_Design.png`) :
- `danger` corrigé `#FF5C5C` → `#FF7A7A` (couleur exacte du panneau).
- `accent` reste `#6366F1` (indigo choisi explicitly par l'utilisateur, pas
  `#7C5CFF` du panneau — décision confirmée, ne pas revenir dessus).
- Échelle typo revue dans `ThemedText` (`themed-text.tsx`) pour coller aux
  specs : Titre d'écran 30/800 (`title`), Titre de note 24/800 (`title` +
  `fontSize` local), Titre de carte 17/700 (nouveau type `cardTitle`, utilisé
  par `NoteCard`), Corps 16/400 (`default`), Extrait/secondaire 14/400
  (`small`), Étiquette de section 12/700 + tracking (nouveau type
  `sectionLabel`, remplace les combos `type="small" + style letterSpacing`
  dupliqués dans 3 écrans).
- `NoteCard` : retour tactile pression → 0,97 d'échelle (`cardPressed`), comme
  spécifié ("toute la carte est tactile").
- Pas touché (déjà proche, ou coût > bénéfice) : l'échelle d'espacement de
  base (4/8/12/18/22/34 dans le panneau vs notre `Spacing` en 2/4/8/16/24/32/64
  — décalage mineur, changer la base casserait beaucoup d'écrans pour un
  gain visuel faible).

---

## 4. Sync (Pi ↔ PC ↔ téléphone, fait)

Syncthing installé sur le Pi 4 (`sudo apt install syncthing`) et sur le PC,
tous deux en service persistant (`syncthing@<user>.service` + `loginctl
enable-linger` sur le Pi ; `systemctl --user enable --now syncthing.service`
sur le PC — le PC restant allumé/connecté quand on veut synchroniser). Dossier
partagé `voix-notes` : `notes-app/notes/` sur le PC, `~/voix-notes` sur le Pi.
Config faite via l'API REST de Syncthing (`PUT /rest/config/devices/...` puis
`/rest/config/folders/voix-notes`), pas besoin de passer par l'interface web.
Réseau local uniquement, adresses `tcp://192.168.x.x:22000`, zéro cloud.

**Point bloquant côté téléphone (résolu) :** `Paths.document` d'expo-file-system
sur Android pointe vers le stockage **privé** de l'app
(`/data/data/<package>/files`), invisible pour toute autre app y compris
Syncthing — aucune permission ne débloque ça, c'est le sandboxing Android.
Décision : `notesRoot()` (`noteStorage.ts`) écrit maintenant dans un dossier
**public** sur Android (`/storage/emulated/0/Documents/Voix/notes`), derrière
la permission spéciale `MANAGE_EXTERNAL_STORAGE` ("Accès à tous les
fichiers"). Cette permission ne peut pas être demandée par une popup normale :
`expo-intent-launcher` ouvre l'écran système dédié
(`MANAGE_APP_ALL_FILES_ACCESS_PERMISSION`), affiché via un bandeau sur
l'accueil (`canAccessNotesStorage()` détecte si l'accès manque). iOS n'a pas
cet équivalent — `Paths.document` (sandbox) y reste utilisé tel quel,
problème à retraiter séparément si le projet vise iOS un jour.

**Deuxième piège (résolu) : `expo-file-system` refuse de créer du neuf en
stockage externe.** Même la permission `MANAGE_EXTERNAL_STORAGE` accordée,
`Directory.create()`/`File.create()`/`File.write()` valident la permission
d'écriture **sur la cible elle-même** avant de la créer — et `File.canWrite()`
côté Android vaut toujours `false` sur un chemin qui n'existe pas encore,
donc ça échoue systématiquement ("missing write permission") pour tout
fichier/dossier réellement nouveau hors des dossiers internes de l'app
(`getInternalPathPermissions` dans `expo-modules-core` accorde un accès
inconditionnel aux dossiers internes, mais pas à un chemin externe comme
`Documents/Voix/notes`). Corrigé dans `noteStorage.ts` : on ne crée plus
jamais un chemin imbriqué en une fois ; `ensureDirectory()`/`ensureFile()`
avancent d'un niveau à la fois via `.createDirectory()`/`.createFile()` du
dossier **parent** (qui, lui, existe déjà au moment de l'appel — la
validation porte sur lui, pas sur la cible inexistante).

**Téléphone (fait) :** Syncthing-Fork (`com.github.catfriend1.syncthingandroid`,
pas l'app officielle — plus activement maintenue) installé, appairé au PC, et
dossier `voix-notes` ajouté manuellement avec le même Folder ID pointant vers
`Documents/Voix/notes`, partagé avec le device du PC. Vérifié via l'API REST
du PC (`/rest/db/completion?device=...&folder=voix-notes`) : `remoteState:
"valid"`, complétion 100 %.

Piège rencontré : Syncthing-Fork a affiché une erreur bloquante `insufficient
space on disk for database` sur les deux dossiers alors que le téléphone
n'était qu'à ~50 % de stockage utilisé. Bug connu de longue date sur
syncthing-android/syncthing-fork (seuil `minDiskFree`, 1 % par défaut, mal
calculé sur `/data`, déconnecté du pourcentage global affiché dans les
Paramètres Android — cf. issue GitHub #1527 du repo archivé). Résolu en
vidant le cache de l'appli (pas les données, pour ne pas perdre l'identité
de l'appareil déjà appairé).

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

### Dashboard web local

Pour éviter de taper les commandes à la main et copier le résultat depuis la
conversation, `dashboard/` fournit une page web locale (`./dashboard/start.sh`,
détails dans `dashboard/README.md`) : liste des notes, un bouton par commande
découverte dans `.claude/commands/`, résultat affiché avec un bouton "Copier".

Zéro dépendance npm, zéro build : Node `http` natif (Node 22,
`--experimental-strip-types`), et `dashboard/lib/notes.js` **réutilise
directement** `mobile/src/notes/noteFormat.ts` via `require()` (le fichier est
du TS effaçable, sans import RN/Expo — testé, ça marche tel quel) plutôt que
de dupliquer le parseur du contrat de note.

Chaque clic reste un appel synchrone unique à `claude -p "/<commande> <note>"`
sur le CLI déjà authentifié par abonnement (jamais de clé API — `generate.js`
la retire explicitement de l'env de l'enfant par précaution), avec
`--allowedTools Read,Glob,Grep` + `--disallowedTools Write,Edit,...` en
défense en profondeur : la génération ne peut que lire, jamais écrire. Serveur
bindé sur `127.0.0.1` uniquement, lancé à la main, pas de service systemd —
reste un outil qu'on ouvre pour générer, pas un démon permanent. Toujours
"usage interactif = couvert par l'abonnement", juste avec un clic à la place
d'une commande tapée.
