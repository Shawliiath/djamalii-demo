# Djamalii · aperçu du site

Aperçu du futur site de Djamalii (robes d'intérieur pudiques, made in Algeria), en ligne sur https://demo-djamalii.habbozino.com

- `site/` : le site lui-même (HTML, CSS, JavaScript, images). Rien à construire, ce dossier est servi tel quel.
- `vps/installer.sh` : à lancer **une seule fois** sur le VPS, en root. Il retrouve le dossier que nginx sert pour `demo-djamalii.habbozino.com`, en fait une copie de secours, crée une clé de déploiement en lecture seule (à ajouter dans GitHub, Settings > Deploy keys), puis installe une mise à jour automatique toutes les minutes.

## Mettre en ligne

Une fois l'installation faite : tout ce qui arrive sur la branche `main` est en ligne en moins d'une minute. `./deploy.sh "ce qui a changé"` envoie et attend que ce soit vraiment en ligne, comme pour Taysir.
https://demo-djamalii.habbozino.com/version.txt affiche le commit en ligne.

## Ce qu'il faut savoir

- C'est un aperçu : le formulaire de liste d'attente et la commande ne s'envoient nulle part, et les prix et tailles sont des exemples (ils sont dans `site/script.js`, en haut).
- Les dessins des robes et du journal viennent du TikTok de la marque (@djamalii_).
- La page n'est pas indexée par les moteurs de recherche (`noindex`).
- Après une modification du CSS ou du JavaScript, change le `?v=` dans `site/index.html` pour que les navigateurs prennent la nouvelle version.
