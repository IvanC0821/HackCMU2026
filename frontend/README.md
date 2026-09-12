# Classroom frontend

The root page is the Gradescope-inspired classroom prototype: course dashboard,
assignment table, and a document review workspace with rubric and student feedback.
It uses the supplied screenshots for layout and Lato as an approximate font match.
The original font was not verified. A system sans-serif fallback works offline.

From this checkout's `backend/`, launch the existing isolated sample server. Open
`http://localhost:3000/`, then Sample classroom → Induction homework → Run sample
grading. Teacher approval remains a separate explicit action. This is fixed manual
sample grading, not AI inference; no real student data is included. The two views
are a demo control, not a production authentication system.

For an offline visual preview, run `npm run build` in `frontend/` and open
`preview.html`. Choose **Preview feedback** in submission review. This route does
not save or approve grades. Added courses are preview-only and reset on refresh.
The paper is an accessible HTML transcription of the existing one-page fictional
PDF; Download original retrieves that PDF. This is not a general PDF renderer.

The debug console is still available at `/__debug__/` as documented below.

Design context: [[Frontend Design Toolbox]] (vault reference).

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
