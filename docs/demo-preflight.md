# Demo preflight, September 12

Latest fetched and fast-forward-checked upstream: `origin/main` at `812fb17`.
Integration branch: `agent/integration/demo-preflight`. This combines the latest
classroom/student presentation with the previously separate whole-paper review
and local automatic assessment adapter. The original running checkout is preserved.

## Verification

- Backend: 117 passed, 2 live-service tests skipped. The new assessment tests use
  a fake provider and make no network or paid model requests.
- Frontend: 88 passed. Student: 16 passed. Preview build succeeded.
- Rubric browser: real PDF canvas, pointer/keyboard crops, long-page navigation,
  multi-question editing, hint approval/publication, persistence, immutable
  published crops, role switching, replacement remapping and mobile layout.
- Whole-paper browser: claim ownership, toggle AI suggestions, score and save
  each question, complete the submission, reload and verify reviewed state in
  both staff and student projections.
- Annotation browser: persistent student hints, anchored circles/connectors,
  non-overlapping boxes, page/zoom changes and mobile scrolling.
- Targeted Python lint passes. Synthetic test data is isolated from the demo.

## Remaining before filming

1. The selected real PDF upload was refused by the Chrome automation extension
   because file-URL access is disabled. The user was given the extension setting
   to enable. No upload bypass or paid selected-file trial was performed.
2. Test the actual 29 reference pages and 10-page student paper, inspect the
   generated rubric, approve hints, publish and verify actual assessment quality
   and token usage. The test launcher uses `MAX_PDF_PAGES=20` because individual
   reference files exceed the default ten-page limit.
3. The TA AI toggle shows grading explanations beside the original PDF; it does
   **not** draw the student's annotation overlays on the TA iframe. The current
   clip must show side-by-side review, or this feature must be implemented and
   verified before promising marks on the TA paper.
4. Smooth cursor paths and edited zooms remain recording acceptance criteria;
   browser tests do not establish video quality. No production video was made.

## Planned clicks, approximately 40 seconds total

Off camera: open homework, Rubric, Files & settings; attach blank/solution/past
graded work under More options. Add the six real question prompts and point
allocations before Generate AI draft. Review its criteria, point totals and source
pages. Open Assignment hints, Review / refresh hints, edit if necessary, Approve
these hints, then Publish rubric. No separate hint generation is required when
reviewed templates suffice.

| Clip | Duration | Clicks and visible result |
|---|---:|---|
| Student | 12 s | Student, Upload your work, Choose PDF; select the actual submission, map pages to questions, submit for assessment, open a detected hint, Hand in this version. Shorten processing waits explicitly. |
| Standards | 11 s | TA, homework, Rubric; choose a question and show its points/deductions/source excerpt; Files & settings, Assignment hints, Review / refresh hints to show the approved bank. |
| Review | 17 s | Grading, choose student, Start review, Show AI suggestions; inspect the original and rubric, choose Score, enter Review note, check full-answer review, Save and next question. Only show Complete review after every question has actually been checked. |

Exact flagged question and final take timing depend on the actual-file result.
Displaying saved results and local editing do not invoke a model; requesting a
new assessment does. Planning allowance remains roughly $0.50–$1 for two core
generations, with $3 total set aside for rehearsals, not an enforced spending cap.
