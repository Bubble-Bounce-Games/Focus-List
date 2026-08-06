# Project conventions

## Paths

* Never write absolute filesystem paths (e.g. /home/xxx/..., /root/...) anywhere in code, imports, or configs.
* Always use paths relative to the project root, or resolve them at runtime (e.g. path.join(__dirname, ...) in JS/Node, pathlib.Path(__file__).resolve().parent in Python).
* Treat this project's root directory as the actual repository root — do not assume any other sandbox path or folder name.

## Commits

* Use Conventional Commits format for every commit: fix:, feat:, feat!: (breaking change), chore:, docs:, refactor:, test:, etc.
* Don't push directly to main for anything beyond trivial fixes — open a PR instead.

## Versioning routine (run before every push to main)

1. Read the current version from the project's version file (package.json, pyproject.toml, VERSION, or equivalent — use whichever exists in this repo).
2. Decide the bump based on the commits since the last tag: patch for fix:, minor for feat:, major for any feat!: or commit with a BREAKING CHANGE note.
3. Update the version file (and changelog, if one exists) to the new version.
4. Set git identity for this commit:
   git config user.name "COMMIT_NAME"
   git config user.email "COMMIT_EMAIL"
5. Commit with message: "chore: bump version to vX.Y.Z"
6. Create a git tag vX.Y.Z and push both the commit and the tag.
7. Never skip this routine and never guess a version bump without checking the actual commit history since the last tag.

## Secrets

* Never commit real secret values. .env.secrets is git-ignored and must stay that way.
* Use .env.example to document variable names only — no real values, ever.
* Before any commit, run `git status` and confirm no secret files appear as tracked/staged.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
