#!/usr/bin/env bash
# Runs the test suite under node:test.
#
# Two kinds of test live here: pure derivations (filter/sort/group), and the
# real Dexie persistence layer driven against fake-indexeddb.
#
# The app's tsconfig targets a bundler (extensionless relative imports), which
# Node cannot resolve on its own, so the relevant modules are compiled to
# CommonJS first. The output goes inside the project rather than a temp dir
# because the store tests require dexie and fake-indexeddb, and Node resolves
# those by walking up from the file's own location to node_modules.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

OUT=".test-build"
rm -rf "$OUT"
trap 'rm -rf "$OUT"' EXIT

npx --no-install tsc \
  src/lib/focuslist/logic.test.ts \
  src/lib/focuslist/store.test.ts \
  src/lib/focuslist/selectors.ts \
  src/lib/focuslist/palette.ts \
  src/lib/focuslist/types.ts \
  src/lib/focuslist/store.ts \
  src/lib/focuslist/seed.ts \
  --outDir "$OUT" \
  --module commonjs \
  --moduleResolution node \
  --target es2022 \
  --strict \
  --skipLibCheck \
  --esModuleInterop \
  --types node

# Point node at the emitted test files directly: its directory-scan mode does
# not reliably pick up a build directory like this one.
node --test "$OUT"/*.test.js
