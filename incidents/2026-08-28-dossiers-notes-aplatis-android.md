# Incident : dossiers de notes aplatis sur Android (stockage externe)

- **Période** : 2026-08-28 → 2026-08-30
- **Sévérité** : bloquant — aucune note n'était réellement accessible en lecture (`listNotes()` renvoyait toujours 0), la synchro Syncthing ne pouvait donc jamais démarrer.
- **Composant** : `mobile/src/notes/noteStorage.ts`, module natif Android de `expo-file-system`.

## Symptôme

Sur Android, l'appli est censée écrire les notes dans
`/storage/emulated/0/Documents/Voix/notes/<dossier>/`. En pratique, chaque
segment du chemin (`Documents`, `Voix`, `notes`, `<dossier>`) se retrouvait
créé **à plat** directement sous `/storage/emulated/0/`, au lieu d'être
imbriqué. Conséquence : `notesRoot()` pointait vers un chemin qui n'existait
jamais réellement, donc `root.exists` valait `false` et `listNotes()` ne
trouvait jamais rien. Un popup de debug ajouté dans l'appli (`debugSaveTrace`
/ `debugNotesStorage`, retirés depuis) permettait de rejouer la création
dossier par dossier et de voir l'aplatissement se produire à chaque niveau.

## Deux causes distinctes, empilées

### 1. Bug natif dans `expo-file-system@19.0.24` (Android)

Dans `JavaFile.kt` (`expo-file-system/android/.../unifiedfile/JavaFile.kt`),
`createDirectory()` et `createFile()` construisaient le nouvel élément avec :

```kotlin
val childFile = File(super<File>.parentFile, displayName)
```

`JavaFile` étend déjà `java.io.File` — `this` **est** le dossier cible.
Utiliser `super<File>.parentFile` (son parent) crée donc l'enfant un niveau
trop haut à chaque appel. Le contournement JS déjà en place dans le code
(avancer d'un niveau à la fois via `parent.createDirectory(name)`, à cause
d'un autre problème de permission Android documenté dans le code) rendait ce
bug systématique : chaque niveau de l'arborescence se retrouvait décalé.

**Fix** : patch via `patch-package`
(`mobile/patches/expo-file-system+19.0.24.patch`) — `File(this, displayName)`
au lieu de `File(super<File>.parentFile, displayName)`.

### 2. `expo-modules-autolinking` compile les modules Expo standards depuis un artefact précompilé, pas depuis le code source

Une fois le patch écrit, il n'avait **strictement aucun effet**, dans
n'importe quelle configuration testée : commits différents, `eas build
--clear-cache`, bump de version du module Gradle, nouveau profil de build
sans historique, et même un **build 100 % local** (SDK Android installé sur
la machine, aucun accès à EAS) sur une machine sans aucun cache Gradle
préexistant. Les 8 builds produits pendant l'investigation contenaient tous
un binaire strictement identique (même SHA-256), preuve que le patch
n'atteignait jamais le compilateur.

Cause réelle : sur Android, `expo-modules-autolinking` ne compile **pas**
les modules Expo standards depuis `node_modules/<pkg>/android` par défaut.
Il les résout via un descripteur de « publication »
(`groupId:artifactId:version`, ex. `host.exp.exponent:expo.modules.filesystem:19.0.24`)
et réutilise/republie un artefact précompilé identifié par ce triplet —
totalement indépendant du contenu réel du dossier source. Visible via :

```bash
npx expo-modules-autolinking resolve --platform android --json
# → "publication": { "repository": "local-maven-repo", "version": "19.0.24", ... }
```

Tant que la version npm ne change pas, **aucune modification du code source
natif ne peut jamais avoir d'effet**, patchée ou non.

**Fix** : ajouter dans le `package.json` de l'appli (pas `app.json` — cette
option précise est lue depuis le `package.json` par
`expo-modules-autolinking`, un chemin de code différent du reste de la
config Expo) :

```json
"expo": {
  "autolinking": {
    "buildFromSource": ["expo-file-system"]
  }
}
```

Option officielle et documentée d'`expo-modules-autolinking`
(« A list of package names to opt out of prebuilt Expo modules,
Android-only »). Confirmé par décompilation du `.dex` (via `jadx`) après
build : le code compilé correspond enfin au patch.

## Comment on a diagnostiqué

1. Trace pas à pas (`debugSaveTrace`) pour localiser exactement où le chemin
   redevenait plat → a pointé vers le bug natif (cause 1).
2. Patch + rebuild EAS → toujours cassé. Plusieurs hypothèses testées et
   éliminées une par une (mauvais build installé, cache EAS, permissions
   Android, git non commité) avant de suspecter un problème de build.
3. Preuve décisive : téléchargement direct des APK produits (`eas
   build:view --json` → `buildUrl`) et comparaison SHA-256 — tous
   identiques, y compris le tout premier build d'avant l'incident. Un
   marqueur de debug (`println` unique) injecté dans le patch, absent du
   `.dex` compilé même après un build 100 % local, a confirmé que le
   compilateur ne voyait jamais notre version du fichier.
4. Remontée du pipeline `eas-cli` local (`~/.npm/_npx/.../eas-cli-local-build-plugin`,
   `@expo/build-tools`) jusqu'à `android/settings.gradle` généré par
   `expo prebuild`, jusqu'à `expo-modules-autolinking resolve --json`, où le
   champ `"publication"` a révélé la cause réelle.

## Comment on aurait pu le voir plus vite

Le bug natif (cause 1) était repérable rapidement — la trace pas à pas
existait déjà et pointait dessus directement.

La cause 2, en revanche, était difficile à anticiper sans creuser : la
documentation d'EAS affirme explicitement que `eas build` « produit toujours
un artefact frais et n'invoque jamais de cache » (vrai pour le cache dont
elle parle — un système différent et sans rapport avec le mécanisme de
publication d'autolinking). Un signal a bien été vu tôt et écarté à tort :
en tout début d'investigation, une recherche de `buildCache` dans
`node_modules` était tombée sur
`expo-modules-core/expo-module-gradle-plugin/.../MavenPublicationExtension.kt`,
mais ce fichier a été interprété comme concernant uniquement la
*publication* du module par ses mainteneurs (un problème d'auteur de
package, pas de consommateur) — pas comme le mécanisme qui déciderait, à
*notre* build, d'utiliser ou non le code source patché. Creuser ce fichier
à ce moment-là, ou lancer `npx expo-modules-autolinking resolve --platform
android --json` dès qu'un patch natif semble n'avoir aucun effet (avant de
tester des hypothèses de cache), aurait mené à la vraie cause en quelques
minutes plutôt qu'après une dizaine de builds EAS.

**Règle à garder** : avant de patcher le code natif Android d'un module
Expo *officiel* (pas un module tiers) via `patch-package`, vérifier
d'abord `expo-modules-autolinking resolve --platform android --json` pour
ce module — si un champ `"publication"` est présent, ajouter le module à
`expo.autolinking.buildFromSource` dans `package.json` **avant** d'écrire
le patch, pas après avoir découvert qu'il ne sert à rien.
