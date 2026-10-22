#!/usr/bin/env bash
# Keep the committed dashboard build in sync with the source it is built from.
#
# The published package ships dist/client so an install needs no build step
# (package.json "files" lists dist/client). That makes a stale bundle possible:
# edit src/, commit, and the installed dashboard still serves the old client.
# This hook rebuilds and stages dist/client whenever src/ or vite config change.
set -euo pipefail

git config core.hooksPath scripts/git-hooks
chmod +x scripts/git-hooks/pre-commit
echo "hooks installed: core.hooksPath=scripts/git-hooks"
