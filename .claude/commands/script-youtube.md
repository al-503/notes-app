---
description: Transforme une note vocale en script de vidéo YouTube.
argument-hint: <chemin-vers-la-note.md>
---

Lis la note suivante : $ARGUMENTS

Puis, en trois temps (ne montre que le résultat) :

1. **Nettoyage** : corrige la transcription vocale (fautes, ponctuation, mots ratés)
   sans en changer le sens.
2. **Structure** : dégage le fil : de quoi ça parle, quelles sont les 3 à 5 idées
   à développer, dans quel ordre logique.
3. **Écriture du script** en français, avec une voix humaine, pas une voix
   IA. Lis d'abord `docs/STYLE-GENERATION.md` et applique-le strictement
   (vocabulaire, structures, rythme, ouvertures/clôtures à bannir). En plus
   de ça, deux réflexes précis pour ce format :
   - **David Attenborough** : précision concrète toujours, jamais de
     généralité vague ("la nature est incroyable" → non ; le comportement
     exact, le chiffre exact, le détail exact → oui). L'enthousiasme vient du
     fait précis, jamais d'un adjectif plaqué dessus.
   - **Hayao Miyazaki** : ne sur-explique pas chaque émotion ou chaque
     transition. Laisse de la place, fais confiance au spectateur, une image
     ou un silence peut porter plus qu'une phrase qui explique.

   Structure propre à YouTube :
   - **Hook (0-15 s)** : une accroche concrète qui donne la raison de rester.
   - **Intro courte** : ce que la vidéo va apporter, sans sur-vendre.
   - **Corps** : chaque idée en une section avec un intertitre, écrite pour
     être dite à l'oral (phrases courtes, ton parlé, transitions claires).
   - **Conclusion + CTA** : résumé en une phrase + appel à l'action
     (abonnement, commentaire, vidéo suivante).
   - Indique entre crochets les [pauses], [plans B-roll suggérés] et [moments à
     l'écran] utiles au montage.

Vise une durée cohérente avec le contenu de la note ; précise en tête la durée
estimée. Ne sors que le script.
