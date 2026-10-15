#!/usr/bin/env bash
# installe sur le vps la mise à jour automatique de l'aperçu djamalii depuis github (à lancer une seule fois, en root) · by yanis
# après ça, chaque push sur la branche main est en ligne en moins d'une minute
# ne touche qu'au dossier de demo-djamalii : ni à nginx, ni à taysir, ni à habbozino, ni à leurs robots
# usage : bash installer.sh            (trouve tout seul le dossier servi par nginx)
#         bash installer.sh /var/www/x (si tu connais déjà le dossier)
set -euo pipefail
DOMAIN=demo-djamalii.habbozino.com
REPO=git@github.com:Shawliiath/djamalii-demo.git
SRC=/opt/djamalii-demo                      # le clone du dépôt sur le serveur
KEY=/root/.ssh/djamalii-demo-deploy         # clé en lecture seule, juste pour ce dépôt
stop() { echo; echo "STOP : $*"; echo "rien n'a été modifié sur le serveur."; exit 1; }

[ "$(id -u)" = 0 ] || stop "lance-le en root (sudo -i d'abord)"
command -v nginx >/dev/null || stop "nginx introuvable sur ce serveur"

# 1. tous les blocs server de nginx : leurs noms et leur dossier (le « root » du bloc lui-même, pas ceux des location)
# (on remet d'abord une instruction par ligne, pour que les blocs écrits sur une seule ligne soient lus aussi)
BLOCKS=$( (nginx -T 2>/dev/null || true) | sed -e 's/#.*//' -e 's/[{]/{\n/g' -e 's/[}]/\n}\n/g' -e 's/;/;\n/g' | awk '
  { l=$0; sub(/#.*/, "", l) }
  !inside && l ~ /^[ \t]*server[ \t]*\{/ { inside=1; depth=0; names=""; root="" }
  inside {
    if (l ~ /^[ \t]*server_name[ \t]/) { n=l; sub(/^[ \t]*server_name[ \t]+/, "", n); sub(/;.*/, "", n); names=names " " n }
    if (depth == 1 && root == "" && l ~ /^[ \t]*root[ \t]/) { r=l; sub(/^[ \t]*root[ \t]+/, "", r); sub(/;.*/, "", r); root=r }
    o=gsub(/\{/, "{", l); c=gsub(/\}/, "}", l); depth+=o-c
    if (depth <= 0) { gsub(/^ +| +$/, "", names); print root "\t" names; inside=0 }
  }' || true)
[ -n "$BLOCKS" ] || stop "nginx -T ne renvoie rien (configuration illisible ?)"

ROOT="${1:-}"
if [ -z "$ROOT" ]; then
  ROOT=$(awk -F'\t' -v d="$DOMAIN" '{ n=split($2, a, " "); for (i=1; i<=n; i++) if (a[i]==d && $1!="") { print $1; exit } }' <<< "$BLOCKS")
fi
[ -n "$ROOT" ] || { grep -rn "$DOMAIN" /etc/nginx/ 2>/dev/null || true; stop "je n'ai pas trouvé le dossier de $DOMAIN dans nginx. relance avec le dossier : bash installer.sh /chemin/du/site"; }
ROOT=$(realpath -m "$ROOT")
[ -d "$ROOT" ] || stop "le dossier $ROOT n'existe pas"

# 2. garde-fous : jamais un dossier système, jamais un dossier qui sert (ou contient, ou est contenu dans) un autre site
case "$ROOT" in
  /|/var|/var/www|/var/www/html|/srv|/opt|/root|/root/*|/etc|/etc/*|/usr|/usr/*|/bin|/bin/*|/sbin|/sbin/*|/lib*|/boot*|/proc*|/sys|/sys/*|/dev*|/run*|/tmp*) stop "$ROOT est un dossier système ou partagé, je n'y touche pas" ;;
esac
# ni /home ni le dossier perso d'un utilisateur (un sous-dossier dédié, oui)
[[ "$ROOT" =~ ^/home(/[^/]+)?$ ]] && stop "$ROOT est un dossier perso, je n'y touche pas"
while IFS=$'\t' read -r r names; do
  [ -n "$r" ] || continue
  r=$(realpath -m "$r")
  # ce bloc est-il celui de demo-djamalii ? (on compare les noms un par un, pas par morceau)
  read -ra list <<< "$names"
  mine=0; for n in "${list[@]}"; do [ "$n" = "$DOMAIN" ] && mine=1; done
  [ "$mine" = 1 ] && continue
  if [ "$r" = "$ROOT" ] || [[ "$r" == "$ROOT"/* ]] || [[ "$ROOT" == "$r"/* ]]; then
    stop "$ROOT est aussi lié au site « $names » (dossier $r). je ne veux pas risquer de l'écraser"
  fi
done <<< "$BLOCKS"
case "$ROOT" in *taysir*|*habbozino-cms*|*nitro*) stop "$ROOT ressemble au dossier d'un autre site, je n'y touche pas" ;; esac

# 3. on montre tout avant de faire quoi que ce soit
echo "site concerné : https://$DOMAIN"
echo "dossier qui sera mis à jour : $ROOT ($(find "$ROOT" -type f | wc -l) fichiers aujourd'hui)"
echo "copie de secours : $ROOT.avant-<date>"
echo "clone du dépôt : $SRC"
echo "robot : djamalii-demo-sync.timer (toutes les minutes, ne peut écrire que dans ces deux dossiers)"
echo "rien d'autre n'est modifié : ni nginx, ni taysir, ni habbozino."
read -r -p "on y va ? (o/n) " ok </dev/tty
[ "$ok" = "o" ] || stop "annulé"

for tool in git rsync; do command -v $tool >/dev/null || { apt-get update -qq && apt-get install -y -qq $tool; }; done

# 4. une copie de secours de ce qui est en ligne maintenant
backup="$ROOT.avant-$(date +%Y%m%d-%H%M%S)"
cp -a "$ROOT" "$backup"
echo "copie de secours : $backup"

# 5. si le dépôt est public, rien à faire dans github ; sinon une clé de déploiement (lecture seule) à y ajouter
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

# 6. le script qui récupère la dernière version et la copie dans le dossier du site
# seulement des fichiers simples : pas de liens, pas de php, rien de caché (le site est statique)
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
[ -f site/index.html ] || { echo "pas de site/index.html dans le dépôt, rien n'est copié"; exit 1; }
rsync -rt --no-links --chmod=D755,F644 --exclude='*.php' --exclude='*.phtml' --exclude='.*' site/ "$ROOT/"
echo "\$new" > "$ROOT/version.txt"
echo "en ligne : \$new"
EOF
chmod 755 /usr/local/bin/djamalii-demo-sync

# 7. toutes les minutes, enfermé : il ne peut écrire que dans le clone et dans le dossier du site
cat > /etc/systemd/system/djamalii-demo-sync.service <<EOF
[Unit]
Description=met à jour l'aperçu djamalii depuis github
[Service]
Type=oneshot
Environment=HOME=/root
ExecStart=/usr/local/bin/djamalii-demo-sync
TimeoutStartSec=120
Nice=10
IOSchedulingClass=idle
ProtectSystem=strict
ReadWritePaths=$SRC $ROOT
ProtectHome=read-only
PrivateTmp=yes
NoNewPrivileges=yes
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
systemctl start djamalii-demo-sync.service || echo "la première mise à jour a échoué, regarde : journalctl -u djamalii-demo-sync -n 30"
echo
echo "c'est en place : $(cat "$ROOT/version.txt" 2>/dev/null || echo 'regarde : journalctl -u djamalii-demo-sync')"
echo "vérifie : https://$DOMAIN/version.txt"
echo "pour tout arrêter et revenir à l'ancienne version : systemctl disable --now djamalii-demo-sync.timer && rsync -a --delete $backup/ $ROOT/"
