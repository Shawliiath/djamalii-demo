#!/usr/bin/env bash
# envoie l'aperçu djamalii sur github et attend qu'il soit vraiment en ligne, comme pour taysir · by yanis
# usage : ./deploy.sh "ce qui a changé"
# (il faut que vps/installer.sh ait été lancé une fois sur le vps, sinon personne ne récupère github là-bas)
set -euo pipefail
cd "$(dirname "$0")"
site=https://demo-djamalii.habbozino.com

git add -A
if ! git diff --cached --quiet; then
  msg="${1:-}"
  if [ -z "$msg" ] && [ -t 0 ]; then read -r -p "ce qui a changé (en deux mots) : " msg; fi
  git commit -q -m "${msg:-small changes}"
fi
git pull -q --rebase origin main
git push -q origin HEAD:main
want=$(git rev-parse HEAD)
echo "envoyé sur github, le vps met en ligne (ça prend en général moins d'une minute)..."

for _ in $(seq 1 40); do
  sleep 5
  live=$(curl -fsS "$site/version.txt?t=$(date +%s)" 2>/dev/null || true)
  if [ "$live" = "$want" ]; then echo "c'est en ligne : $site"; exit 0; fi
done
echo "toujours pas en ligne après 3 minutes ($site/version.txt doit afficher $want)"
echo "si version.txt n'existe pas du tout, l'installateur n'a pas encore été lancé sur le vps : bash vps/installer.sh"
exit 1
