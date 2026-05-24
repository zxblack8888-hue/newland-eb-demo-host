#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/zxblack8888-hue/newland-eb-demo-host.git}"
APP_DIR="${APP_DIR:-/opt/newland-eb-demo-host}"
APP_USER="${APP_USER:-newland-eb}"
HTTP_PORT="${HTTP_PORT:-8080}"
VT_PORT="${VT_PORT:-2323}"
TN5250_PORT="${TN5250_PORT:-25250}"
TN3270_PORT="${TN3270_PORT:-23270}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script with sudo."
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl git ufw

if ! command -v node >/dev/null 2>&1 || ! node --version | grep -Eq '^v(20|21|22|23|24|25)\.'; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
fi

if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --all --prune
  git -C "$APP_DIR" reset --hard origin/main
else
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

install -m 0644 "$APP_DIR/deploy/newland-eb-demo-host.service" /etc/systemd/system/newland-eb-demo-host.service
sed -i "s/^Environment=HTTP_PORT=.*/Environment=HTTP_PORT=$HTTP_PORT/" /etc/systemd/system/newland-eb-demo-host.service
sed -i "s/^Environment=VT_PORT=.*/Environment=VT_PORT=$VT_PORT/" /etc/systemd/system/newland-eb-demo-host.service
sed -i "s/^Environment=TN5250_PORT=.*/Environment=TN5250_PORT=$TN5250_PORT/" /etc/systemd/system/newland-eb-demo-host.service
sed -i "s/^Environment=TN3270_PORT=.*/Environment=TN3270_PORT=$TN3270_PORT/" /etc/systemd/system/newland-eb-demo-host.service

systemctl daemon-reload
systemctl enable newland-eb-demo-host
systemctl restart newland-eb-demo-host

ufw allow OpenSSH
ufw allow "$HTTP_PORT/tcp"
ufw allow "$VT_PORT/tcp"
ufw allow "$TN5250_PORT/tcp"
ufw allow "$TN3270_PORT/tcp"
ufw --force enable

systemctl --no-pager --full status newland-eb-demo-host || true

echo
echo "Newland EB Demo Host installed."
echo "HTTP port: $HTTP_PORT"
echo "VT port: $VT_PORT"
echo "TN5250 port: $TN5250_PORT"
echo "TN3270 port: $TN3270_PORT"
echo
echo "Oracle Cloud Security List / Network Security Group must also allow:"
echo "- TCP $HTTP_PORT"
echo "- TCP $VT_PORT"
echo "- TCP $TN5250_PORT"
echo "- TCP $TN3270_PORT"
