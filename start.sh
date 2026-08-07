#!/usr/bin/env bash
# Focus List launcher.
#
#   bash start.sh          start the app and open it, then return to the prompt
#   bash start.sh stop     stop it
#   bash start.sh status   is it running, and where
#   bash start.sh setup    one-time: make http://focus-list.local work (sudo)
#
# The server is detached, so this script always exits instead of sitting on the
# terminal. It never prompts for a password on the default path either — the
# sudo step lives in `setup` and nowhere else.

set -uo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-9000}"
DOMAIN="focus-list.local"
SERVER="./.next/standalone/server.js"
PID_FILE=".focus-list.pid"
LOG_FILE="server.log"

say()  { printf '\033[1;34m▸\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# Only a process LISTENING counts. A plain `lsof -i:PORT` also matches a browser
# holding an open connection, which would look like a running server.
listener_pid() { lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1; }

# --connect-timeout keeps a blocked port from stalling the whole script.
probe() { curl -sf -o /dev/null --connect-timeout 1 --max-time 3 "$1"; }

stop_app() {
  local pid
  pid="$(listener_pid)"
  if [ -z "$pid" ] && [ -f "$PID_FILE" ]; then pid="$(cat "$PID_FILE")"; fi

  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null
    for _ in $(seq 1 20); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.25
    done
    kill -9 "$pid" 2>/dev/null
    ok "stopped (pid $pid)"
  else
    say "not running"
  fi
  rm -f "$PID_FILE"
}

show_status() {
  local pid
  pid="$(listener_pid)"
  if [ -n "$pid" ]; then
    ok "running on port $PORT (pid $pid)"
  else
    say "not running"
  fi
  probe "http://$DOMAIN" && ok "http://$DOMAIN reachable" ||
    warn "http://$DOMAIN not reachable — 'bash start.sh setup' to enable it"
  probe "http://localhost:$PORT" && ok "http://localhost:$PORT reachable"
}

case "${1:-start}" in
  stop)   stop_app; exit 0 ;;
  status) show_status; exit 0 ;;
  setup)
    say "setting up $DOMAIN (needs your password)"
    APP_PORT="$PORT" sudo ./scripts/local-domain.sh install ||
      die "setup failed"
    exit 0
    ;;
  start) ;;
  *) die "usage: bash start.sh [start|stop|status|setup]" ;;
esac

# --- prerequisites ----------------------------------------------------------
command -v node >/dev/null 2>&1 || die "node is not installed — https://nodejs.org"
command -v npm  >/dev/null 2>&1 || die "npm is not installed — comes with Node"

# --- already running? -------------------------------------------------------
if [ -n "$(listener_pid)" ]; then
  ok "already running on port $PORT"
else
  # --- dependencies ---------------------------------------------------------
  if [ ! -d node_modules ] || [ package.json -nt node_modules/.package-lock.json ]; then
    say "installing dependencies (first run takes a minute)"
    npm install --no-audit --no-fund >/dev/null 2>&1 || die "npm install failed — run 'npm install' to see why"
    # A no-op install leaves the marker untouched, so without this the check
    # above would fire on every launch.
    touch node_modules/.package-lock.json
  fi

  # --- build, only when stale -----------------------------------------------
  if [ ! -f "$SERVER" ] ||
     [ -n "$(find src public package.json next.config.ts -newer "$SERVER" -print -quit 2>/dev/null)" ]; then
    say "building (only happens when something changed)"
    npm run build >/dev/null 2>&1 || die "build failed — run 'npm run build' to see why"
  fi

  # --- start, detached ------------------------------------------------------
  say "starting on port $PORT"
  NODE_ENV=production PORT="$PORT" nohup node "$SERVER" > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  disown 2>/dev/null || true

  ready=0
  for _ in $(seq 1 40); do
    if probe "http://localhost:$PORT"; then ready=1; break; fi
    kill -0 "$(cat "$PID_FILE")" 2>/dev/null || break
    sleep 0.5
  done

  if [ "$ready" -ne 1 ]; then
    warn "server did not answer on port $PORT — last output:"
    tail -20 "$LOG_FILE" 2>/dev/null | sed 's/^/    /'
    stop_app
    die "startup failed"
  fi
fi

# --- pick the nicest URL that actually works --------------------------------
URL="http://$DOMAIN"
if ! probe "$URL"; then
  URL="http://localhost:$PORT"
  warn "$DOMAIN not set up — using $URL"
  warn "run once to enable the short URL:  bash start.sh setup"
fi

ok "Focus List is at $URL"
open "$URL" 2>/dev/null || true
say "leave it running; 'bash start.sh stop' when you are done"
