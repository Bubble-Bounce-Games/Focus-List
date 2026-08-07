#!/usr/bin/env bash
# Serves the app at http://focus-list.local instead of http://localhost:9000.
#
# Two separate problems, handled independently so you can take just the first:
#
#   1. Name    focus-list.local must resolve to 127.0.0.1. A marked block in
#              /etc/hosts. Permanent, survives reboots.
#   2. Port    A bare http:// URL means port 80, and only root may bind ports
#              below 1024. Rather than running the whole Next server as root,
#              a pf rule redirects 127.0.0.1:80 to 127.0.0.1:9000.
#
# The pf rule is loaded into a nested anchor under "com.apple", which the stock
# /etc/pf.conf already references with `rdr-anchor "com.apple/*"`. That means
# this never edits your firewall configuration — a wrong edit there is far
# worse than a redirect that needs re-applying. The trade-off is that the rule
# is cleared by a reboot; re-run `install` (or just `port`) afterwards.
#
#   sudo ./scripts/local-domain.sh install     name + port
#   sudo ./scripts/local-domain.sh port        port redirect only (after reboot)
#   sudo ./scripts/local-domain.sh uninstall   remove both
#        ./scripts/local-domain.sh status      report, no sudo needed
#
# Only the hosts file is modified, and only inside its marked block.

set -euo pipefail

DOMAIN="focus-list.local"
APP_PORT="${APP_PORT:-9000}"
HOSTS_FILE="/etc/hosts"
ANCHOR="com.apple/focus-list"
BEGIN="# BEGIN focus-list"
END="# END focus-list"

die() { echo "error: $*" >&2; exit 1; }

require_root() {
  [ "$(id -u)" -eq 0 ] ||
    die "this needs root: sudo ./scripts/local-domain.sh ${1:-install}"
}

require_macos() {
  [ "$(uname -s)" = "Darwin" ] ||
    die "this script is macOS-specific (it uses pf); on Linux use iptables or a reverse proxy"
}

install_host() {
  if grep -qF "$BEGIN" "$HOSTS_FILE"; then
    echo "hosts:  already present, refreshing"
    remove_host
  fi
  # Only an IPv4 record: with no AAAA the browser will not try ::1, which the
  # inet-only redirect below would not catch.
  {
    echo "$BEGIN"
    echo "127.0.0.1 $DOMAIN"
    echo "$END"
  } >> "$HOSTS_FILE"
  dscacheutil -flushcache 2>/dev/null || true
  killall -HUP mDNSResponder 2>/dev/null || true
  echo "hosts:  $DOMAIN -> 127.0.0.1"
}

remove_host() {
  [ -f "$HOSTS_FILE" ] || return 0
  # Delete only the marked block; everything else is left byte-for-byte alone.
  sed -i '' "/^${BEGIN}\$/,/^${END}\$/d" "$HOSTS_FILE"
  dscacheutil -flushcache 2>/dev/null || true
  killall -HUP mDNSResponder 2>/dev/null || true
}

install_port() {
  printf 'rdr pass on lo0 inet proto tcp from any to 127.0.0.1 port 80 -> 127.0.0.1 port %s\n' \
    "$APP_PORT" | pfctl -a "$ANCHOR" -f - 2>/dev/null
  # -E bumps a reference count rather than a plain on/off, so this does not
  # stomp on anything else that has enabled pf.
  pfctl -E 2>/dev/null || true
  echo "port:   80 -> $APP_PORT (cleared on reboot; re-run 'port' to restore)"
}

remove_port() {
  pfctl -a "$ANCHOR" -F nat 2>/dev/null || true
  echo "port:   redirect removed"
}

status() {
  echo "domain: $DOMAIN"
  if grep -qF "$BEGIN" "$HOSTS_FILE" 2>/dev/null; then
    echo "hosts:  installed"
  else
    echo "hosts:  not installed"
  fi

  if command -v dig >/dev/null 2>&1; then
    resolved="$(dig +short +time=1 +tries=1 "$DOMAIN" @127.0.0.1 2>/dev/null | head -1)"
    [ -n "$resolved" ] && echo "dns:    resolves to $resolved"
  fi

  if [ "$(id -u)" -eq 0 ]; then
    if pfctl -a "$ANCHOR" -s nat 2>/dev/null | grep -q "port = 80"; then
      echo "port:   redirect active"
    else
      echo "port:   redirect not active"
    fi
  else
    echo "port:   (re-run with sudo to inspect the pf anchor)"
  fi

  if curl -sf -o /dev/null --max-time 2 "http://localhost:$APP_PORT/"; then
    echo "server: responding on localhost:$APP_PORT"
  else
    echo "server: nothing on localhost:$APP_PORT — start it with 'bash start.sh'"
  fi
}

case "${1:-status}" in
  install)
    require_macos; require_root install
    install_host; install_port
    echo
    echo "open http://$DOMAIN"
    ;;
  host)      require_macos; require_root host;      install_host ;;
  port)      require_macos; require_root port;      install_port ;;
  uninstall)
    require_macos; require_root uninstall
    remove_host; remove_port
    echo "removed. $DOMAIN no longer resolves locally."
    ;;
  status)    status ;;
  *)         die "usage: $0 {install|host|port|uninstall|status}" ;;
esac
