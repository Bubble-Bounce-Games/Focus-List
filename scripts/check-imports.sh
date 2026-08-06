#!/usr/bin/env bash
# check-imports.sh — exits 0 when the tree is coherent, 1 when it is broken.
# Catches two failure modes, both silent until someone clones the repo:
#   (A) an "@/..." import that resolves to no file on disk
#   (B) a source file that exists on disk but is excluded by .gitignore
# No build, no network, no manual step. Runs in well under a second.

set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

SRC_DIR="src"
fail=0

# Resolve "@/x/y" -> src/x/y with the extensions a bundler would try.
resolve() {
  local spec="$1" base="${SRC_DIR}/${1#@/}"
  for cand in "$base.ts" "$base.tsx" "$base.js" "$base.jsx" "$base.mjs" \
              "$base/index.ts" "$base/index.tsx" "$base/index.js"; do
    [ -f "$cand" ] && { printf '%s' "$cand"; return 0; }
  done
  return 1
}

# ---- (A) unresolvable alias imports -----------------------------------------
while IFS= read -r spec; do
  [ -z "$spec" ] && continue
  if ! target=$(resolve "$spec"); then
    echo "MISSING MODULE: $spec  (no file at ${SRC_DIR}/${spec#@/}.{ts,tsx,js,jsx}/index.*)"
    grep -rln --include='*.ts' --include='*.tsx' "from \"$spec\"" "$SRC_DIR" \
      | sed 's/^/    imported by: /'
    fail=1
  fi
done < <(grep -rhoE '@/[A-Za-z0-9._/-]+' "$SRC_DIR" --include='*.ts' --include='*.tsx' | sort -u)

# ---- (B) source files present locally but ignored by git --------------------
while IFS= read -r f; do
  if ignore_rule=$(git check-ignore -v "$f" 2>/dev/null); then
    echo "IGNORED SOURCE: $f"
    echo "    rule: $ignore_rule"
    fail=1
  fi
done < <(find "$SRC_DIR" -type f \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null)

# ---- (C) every source file is actually tracked ------------------------------
while IFS= read -r f; do
  git ls-files --error-unmatch "$f" >/dev/null 2>&1 || {
    echo "UNTRACKED SOURCE: $f  (would vanish on a fresh clone)"
    fail=1
  }
done < <(find "$SRC_DIR" -type f \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null)

if [ "$fail" -eq 0 ]; then
  echo "OK: all @/ imports resolve; all src files tracked and unignored."
else
  echo "FAIL: tree will not compile from a fresh clone."
fi
exit "$fail"
