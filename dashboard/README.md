# Dashboard de génération

Interface web locale pour parcourir `notes/` et générer un post/script/thread
d'un clic, sans taper les slash commands à la main. Zéro dépendance npm, zéro
build : Node `http` natif + une page HTML/CSS/JS statique.

## Lancer

```
./start.sh
```

Affiche l'URL locale (`http://127.0.0.1:4173` par défaut, `PORT` pour changer).
Le serveur n'écoute que sur `127.0.0.1` : injoignable depuis le téléphone ou un
autre appareil du réseau. Se lance à la main quand on veut générer du
contenu — ce n'est pas un service qui tourne en permanence.

Chaque clic sur un bouton de génération lance un appel unique et synchrone au
`claude` CLI déjà authentifié par abonnement (`claude -p ...`), exactement
l'équivalent de taper la commande soi-même dans le terminal : usage interactif
couvert par l'abonnement, jamais un appel automatique en tâche de fond (voir
le principe fondamental dans `CLAUDE.md`).

## Vérification

1. `./start.sh` → l'URL s'affiche.
2. Ouvrir la page : les notes existantes apparaissent, `notes/.stfolder` n'y
   figure pas comme un faux dossier.
3. Un bouton par commande découverte dans `.claude/commands/` apparaît sur
   chaque note.
4. Cliquer un bouton sur une vraie note (⚠️ déclenche un vrai appel facturé
   sur l'abonnement) → l'état de chargement s'affiche, puis le texte généré,
   puis "Copier" met bien le texte dans le presse-papiers.
5. `curl -X POST http://127.0.0.1:4173/api/generate -H 'Content-Type: application/json' -d '{"notePath":"../../etc/passwd","command":"post-linkedin"}'`
   → `400 unknown_note`, aucun process `claude` lancé.
6. `Ctrl+C` pendant une génération → `ps aux | grep claude` ne montre aucun
   process orphelin.
7. Depuis un autre appareil du réseau : `http://<ip-lan-du-pc>:4173/` doit être
   injoignable.
