# pi-local-stats (local fork)

Fork of [TellyD/pi-local-stats](https://github.com/TellyD/pi-local-stats) 0.0.4 with local
changes. Installed into pi from this repository, not from npm.

## What this fork adds

| Change | Where |
|---|---|
| Success-rate timeline (daily, per model) | `server/success-rate.ts`, `src/components/dashboard/SuccessRateChart.tsx` |
| Per-model reliability ranking and by-brand breakdown | `server/brand-stats.ts`, `BrandBreakdown.tsx`, `ModelSuccessBars.tsx` |
| Brand filter (deepseek, qwen, glm, kimi, minimax, mimo, grok, ...) | `server/model-brand.ts`, filter bar in `src/App.tsx` |
| Per-provider timeline when a brand is selected | `ProviderSuccessRateChart.tsx` |
| Fix: duplicate `skill_usages` id aborted the whole sync ("Statistics unavailable") | `server/session-parser.ts` |

## Install

```bash
pi remove npm:pi-local-stats
pi install https://github.com/<account>/pi-local-stats@v0.1.0
```

`dist/client` is committed, so an install needs no build step. The server files are
loaded as TypeScript through jiti, so they need no build either.

## Publish a change

```bash
./scripts/publish-fork.sh --account <github-user> --tag v0.1.0
```

The script builds, tests, commits the shipped client, installs the git hooks, creates or
reuses the repo, pushes the branch and tag, then swaps the pi package entry.

`scripts/git-hooks/pre-commit` rebuilds and stages `dist/client` when `src/` is staged, so
the committed bundle cannot drift from the source. Set `SKIP_DIST_BUILD=1` for a
server-only commit.

## Update from upstream

```bash
git fetch https://github.com/TellyD/pi-local-stats.git main
git rebase FETCH_HEAD
```

The first commit in this history is the untouched upstream 0.0.4 tree
(`upstream v0.0.4 baseline`), so `git diff 6abf6f0..HEAD` is the complete local delta.
