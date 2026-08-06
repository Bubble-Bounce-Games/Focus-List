#!/usr/bin/env bash
# Focus List launcher.
#
#   ./start.sh          from a terminal
#   Focus-List.command  double-click in Finder (a one-line wrapper around this)
#
# Installs dependencies and builds only when something has actually changed, so
# the usual launch is near-instant. Starts the production server, sets up
# http://focus-list.local the first time (asking for sudo only if the domain is
# not already working), opens the browser, and shuts the server down on Ctrl+C.

set -uo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-3000}"
DOMAIN="focus-list.local"
SERVER="./.next/standalone/server.js"
SERVER_PID=""

say()  { printf '\033[1;34m▸\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    say "stopping Focus List"
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
  fi
}
trap cleanup EXIT INT TERM

# --- prerequisites ----------------------------------------------------------
command -v node >/dev/null 2>&1 || die "node is not installed — https://nodejs.org"
command -v yarn >/dev/null 2>&1 || die "yarn is not installed — 'npm i -g yarn'"

# --- dependencies -----------------------------------------------------------
if [ ! -d node_modules ] || [ package.json -nt node_modules/.yarn-integrity ]; then
  say "installing dependencies"
  yarn install || die "yarn install failed"
  # A no-op install leaves .yarn-integrity untouched, so without this the
  # timestamp check above would fire on every single launch.
  touch node_modules/.yarn-integrity
fi

# --- build, only when stale -------------------------------------------------
needs_build=0
if [ ! -f "$SERVER" ]; then
  needs_build=1
elif [ -n "$(find src public package.json next.config.ts -newer "$SERVER" -print -quit 2>/dev/null)" ]; then
  needs_build=1
fi

if [ "$needs_build" -eq 1 ]; then
  say "building (only happens when something changed)"
  yarn build >/dev/null 2>&1 || die "build failed — run 'yarn build' to see why"
fi

# --- is something already on the port? --------------------------------------
# -sTCP:LISTEN matters: a plain `lsof -i:PORT` also matches browsers holding an
# established connection to it, which would look like a running server.
if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  warn "port $PORT is already in use — assuming Focus List is already running"
else
  say "starting server on port $PORT"
  NODE_ENV=production PORT="$PORT" node "$SERVER" >/dev/null 2>&1 &
  SERVER_PID=$!

  for _ in $(seq 1 40); do
    curl -sf -o /dev/null --max-time 1 "http://localhost:$PORT/" && break
    sleep 0.25
  done

  curl -sf -o /dev/null --max-time 1 "http://localhost:$PORT/" ||
    die "server did not come up on port $PORT"
fi

# --- prefer the friendly URL, set it up if needed ---------------------------
URL="http://$DOMAIN"
if ! curl -sf -o /dev/null --max-time 2 "$URL"; then
  if [ -t 0 ]; then
    # Interactive: a password prompt here is expected and fine.
    warn "$DOMAIN is not serving yet — setting it up (needs your password once)"
    if sudo ./scripts/local-domain.sh install; then
      sleep 1
    else
      warn "domain setup was skipped or failed"
    fi
  else
    # No terminal to prompt on; never block waiting for a password.
    warn "$DOMAIN not reachable and no terminal for sudo"
    warn "run once: sudo ./scripts/local-domain.sh install"
  fi
fi

if ! curl -sf -o /dev/null --max-time 2 "$URL"; then
  URL="http://localhost:$PORT"
  warn "falling back to $URL"
  warn "to fix the nice URL: sudo ./scripts/local-domain.sh install"
fi

say "Focus List is at $URL"
open "$URL" 2>/dev/null || true

# Nothing to wait on if we attached to an already-running server.
if [ -n "$SERVER_PID" ]; then
  say "press Ctrl+C to stop"
  wait "$SERVER_PID"
fi
