#!/usr/bin/env bash
# Runs the pure-logic tests under node:test.
#
# The app's tsconfig targets a bundler (extensionless relative imports), which
# Node cannot resolve on its own. So compile just the browser-free modules to
# CommonJS in a temp dir and run the built output — no test runner dependency,
# no jsdom, no config file.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

npx --no-install tsc \
  src/lib/focuslist/logic.test.ts \
  src/lib/focuslist/selectors.ts \
  src/lib/focuslist/palette.ts \
  src/lib/focuslist/types.ts \
  --outDir "$OUT" \
  --module commonjs \
  --moduleResolution node \
  --target es2022 \
  --strict \
  --skipLibCheck \
  --esModuleInterop \
  --types node

# Point node at the emitted test files directly: its directory-scan mode does
# not pick up a temp dir outside the working tree.
node --test "$OUT"/*.test.js
