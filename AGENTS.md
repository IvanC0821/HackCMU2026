# AGENTS.md — HackCMU 2026 (team verity)

Read this before touching the repo. It exists so several agents (human or AI) can build in parallel without stepping on each other.

## Ground rules

1. **One agent, one branch, one area.** Every agent works on its own branch and owns one directory. Nobody edits outside their area without a PR into that area's owner branch.
2. **`main` is never edited directly.** All changes reach `main` through a pull request. The integrator merges; agents don't merge their own PRs into `main`.
3. **Contracts before code.** Anything two areas share (API routes, data shapes, env vars, event names) is written in `docs/contracts.md` first. Change the contract in a PR, then change the code.
4. **Small, frequent commits.** Push at least every 30 minutes during the hack. A branch that hasn't pushed in an hour is assumed dead.
5. **Rebase, don't merge, when syncing with `main`.** `git fetch origin && git rebase origin/main`. Resolve conflicts on your branch, never on `main`.

## Branch naming

```
agent/<agent-name>/<short-task>
```

Examples: `agent/frontend/landing-page`, `agent/backend/auth-api`, `agent/ml/embedding-pipeline`.

One task per branch. When the task is done and merged, delete the branch and start a new one.

## Ownership map

Fill this in at kickoff. An area with no owner is frozen until someone claims it.

| Area | Directory | Owner branch prefix | Owner |
|---|---|---|---|
| Frontend | `frontend/` | `agent/frontend/*` | |
| Backend / API | `backend/` | `agent/backend/*` | |
| Data / ML | `ml/` | `agent/ml/*` | |
| Infra / deploy | `infra/` | `agent/infra/*` | |
| Docs / pitch | `docs/` | `agent/docs/*` | |
| Integration | `main` | (merges only) | |

Shared files that need the integrator's approval to change: `AGENTS.md`, `docs/contracts.md`, `README.md`, root config files (`package.json`, `pyproject.toml`, `.env.example`, CI).

## Workflow for every agent

```bash
git fetch origin
git switch -c agent/<name>/<task> origin/main   # always branch from fresh main
# ...work only inside your directory...
git add <your-dir>
git commit -m "<area>: <what changed>"
git push -u origin agent/<name>/<task>
gh pr create --base main --fill                  # request the integrator
```

Before opening the PR: `git rebase origin/main`, run your area's tests, and confirm `git diff --name-only origin/main` only lists files in your directory (plus anything the contract PR allowed).

## Commit message format

```
<area>: <imperative summary>
```

`frontend: add results table`, `backend: return 404 on unknown id`, `contracts: add /score response shape`.

## Merge order

The integrator merges in this order to keep `main` runnable: contracts → backend → ml → frontend → infra → docs. If a PR breaks `main`, it's reverted, not patched on `main`.

## Conflicts

If two branches touch the same file, the later PR rebases. If the file is outside both owners' directories, it's a contract file and the change goes through `docs/contracts.md` first.

## Env and secrets

Never commit secrets. Add every variable to `.env.example` with a placeholder and document it in `docs/contracts.md`. Real values live in each machine's `.env` (gitignored).

## Definition of done for a PR

- Only files in your area (or contract-approved files) changed
- Rebased on current `main`
- Runs locally from a clean checkout following `README.md`
- PR description says what it does and how to test it in 3 lines
