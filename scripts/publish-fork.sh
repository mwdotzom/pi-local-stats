#!/usr/bin/env bash
# Publish the fork and install it into pi, replacing the upstream npm package.
#
# Why the fork exists: this repo carries pi-local-stats 0.0.4 plus local
# changes (success-rate timeline, per-model and per-brand reliability, brand
# filter, and the skill_usages sync-crash fix). The upstream npm package cannot
# be patched in place: `pi update --extensions` reinstalls it and drops the
# changes, and pi-sync-webdav never syncs the npm/ directory that holds them.
#
# Usage:
#   scripts/publish-fork.sh --account <github-user> [--repo pi-local-stats]
#                          [--tag v0.1.0] [--ref <branch-or-tag>]
#                          [--install-only] [--no-install]
#
# Requirements: gh authenticated (gh auth login), git, npm.
set -euo pipefail

ACCOUNT=""
REPO="pi-local-stats"
TAG="v0.1.0"
REF=""
INSTALL_ONLY=0
DO_INSTALL=1

while [ $# -gt 0 ]; do
  case "$1" in
    --account) ACCOUNT="${2:?}"; shift 2 ;;
    --repo) REPO="${2:?}"; shift 2 ;;
    --tag) TAG="${2:?}"; shift 2 ;;
    --ref) REF="${2:?}"; shift 2 ;;
    --install-only) INSTALL_ONLY=1; shift ;;
    --no-install) DO_INSTALL=0; shift ;;
    -h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

cd "$(dirname "$0")/.."
ROOT=$(pwd)
say() { printf '\n== %s\n' "$*"; }

say "checking prerequisites"
command -v gh >/dev/null || { echo "gh not found" >&2; exit 1; }
command -v npm >/dev/null || { echo "npm not found" >&2; exit 1; }
if ! gh auth status >/dev/null 2>&1; then
  cat >&2 <<'MSG'
gh is not authenticated. Run this first, in your own terminal:

    gh auth login --hostname github.com --git-protocol https --web

Choose HTTPS (not SSH) so the pushed remote needs no ssh key, then re-run this
script.
MSG
  exit 1
fi
gh auth setup-git >/dev/null 2>&1 || true
LOGIN=$(gh api user --jq .login)
say "authenticated as $LOGIN"
if [ -z "$ACCOUNT" ]; then
  ACCOUNT="$LOGIN"
  say "no --account given, publishing to the authenticated account: $ACCOUNT"
else
  say "publishing to $ACCOUNT (override of authenticated $LOGIN)"
fi

say "building the dashboard client (shipped in the package)"
npm run build
npm test

say "committing the shipped build (dist/client is gitignored by default)"
if git check-ignore -q dist/client; then
  # Keep vite's own output dirs ignored, but ship the client the package needs.
  python3 - <<'PY'
import pathlib
path = pathlib.Path(".gitignore")
lines = path.read_text().splitlines()
out = []
for line in lines:
    if line.strip() == "dist":
        out.append("# dist/client is committed on purpose: package.json files")
        out.append("# lists it, so an install from git needs no build step.")
        out.append("/dist/client")
        continue
    out.append(line)
path.write_text("\n".join(out) + "\n")
PY
fi
npm run build
git add -A
if ! git diff --cached --quiet; then
  git -c user.name="${GIT_AUTHOR_NAME:-$(git config user.name)}" \
      -c user.email="${GIT_AUTHOR_EMAIL:-$(git config user.email)}" \
      commit -q -m "build: ship dist/client so installs need no build step"
fi

say "ensuring the hooks that stop a stale bundle"
./scripts/install-hooks.sh

REMOTE="https://github.com/$ACCOUNT/$REPO.git"
if gh repo view "$ACCOUNT/$REPO" >/dev/null 2>&1; then
  say "repo $ACCOUNT/$REPO already exists, reusing it"
else
  say "creating public repo $ACCOUNT/$REPO"
  gh repo create "$ACCOUNT/$REPO" --public \
    --description "pi-local-stats fork: success-rate timeline, brand filter and reliability stats" \
    --source "$ROOT" --remote origin --push
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$REMOTE"
fi
git remote set-url origin "$REMOTE"
say "pushing branch and tags to $REMOTE"
git push -u origin HEAD
git tag -f "$TAG" >/dev/null
git push --force origin "$TAG"

TARGET_REF="${REF:-$TAG}"
say "fork published: https://github.com/$ACCOUNT/$REPO (ref $TARGET_REF)"

if [ "$INSTALL_ONLY" = "1" ]; then
  exit 0
fi
if [ "$DO_INSTALL" = "0" ]; then
  say "skipped pi install (--no-install). To install:"
  echo "  pi remove npm:pi-local-stats"
  echo "  pi install \"$REMOTE\"@$TARGET_REF"
  exit 0
fi

say "replacing the upstream npm package in pi"
if pi list 2>/dev/null | grep -q '^  npm:pi-local-stats'; then
  pi remove npm:pi-local-stats
else
  say "npm:pi-local-stats not installed, nothing to remove"
fi
pi install "$REMOTE@$TARGET_REF"

say "verifying the installed package"
pi list | grep -A1 'pi-local-stats' || true
CHECK=$(pi list | grep -A1 'pi-local-stats' | tail -1 | tr -d ' ')
if [ -n "$CHECK" ] && [ -d "$CHECK" ]; then
  grep -q "successTimeline" "$CHECK/server/types.ts" \
    && echo "ok: fork code present ($CHECK)" \
    || { echo "warning: installed copy lacks the fork changes: $CHECK" >&2; }
  [ -d "$CHECK/dist/client" ] \
    && echo "ok: shipped client present" \
    || echo "warning: dist/client missing in $CHECK" >&2
fi
say "done. Restart pi, then run /stats and /reload in the dashboard session."
