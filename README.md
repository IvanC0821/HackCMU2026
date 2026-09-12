# HackCMU2026

Team verity's HackCMU 2026 project. Sep 11–12, 2026.

- Working agreement for parallel agents: `AGENTS.md`
- Shared interfaces and env vars: `docs/contracts.md`

## Math homework backend

The hosted setup uses **Supabase Postgres and private Storage**. Follow
[Supabase setup](backend/README.md#configure-supabase) and fill the root
`.env.example` placeholders in your local `.env` before starting the API and worker.

See [backend setup and workflow](backend/README.md). The API supports PDF homework,
private answer keys, versioned rubrics, immediate hints and instructor-reviewed
final grades. Run `uv run python -m scripts.demo` from `backend/` for the complete
manual demo. API contracts are in [docs/contracts.md](docs/contracts.md).

## Debug frontend and project guide

Run `python3 -m http.server 3000 --bind 127.0.0.1 --directory frontend` from the
repository root, then open `http://localhost:3000/__debug__/`. This is an unlinked,
plain input/output console for the backend. See [frontend instructions](frontend/README.md)
and the comprehensive [project guide](PROJECT.md).

## One-click sample homework

From `backend/`, run `uv run python -m scripts.debug_server`, then open
`http://localhost:3000/__debug__/` and click **Run sample homework**. Sample PDFs,
accounts, rubric, grading and hints are supplied automatically. No tokens or AI
keys needed. See [the quick start](PROJECT.md#quick-start-no-manual-setup-in-the-page).
