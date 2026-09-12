# Teaching workspace

The root page now starts with **Homeworks**, with **Homework 1** as the initial
assignment. Open it to switch between **Graded homeworks** and **Grading standards**.
The aesthetic stays minimal; the flow is no longer a Gradescope replica.

## Try the prototype

Run `npm run build` in `frontend/` and open `preview.html` manually, or run
`npm start` and visit the root page. Then:

1. Open Homework 1 → Grading standards → Use demo PDFs.
2. Inspect the blank assignment, instructor solution, and past graded example.
3. Review each question's prompt, PDF page mappings, expected response type and
   work, and editable point deductions. Save standards.
4. Return to Graded homeworks → Review → Run demo check.
5. Switch questions and reference documents, adjust deductions, and approve the
   demo grade as Professor. The Teaching assistant role can review but not approve.

The built-in student has correct results but omits row-operation labels, the final
column-vector form, and the explicit induction conclusion. Default deductions give
7/10 and 9/10, for 16/20. These are fictional demonstration policies.

## Page assignments

Teacher question setup stores `assignmentPages` and `solutionPages` separately,
plus `form` and `expectedWork`. Lists use 1-based PDF page numbers and can include
multiple nonconsecutive pages. Student submissions have their own question-to-page
mapping in `submission.questionPages`; it must never be inferred from teacher page
numbers. The student mapping UI is a later task; this demo maps Q1 to page 1 and Q2
to page 2. New questions without mapped student pages cannot be checked.

## Current limits

This is a **scripted frontend prototype**, not live GPT grading or model training.
PDFs selected by the user stay in memory in the browser; no file contents are
uploaded. The built-in demo findings do not scan arbitrary files. Custom references,
question structure, prompts, instructions, or rules require manual review. Editing
point values changes the actual demo score. Unsaved changes invalidate proposals;
previously approved demo snapshots remain in history. All changes reset on refresh.

The role selector is a demo control, not production authorization. Saving and
approval affect this tab only. The original backend/API debug workflow remains
at `/__debug__/` and was not changed by this instructor UI pass. No backend
contracts, credentials, provider configuration, or real grades were modified.

Generated PDFs and rendered page previews are in `output/pdf/homework-1/`.
Regenerate with `python frontend/tools/homework_fixtures.py` from the repository
root using an environment with reportlab and Poppler's `pdftoppm`.

## Validation

`npm test` includes 27 tests covering API helpers, the earlier classroom prototype,
and this instructor workflow. Instructor tests verify page-map independence,
deductions, stale-proposal invalidation, PDF selection, role restrictions, and
rendered markup/events through a small DOM fixture. They are not browser layout
tests. All eight generated PDF pages were rendered and visually inspected.

Live browser/responsive QA is still pending: this session could not bind a local
server, and its browser URL policy blocked file previews.

Design context is in `.impeccable.md`; vault reference: [[Frontend Design Toolbox]].

## Debug frontend

<!-- TODO: Replace temporary Verity branding before launch. -->

## Easiest way to try it

From `backend/`, run `uv sync --frozen`, then:

```bash
uv run python -m scripts.debug_server
```

Open **http://localhost:3000/__debug__/** and click **Run sample homework**.
It supplies sample accounts, homework/answer-key PDFs, a rubric, and an example
mistake automatically. Read the hint, then click **Approve sample grade as teacher**
to see the finalized 2/10. You do not need to enter tokens, IDs or JSON.
This is a fixed, clearly labeled manual grading demonstration; it does not call AI.

The launcher uses a temporary database and a separate API on port 8001. It does not
use the ordinary backend database on port 8000. Ctrl+C clears the temporary demo.
Stop an existing static server on port 3000 first, or choose `--port` and `--api-port`.
The old request console remains available under **Advanced**.

The two generated sample PDFs are in `frontend/output/pdf/`. Regenerate them from
`backend/` with `uv run python -m scripts.generate_samples` (development dependencies).

## Run the debug console

No build step or runtime npm dependencies. From the repository root:

```bash
python3 -m http.server 3000 --bind 127.0.0.1 --directory frontend
```

Open **http://localhost:3000/__debug__/**. Start the backend on port 8000 using
[its setup instructions](../backend/README.md). Paste locally provisioned staff
and student tokens; provider credentials belong only in the backend environment.
The console stores no tokens in localStorage, sessionStorage, cookies, or logs.

Use **Who am I?** with the student token to fill its user ID, then switch to staff
and create a course, enroll the student, upload an answer key, create an assignment,
import the sample rubric, and publish it. Switch to student to upload homework,
read its regions, and register the submission. Create a manual or AI assessment,
request hints, inspect the proposal as staff, then finalize the reviewed grade.
The sample rubric and grading presets are for the induction example shown in the
assignment preset; edit them for other homework.

Presets only fill inputs. **Send request** is the only normal mutation trigger;
**Retry failed job** is also a preset requiring Send. IDs are captured from
successful responses and can be edited in the Resource IDs section. After editing
an ID, click **Load preset** to rebuild the request. For score edits/finalization,
read the assessment first to get its current version. Reuse an idempotency key only
for the same request. Watching a job only polls GET; stopping the watch does not
cancel server processing. On success, read the assessment or feedback history.

Output is raw JSON/text, HTTP status and timing. PDF responses get a download link;
PNG responses get a preview. HTML in responses is displayed as text. An unlinked,
noindex path is a convenience, not access control: backend permissions still apply.
To include this in a future website, serve `__debug__/` at `/__debug__/` without a
navigation link. Change the API origin field for that environment and configure
backend `CORS_ORIGINS` if the origins differ. There is no backend static-file mount.

## Tests

Node is needed only for testing:

```bash
cd frontend
npm ci
npm test
npm run test:browser
```

The browser test requires installed Google Chrome and the backend `.venv` created
by `uv sync`. It starts temporary local services, uses synthetic PDFs and fresh
tokens, disables external AI, and removes its temporary database after exit.
No production data or provider credentials are used. `playwright-core` is a dev
dependency; the actual debug page is dependency-free. The screenshot is saved to
`/private/tmp/verity-debug-console.png` on the current macOS development setup.

For architecture, environment, all API routes, data models, troubleshooting and
scope, see [PROJECT.md](../PROJECT.md).

Run `npm run test:guided` to check the one-click sample and separate teacher approval.
