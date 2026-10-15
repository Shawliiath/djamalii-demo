#!/usr/bin/env bash
# installe sur le vps la mise à jour automatique de l'aperçu djamalii depuis github (à lancer une seule fois, en root) · by yanis
# après ça, chaque push sur la branche main est en ligne en moins d'une minute
# usage : bash installer.sh            (trouve tout seul le dossier servi par nginx)
#         bash installer.sh /var/www/x (si tu connais déjà le dossier)
set -euo pipefail
DOMAIN=demo-djamalii.habbozino.com
REPO=git@github.com:Shawliiath/djamalii-demo.git
SRC=/opt/djamalii-demo                      # le clone du dépôt sur le serveur
KEY=/root/.ssh/djamalii-demo-deploy         # clé en lecture seule, juste pour ce dépôt

[ "$(id -u)" = 0 ] || { echo "lance-le en root (sudo -i d'abord)"; exit 1; }
for tool in git rsync; do command -v $tool >/dev/null || { apt-get update -qq && apt-get install -y -qq $tool; }; done

# 1. le dossier que nginx sert pour demo-djamalii (premier « root » du bloc server qui porte ce nom)
ROOT="${1:-}"
if [ -z "$ROOT" ]; then
  ROOT=$(nginx -T 2>/dev/null | awk -v d="$DOMAIN" '
    { l=$0; sub(/#.*/, "", l) }
    !inside && l ~ /^[ \t]*server[ \t]*\{/ { inside=1; depth=0; found=0; root="" }
    inside {
      if (l ~ /server_name/ && index(l, d)) found=1
      # seulement le root du bloc server lui-même (profondeur 1), pas ceux des blocs location
      if (depth == 1 && root == "" && l ~ /^[ \t]*root[ \t]/) { r=l; sub(/^[ \t]*root[ \t]+/, "", r); sub(/;.*/, "", r); root=r }
      n=gsub(/\{/, "{", l); m=gsub(/\}/, "}", l); depth+=n-m
      if (depth <= 0) { if (found && root != "") { print root; exit } inside=0 }
    }')
fi
if [ -z "$ROOT" ] || [ ! -d "$ROOT" ]; then
  echo "je n'ai pas trouvé le dossier du site. voilà ce que nginx dit de $DOMAIN :"
  grep -rn "$DOMAIN" /etc/nginx/ 2>/dev/null || true
  echo "relance avec le dossier en argument : bash installer.sh /chemin/du/site"
  exit 1
fi
echo "dossier du site : $ROOT"

# 2. une copie de secours de ce qui est en ligne maintenant
backup="$ROOT.avant-$(date +%Y%m%d-%H%M%S)"
cp -a "$ROOT" "$backup"
echo "copie de secours : $backup"

# 3. si le dépôt est public, rien à faire dans github ; sinon une clé de déploiement (lecture seule) à y ajouter
export GIT_TERMINAL_PROMPT=0
if git ls-remote -q https://github.com/Shawliiath/djamalii-demo.git HEAD >/dev/null 2>&1; then
  REPO=https://github.com/Shawliiath/djamalii-demo.git
  SSHCMD=""
  echo "dépôt public : pas de clé à ajouter"
else
  mkdir -p /root/.ssh && chmod 700 /root/.ssh
  [ -f "$KEY" ] || ssh-keygen -q -t ed25519 -N "" -C "djamalii-demo-deploy@$(hostname)" -f "$KEY"
  echo
  echo "=== ajoute cette clé dans github : dépôt djamalii-demo > Settings > Deploy keys > Add deploy key"
  echo "=== titre : vps, et laisse « Allow write access » décoché"
  echo
  cat "$KEY.pub"
  echo
  read -r -p "quand c'est ajouté, appuie sur Entrée " _ </dev/tty
  SSHCMD="ssh -i $KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
fi
export GIT_SSH_COMMAND="${SSHCMD:-ssh}"
if [ -d "$SRC/.git" ]; then git -C "$SRC" remote set-url origin "$REPO"; git -C "$SRC" fetch -q origin main; else git clone -q "$REPO" "$SRC"; fi

# 4. le script qui récupère la dernière version et la copie dans le dossier du site
cat > /usr/local/bin/djamalii-demo-sync <<EOF
#!/usr/bin/env bash
# récupère la dernière version de l'aperçu djamalii sur github et la met en ligne · by yanis
set -euo pipefail
export GIT_TERMINAL_PROMPT=0 GIT_SSH_COMMAND="${SSHCMD:-ssh}"
cd "$SRC"
git fetch -q origin main
new=\$(git rev-parse origin/main)
[ "\$new" = "\$(cat "$ROOT/version.txt" 2>/dev/null || true)" ] && exit 0
git reset -q --hard origin/main
rsync -a site/ "$ROOT/"
echo "\$new" > "$ROOT/version.txt"
echo "en ligne : \$new"
EOF
chmod 755 /usr/local/bin/djamalii-demo-sync

# 5. toutes les minutes, comme pour taysir
cat > /etc/systemd/system/djamalii-demo-sync.service <<EOF
[Unit]
Description=met à jour l'aperçu djamalii depuis github
[Service]
Type=oneshot
ExecStart=/usr/local/bin/djamalii-demo-sync
EOF
cat > /etc/systemd/system/djamalii-demo-sync.timer <<EOF
[Unit]
Description=met à jour l'aperçu djamalii toutes les minutes
[Timer]
OnBootSec=1min
OnUnitActiveSec=1min
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now djamalii-demo-sync.timer >/dev/null
/usr/local/bin/djamalii-demo-sync
echo
echo "c'est en place. vérifie : https://$DOMAIN/version.txt"
echo "pour revenir à l'ancienne version : systemctl disable --now djamalii-demo-sync.timer && rsync -a --delete $backup/ $ROOT/"
