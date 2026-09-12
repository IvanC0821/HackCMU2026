# HackCMU2026

Team verity's HackCMU 2026 project. Sep 11–12, 2026.

- Working agreement for parallel agents: `AGENTS.md`
- Shared interfaces and env vars: `docs/contracts.md`

## Math homework backend

See [backend setup and workflow](backend/README.md). The API supports PDF homework,
private answer keys, versioned rubrics, immediate hints and instructor-reviewed
final grades. Run `uv run python -m scripts.demo` from `backend/` for the complete
manual demo. API contracts are in [docs/contracts.md](docs/contracts.md).

## Debug frontend and project guide

Run `python3 -m http.server 3000 --bind 127.0.0.1 --directory frontend` from the
repository root, then open `http://localhost:3000/__debug__/`. This is an unlinked,
plain input/output console for the backend. See [frontend instructions](frontend/README.md)
and the comprehensive [project guide](PROJECT.md).
