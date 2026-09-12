# HackCMU2026

Team verity's HackCMU 2026 project. Sep 11–12, 2026.

- Working agreement for parallel agents: `AGENTS.md`
- Shared interfaces and env vars: `docs/contracts.md`

## Math homework backend

See [backend setup and workflow](backend/README.md). The API supports PDF homework,
private answer keys, versioned rubrics, immediate hints and instructor-reviewed
final grades. Run `uv run python -m scripts.demo` from `backend/` for the complete
manual demo. API contracts are in [docs/contracts.md](docs/contracts.md).
