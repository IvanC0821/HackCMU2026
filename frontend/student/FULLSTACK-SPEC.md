---
date: 2026-09-12
description: "Proposed student PDF-to-feedback API integration and Claude-generated demo bundle."
tags: [spec, project/hackcmu]
---

# Student PDF grading integration

Durable project context: [[HackCMU 2026 Grading Copilot]] in Ivan's Obsidian vault.

Status: proposed, awaiting Ivan's spec approval and live-vs-replay choice. No backend implementation in this document. Continue to keep all work local and uncommitted.

## Product scope

1. Student opens the designated assignment and uploads one PDF.
2. Student assigns one or more pages to every question; pages may overlap between questions.
3. **Check my work** saves an immutable practice revision and starts a backend assessment. No check limit.
4. The backend reads the actual student PDF plus the assignment's private professor solution, approved rubric, and past graded examples. It assesses the work against criteria, including course-specific notation/presentation requirements. Valid alternative methods remain acceptable unless explicitly disallowed by the assignment.
5. The student sees a provisional total and question scores, yellow markers, and short general categories such as logic, notation, execution, missing work, or unclear writing. No private answer keys, worked corrections or staff rationales are returned.
6. Previous revisions remain accessible. A practice check is distinct from a final hand-in. Final hand-in/automatic deadline handling must use the staff workflow's agreed contract; don't invent deadline semantics in this pass.

## Reuse and isolation

Use the current student UI and existing FastAPI, SQLAlchemy, PDF ingestion, rubric grading and job worker. Do not rebuild these systems or alter the other terminal's teacher checkout. Add isolated student integration modules and tests in this worktree, keeping shared wiring small and documented for the integrator.

The current backend already permits a student to start an **AI** assessment via `POST /api/v1/submissions/{id}/assessments`. It forbids student-authored manual outcomes. The earlier handoff's concern about assessment orchestration is therefore mostly frontend wiring, not a missing authorization path.

Actual API gaps:

- `PUT /submissions/{id}/regions` is staff-only; students need an owner-authorized page-to-question mapping operation.
- Existing assessment responses hide provisional scores; add an explicit assignment-policy opt-in and student-safe result projection.
- Multi-question image-only scans need page-selection metadata independent of text-region IDs. Do not silently require OCR text to preserve a page mapping.

These additions require a documented contract amendment before implementation. Since Ivan has prohibited commits/pushes, prepare changes locally for coordinated integration rather than opening a contract PR now.

## Proposed contract additions

- `PUT /api/v1/student/submissions/{id}/pages`: `{question_pages: {q1: [0, 1], q2: [1]}}`. Owner and enrollment checked. Every question must have valid zero-based page indexes. Original PDF is immutable. Once a grading job exists, mapping is pinned; changes create a new revision.
- `GET /api/v1/student/submissions/{id}/review`: job status, provisional total/max, per-question status/score, permitted findings and evidence anchors. Never return private rubric requirements, keys, reference text, model prompt or staff rationale. Honor location/disclosure policy and explicit score permission. Uncertain judgments remain unresolved, not automatically zero or full credit.
- Existing authenticated upload, submission creation, job start/status/retry and private original-file routes remain in use. Students never receive staff credentials. Server-side arithmetic sums validated rubric bands rather than trusting model totals.

A failed request must preserve the uploaded work. Retries use idempotency keys. A provider failure must not trigger canned feedback. A job's completion time comes from actual processing; don't promise a few seconds before measuring.

## PDF evidence and pins

Existing extraction uses PyMuPDF and canonical unrotated page-point geometry. The UI currently expects normalized displayed-page coordinates. Convert page boxes and rotations explicitly; test rotation/crop cases. Prefer native/OCR evidence regions for exact pins. If the model cannot localize the issue, show a question/page-level flag rather than inventing a precise location. Handwriting ambiguity is an uncertainty flag, not a mathematical deduction.

## Claude-generated demo bundle

Provide a folder with clearly labeled PDFs:

- `practice-test.pdf`: questions, question IDs/numbers and maximum points.
- `professor-solution.pdf`: expected solutions and required methods/notation.
- `professor-graded-example.pdf`: fictional prior work with visible deductions and comments. One example is enough for the initial demonstration.
- `student-attempt-1.pdf`: fictional student answers, with plausible mistakes.
- `student-attempt-2.pdf`: the same student's revised work.
- Optional `student-alternative.pdf`: a valid alternative solution used to check over-strict matching.

Mark all generated documents fictional. Supply a short question-to-page map and an explicit approved rubric/point allocation. If a model drafts the rubric from PDFs, review and approve it before student assessment. Using examples as reference context is not model training.

## One unresolved implementation choice

**Live comparison (recommended):** use the existing OpenAI-backed grading worker. Requires server-side credentials, global and assignment external-AI opt-in, and the supplied reference PDFs. Never transmit files to a provider without the agreed opt-in. Preserve the repo's configured model; don't silently select a different provider/model.

**Replay simulation:** prewritten judgments apply only to the exact known dummy PDF, rubric version and page mapping. Label every response replayed. Reject unknown files rather than returning the same fixture grade. This verifies workflow, not grading accuracy.

## Acceptance checks

- Real multipart PDF upload, malformed/oversize/encrypted file rejection.
- Many-to-many page mapping, unknown/out-of-range pages, scan-only and rotated/cropped PDFs.
- Student cannot read another student's work, keys, private rubric or staff rationales; cannot submit their own scores.
- Actual backend job lifecycle, idempotent retries, failure recovery, immutable revisions.
- Validated criterion coverage, score arithmetic and unresolved judgments.
- General-only feedback; safe handling of untrusted PDF instructions.
- Frontend API integration, document pins, score display, responsive layout and keyboard access.
- With Ivan's bundle: run the complete first-attempt/revision sequence and report observed outcomes. Keep fixture-backed tests distinct from a live provider run and do not infer general learning/accuracy from one case.
