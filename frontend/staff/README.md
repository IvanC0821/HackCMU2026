---
date: 2026-09-12
description: "Run and rehearse the Verity single-case grading MVP, with scope, privacy, and verification boundaries."
tags: [project/hackcmu, implementation]
---

# Staff MVP

Project context: [[HackCMU 2026 Grading Copilot]].

## Run

From this repository's `frontend/` directory:

```sh
npm install --prefix student
npm run start:staff
```

Open http://127.0.0.1:3003. The PDF canvas uses the same local PDF.js dependency as the student viewer. Unit tests need no browser.
Alternatively `npm run build` makes `frontend/preview.html`, a directly openable
single-page app. Keep it beside `output/pdf/` and `student/node_modules/`. Serve it
over localhost for the PDF canvas; browsers restrict PDF.js modules on file URLs.

## Rehearse

1. Homework 1 → Grading standards → Use sample materials.
2. Open reference PDFs. Review the question, alternatives, and 10-point rubric.
3. Finalize grading standard. Open Student revision in the walkthrough bar.
4. Incomplete work → Check my work. The matrix checker reports missing work, 8/10.
5. Corrected work → Check my work. All declared steps verify, 10/10.
6. Valid alternative → Check my work. The other valid method also receives 10/10.
7. Submit final → Continue to TA review. Select previous attempts to compare work.
8. I skimmed this question → Complete review. The role can be Professor or TA.
9. Learning progress retains the first 80% and latest 100%, one student represented.

To test correction, submit an incomplete example, file a dispute in the student
walkthrough, then select a TA outcome and supply a reason. Resolve the dispute
before marking the question checked. Completed reviews require an explicit reopen;
their previous snapshot is retained. Reopen for demo rehearsal allows a new student
version without deleting the old final. No check limit exists.

The controls load authored work, not authored grades. `row-check.mjs` calculates
each transition and substitutes final values into the original equations. Expand
Edit the entered work to test actual data changes. A wrong intermediate value is
flagged even if the final answer is correct.

## Boundaries

- Fictional, controlled case. No instructor endorsement, student-learning gain,
  class-wide trend, general model accuracy or TA-time saving is established.
- No GPT call or OCR is used by the local matrix checker. It supports explicit
  row operations and numerical matrices, with a relative floating tolerance 1e-9.
  This is not a general proof grader. PDF assets are matching references, not the
  input consumed by the checker.
- PDF uploads and manual rubric editing work locally. Changes to the reference
  standard disable automatic demo assumptions. New rubric versions preserve old
  results; Prepare current-version reviews creates unresolved manual reviews.
- Browser-local state and PDF blobs use IndexedDB. A storage failure is disclosed;
  stale-tab writes are rejected. This is a single-browser prototype, not a secure
  multi-user classroom deployment. Preview roles are not authentication.
- Only live rubric drafting is wired to the existing API. Expand Connect AI rubric
  drafting, provide your API origin, instructor token and existing course ID, add
  local PDFs/question prompts, and explicitly consent. It uploads references,
  creates a new server assignment with AI opt-in, polls the worker and imports the
  draft. A server-side provider key and worker must already be configured. CORS
  must allow the preview origin. The standard default API port is 8000.
- The token stays in memory. References sent through that explicit action may be
  retained by your backend/provider. Cancelling stops waiting, not server work.
  Do not blindly resubmit after a timeout; use the assignment/job IDs shown.
- No real grade, rubric, email or course announcement is published by this UI.
  Reminder generation produces editable local text; copying does not send it.
- Final submission is explicit in this rehearsal. Deadline-triggered submission
  and reusable class-wide TA corrections are not implemented. TA explanations
  are retained for the reviewed case; they do not retrain a model.
- The independent student worktree and existing backend contracts are unchanged.

## Verify

```sh
npm test
npm run build
```

Tests cover scoring, general rubric validation, revisions, alternative paths,
200 operation checks, TA review/finality, appeals, API mocks, storage conflict
behavior and controller events. These are not a substitute for live browser tests.
Browser QA remains pending while the agent cannot serve localhost in this session.
Live GPT grading has not been tested. See `QA.md` for release caveats.

To rebuild PDFs after changing case data, from `frontend/` run:

```sh
node staff/make-pdf-data.mjs
python tools/row_case_pdfs.py
```

Use a Python environment with ReportLab and system Poppler. Recheck all rendered
pages before using the PDF assets. PDF source data comes from the same case module.

## Rubric authoring and answer excerpts

Open **Grading standards**. The solution PDF stays on the left while the right
panel switches between **Questions & deductions** and **Reference PDFs**. Add a
question, edit its requirements and scoring outcomes, and select **Crop answer**.
Drag across the PDF, name the excerpt, and select **Save answer crop**. The percent
bounds offer a keyboard alternative to dragging. Escape cancels an unsaved crop.

Use the page controls to include more than one excerpt, including answers spanning
multiple pages. Each question retains independent assignment and solution page
numbers; students still map their own PDFs separately. Excerpts use normalized
page coordinates and stay aligned when zooming or changing viewport size.

Drafts save through the existing local/connected store. Finalizing captures the
crops and original solution PDF in the published standard. TAs see these private
answer previews beside each question while reviewing. Students never receive the
solution metadata or PDF through the classroom API.

Replacing a solution flags its old excerpts. Select **Remap**, choose the page,
adjust the box, and save. Check the question's solution page list as well, especially
when the replacement is shorter. Finalization rejects unresolved source/page
mismatches. This is explicit remapping, not automatic recognition of reflowed text.

Validation: `npm test` and `npm run test:rubric` from `frontend/`; the browser test
uses a temporary local classroom, synthetic PDFs with different page lengths, and
headless Chrome. Install frontend and student dependencies first, and install the
backend environment as described in `backend/README.md`. It tests drawing, numeric
bounds, persistence, multiple questions, TA previews, privacy, remapping and mobile
overflow. No Supabase or external AI calls are made by this test.

The layout follows [Gradescope's question-focused PDF/rubric workflow](https://guides.gradescope.com/hc/en-us/articles/22249389005709-Grading-submissions-with-rubrics),
with solution excerpts kept separate from student page assignments.
