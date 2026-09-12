# Verity student workspace

Local-only student frontend for HackCMU 2026. No commits, pushes, merges, or deployment were performed for this implementation. All changes are contained in `frontend/student/` in the isolated worktree `/Users/a1111/code/HackCMU2026-student`, branch `agent/frontend/student-homework` (base `f59df14`).

## Run

```sh
cd /Users/a1111/code/HackCMU2026-student/frontend/student
npm ci
npm start
```

Open http://127.0.0.1:3002/. The server binds only to loopback. Use `PORT=3003 npm start` if occupied. Node 22+ is recommended. Dependencies and fonts are served locally; no CDN or model request. No build step.

Click **Try sample homework**, assign pages to each question, then **Get sample feedback**. Suggested mapping is Q1 → page 1, Q2 → page 2, Q3 → page 3. Shared pages and multiple pages per question also work.

## Working

- Actual PDF parsing/rendering and thumbnails with PDF.js, including image-based scans. Rendering does not mean OCR or grading.
- Native file picker and drag/drop, PDF validation (20 MB, ten pages, no password-protected PDFs).
- Many-to-many question/page mapping with completion checks; original PDF is unchanged.
- Yellow markers, general-category feedback, keyboard/click/pointer selection, question navigation, page navigation and zoom.
- Top-right provisional estimate and per-question scores for the explicitly labeled fictional sample.
- Immutable submission versions stored in IndexedDB, including original bytes, mappings and results. Refresh returns to the assignment list; View submission restores the latest. Storage failure is visible.
- Responsive document/feedback switch for narrow screens. Sample estimate remains labeled on phones.

## Honest prototype limits

One fictional assignment is seeded. Example feedback is preset, not an AI assessment. A PDF selected through the file picker is always treated as custom work, even if named `sample-homework.pdf`; it receives **Pending**, never the sample grade. Its PDF/mapping are saved locally only. Retry explains that live grading is disconnected.

There is no course authentication, server upload, TA synchronization, OCR, live rubric evaluation, automatic version diff, or production grading latency guarantee. Histories are per browser origin, not per authenticated student. Do not treat this local preview as a secure multi-user app. Student-safe rubric fields still need an agreed backend projection; private answer keys/teacher feedback must not be reused in this UI.

## Bring into the teacher checkout later

Do not merge the branch now: the implementation is intentionally uncommitted, so a branch merge alone would not include it. After Ivan approves, the integrating agent should inspect the target worktree and confirm `frontend/student/` doesn't already contain someone else's work. Then copy only this directory, excluding `node_modules/` and `test-output/`. No shared index, package manifest, teacher file, or backend contract needs to be overwritten.

Example, after resolving any target-folder overlap:

```sh
rsync -av --exclude=node_modules --exclude=test-output \
  /Users/a1111/code/HackCMU2026-student/frontend/student/ \
  /Users/a1111/code/HackCMU2026-grading-ui/frontend/student/
```

Run `npm ci` and `npm test` inside the copied folder. It can run independently on port 3002 beside the teacher app. For a shared host, serve the directory at `/student/` (with its relative dependencies/assets), then explicitly add the teacher app's navigation link. A production bundling pass should package PDF.js, worker, fonts, CMaps and WASM instead of exposing a full `node_modules` tree. Commit only after user approval and coordinated integration review.

## Backend handoff

`model.mjs:assessSubmission` is the isolated assessment adapter. `app.mjs:submit` handles saving/progress and consuming its result. Replace the local IndexedDB adapter with authenticated server-backed version persistence when agreed.

Current `docs/contracts.md` restrictions require coordination before integration:

1. Student-owner page mapping: `PUT /submissions/{id}/regions` is staff-only. Do not call it with a teacher token from this UI. Define an owner-authorized question-to-page mapping endpoint.
2. Student-started assessment and polling: define a supported upload → mapping → job → status/result flow with cancellation/errors. The 750 ms fixture delay is illustrative only.
3. Provisional scores: existing proposed scores are staff-only. Add an intentional student-safe provisional-score projection without exposing private rubric rows, graded examples, answer keys or worked solutions.
4. Pins: fixture anchors are normalized rendered-page coordinates (`x`, `y` in [0,1], zero-based `pageIndex`). Backend geometry is `pymupdf_unrotated` points. Convert through actual page box/rotation before using these anchors; don't equate the two systems. Test rotated/cropped PDFs.
5. Persist each submitted revision and mapping separately. TA revision comparisons, feedback changes and final grades must come from the server, not client-trusted scores.

View result shape:

```js
{
  estimatedScore: 24, maxScore: 30,
  questions: [{id: 'q2', score: 6}],
  findings: [{id: 'f1', questionId: 'q2', category: 'Logic error',
    message: 'One step in your reasoning may need another look.',
    pageIndex: 1, x: 0.76, y: 0.493}]
}
```

This is a UI adapter shape, not an approved replacement for the repository API contract. Assignment IDs/questions/points must also come from the course API rather than the seeded module.

## Verification

`npm test`: seven Node tests cover mapping, input guards, snapshot isolation, consistent fixture totals, no arbitrary-upload grades, and cancellation. `npm run fixtures` regenerates the fictional PDF using pdf-lib.

Browser verified: sample PDF rendering, multi-page/shared-page mapping, gated submit, provisional 24/30 result, marker-linked question/category changes, phone layout (390×844, no horizontal page overflow), and persistence after refresh. No console errors observed during those checks. Custom local-file selection could not be automated because the Chrome extension disallowed file access; test the picker and drag/drop manually. Live backend behavior is not verified or connected.
