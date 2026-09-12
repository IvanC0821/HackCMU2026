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
uv run python import_classroom_dataset.py --replay-recorded
uv run python run_classroom.py
```

Open **http://127.0.0.1:3004/**. **No login or access code is needed.** Use the
**Student** and **TA / Professor** tabs at the top to switch perspectives. You can
also open each perspective in a separate browser tab; both use the same saved data.

**Open demo: everyone can view and edit staff materials. Use dummy data only.**
The student selector opens any of the twelve synthetic students. Everyone can switch to the teacher. This is intentional for the
hackathon walkthrough, not a secure multi-user classroom.

### Current dataset and real test results

The importer loads all **26 PDFs**, the professor's six-question/40-point standard,
ten past professor grades, and two new submissions. The command above replays the
recorded AI assessments at no API cost: **Hiro 38.5/40; Wesley 37/40**. Each matched
the hidden professor grade on all 19 parts. These are recorded results, not fresh
live grading. Select a student and click **View submission**; open the teacher's
Review queue or Overview to see the same records and live chart.

**PDF feedback:** small numbered badges connect to matched lines or related work
with thin leader lines. The same numbers appear in the feedback panel. Hover to
highlight the work; click or keyboard-focus to open a short, solution-free popup;
Escape closes it. Popups stay closed when opening a submission or changing questions.
Markers track page changes and zoom. Context-only locations are explicitly labeled, not presented as exact
mistaken lines. Image-only scans still need OCR-backed locations.

Existing local databases can add these locations without regrading or paid calls:
`uv run python refresh_classroom_annotations.py` from `backend/`, then restart the
server. New imports and recorded-result replay include them automatically.

For a new paid test instead, start with `uv run python import_classroom_dataset.py --grade-new`
before replaying recorded results. Requires the existing server-side OpenAI key.
Completed grades are never overwritten or silently re-run. The measured real calls
took **74.86 and 92.63 seconds**. [Full test report and limits](docs/dataset-test-run.md).

Optional private mode: `uv run python run_classroom.py --private` restores access-code
sign-in. Only that mode uses the locally generated 72-hour codes in
`backend/data/classroom/access-codes.json`; never commit or share that file.

### Generate a readable rubric

With a server-side `OPENAI_API_KEY`, start `uv run python run_classroom.py --allow-ai`.
Open **TA / Professor → Grading standards → Generate a rubric from your PDFs**.
Confirm the per-request paid-AI consent, then **Generate AI draft**. The normal
launcher remains AI-off; no model calls occur just by opening the site.

The generator uses the saved assignment, professor solution, guidelines and graded
examples. Every included PDF page supplies both text and an image. Limits: 30 PDFs,
160 pages, 40 MiB rendered images. The current 14 references / 107 pages passed the
local preflight; hidden keys and new student attempts are not inputs.

Drafts explain expected work, observable scoring conditions, valid alternatives,
required formatting/graphs and minor-error treatment. Source pages and error-check
exceptions stay visible to staff. Requirements and scoring explanations use multiline
fields. Generated policies appear in General grading instructions for review.

Generation is asynchronous and can take several minutes. Stop waiting does not
cancel the provider request; selecting Generate AI draft again at the same workspace
revision resumes that job. There are no automatic paid retries. No rubric is published,
student graded, or previous grade changed until separate explicit staff actions.
Concurrent workspace edits prevent stale draft import. This is rubric generation,
not automatic grading of new browser uploads.

Local tests use a mocked provider; live quality of this new prompt is **not yet
verified**. A fresh paid test requires explicit approval. Examples provide reference
context; they do not retrain the underlying model.

### Try another connected assignment

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

**Perspectives:** the student screen contains published questions, its own submissions
and general feedback. The staff screen includes reference PDFs, private notes and
reviews. Anyone can switch to staff in the default open demo; these are views, not
security boundaries. `--private` restores backend role enforcement. Concurrent stale
staff saves are still rejected instead of overwriting new student work.

**Current boundary:** arbitrary uploaded PDFs are saved for manual review; paid AI
grading is currently the explicit dataset CLI pilot, not the native upload pipeline. It never attaches a
fixture score or invented error coordinates to real work. The standalone grading
API remains available separately. This is a loopback development demo, not a
production deployment or university SSO integration.

Validation: 102 backend tests passed (2 paid-service tests skipped), 77 staff/shared
frontend tests passed, and 14 student tests passed. The new integration checks
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
