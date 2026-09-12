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

## Persistent PDF hint callouts

The student feedback viewer places a small yellow circle at each saved normalized error point. Yellow connectors lead to rectangular, pale-yellow hint boxes with dark text in a gutter beside the page. All located hints on the current page remain visible, including after selection is cleared. Boxes are spaced using their rendered heights, so long hints and nearby errors do not overlap. Zoom keeps anchors tied to PDF coordinates; on narrow screens the document and hint gutter scroll inside the viewer.

Only existing student-visible finding messages are displayed. Missing locations remain in the feedback sidebar without an invented PDF marker. Related-work and approximate-part anchors retain their location qualifiers. The original PDF bytes are unchanged.

Run `npm run test:annotations --prefix frontend` from the repository root for the browser workflow; `npm test --prefix frontend/student` covers geometry, stable numbering, escaping, mapping, and revision behavior.

## One-click graded example

Choose **View estimated example**, or open the standalone student viewer with `?example=graded`. The example immediately opens the existing three-page fictional PDF with its page assignments and applied deductions: Question 1 10/10, Question 2 6/10 (−4 circular reasoning), Question 3 8/10 (−2 missing domain), total 24/30. Yellow hint boxes and the feedback sidebar label each deduction as estimated. Positions are taken from the sample PDF text geometry. This fixture is saved locally once and never submits work or changes a course grade.

## Student submission layout

The review screen uses a wide PDF viewer and a single right sidebar. Every total and question score is presented as an **estimated grade**, including server results already marked reviewed. The selected question expands its **estimated deductions**; individual amounts appear only when supplied, and the question total is calculated from its score. Question prompts and assigned pages are available behind **Question & pages**. No grader identities or review-status labels appear.

Zoom controls sit above the PDF (75–300%, with a fit-width reset). Question rows, deduction links, page controls, and **Next question** navigate the submission. On phones, switch between Submission and Questions & estimates; a located deduction opens its PDF page. Original download, upload revisions, history, and connected hand-in remain available. The fixed demo bar keeps Student and TA links visible in both perspectives and in hosted examples. Demo details and the student selector live in a compact chevron dropdown, which supports keyboard activation, Escape, and outside-click dismissal.

Validation: 16 student unit tests and the annotation browser workflow cover persistent callouts, exact anchors, zoom, phone overflow, question/deduction navigation, example persistence, and estimate labels for both local examples and connected reviewed results.

Student-facing hints have no error-type title, including in accessible marker labels and announcements. Only the opening sentence is displayed in the sidebar and persistent PDF note; this also applies to older saved results. The two example hints stop at “The next case is assumed rather than derived.” and “The condition k > 0 does not specify which values k can take.” Grader categories and source feedback are preserved. Estimated grade labels remain; redundant “not official” copy has been removed.
