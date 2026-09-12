# HackCMU2026

## Combined student + teacher app

This integration branch connects both interfaces to **one persistent backend**.
Teacher-published homework appears for students. Their PDFs, page mappings and
revision history appear for staff. Reviewed scores and general feedback return
only to the submitting student. The staff chart refreshes automatically every
1.5 seconds from shared records, including during the sample simulator.

**GitHub displays the source; it does not run the Python server.** To try the
connected app on your computer (Node.js and Python 3.12+ with `uv` installed):

```sh
git clone --branch agent/integration/connected-classroom https://github.com/IvanC0821/HackCMU2026.git
cd HackCMU2026/frontend/student
npm ci
cd ../../backend
uv sync
uv run python run_classroom.py
```

Open **http://127.0.0.1:3004/** in two separate tabs. The launcher creates private
72-hour access codes in `backend/data/classroom/access-codes.json`. Enter the
`instructor` code in one tab and the `student` code in the other. Don't share or
commit that file. Each tab keeps its own login; the server checks account roles.

### Try the connected flow

1. Teacher: open Homework 1 → Grading standards → Use sample materials →
   Finalize grading standard. Alternatively attach your own reference PDFs and
   enter the questions and scoring bands.
2. Student: the assignment appears automatically. Upload a PDF, select every page
   for each question, then submit. Use **Hand in this version** for final hand-in.
3. Teacher: open the Review queue. The original PDF and mapped pages appear there.
   Select scoring bands, explain changes, skim each question, and complete review.
4. Student: scores and general feedback update automatically. Upload another
   revision to preserve history; the teacher chart compares first and latest work.
5. For an instant deterministic chart demonstration, open the teacher's **student
   walkthrough** with the unchanged sample standard. Check incomplete, corrected,
   and alternative work. This is explicitly a fictional structured-matrix demo.

**Privacy:** students cannot retrieve staff workspace data, solution/reference
PDFs, private notes, draft questions, or other students' submissions. Scores are
server-derived; students cannot submit their own grades. Concurrent stale staff
saves are rejected instead of overwriting new student work.

**Current boundary:** arbitrary uploaded PDFs are saved for manual review; this
adapter does not yet invoke the native AI grading pipeline. It never attaches a
fixture score or invented error coordinates to real work. The standalone grading
API remains available separately. This is a loopback development demo, not a
production deployment or university SSO integration.

Validation: 72 backend tests passed (2 paid-service tests skipped), 66 staff/shared
frontend tests passed, and 7 student model tests passed. The new integration checks
cover privacy, stale writes, immutable uploads, page maps, revisions and chart
changes from 80% first attempt to 100% latest attempt without counting pending as zero.

Details: [connection contract](docs/classroom-connection.md).

---

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

## One-click sample homework

From `backend/`, run `uv run python -m scripts.debug_server`, then open
`http://localhost:3000/__debug__/` and click **Run sample homework**. Sample PDFs,
accounts, rubric, grading and hints are supplied automatically. No tokens or AI
keys needed. See [the quick start](PROJECT.md#quick-start-no-manual-setup-in-the-page).
