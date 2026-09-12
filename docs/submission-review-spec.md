---
date: 2026-09-12
description: Whole-submission final grading and separate teaching signals
tags: [design, contract, project/hackcmu]
---

# Submission review

Related: [[classroom-connection]], [[contracts]].

Scope authorized by Ivan on September 12, 2026, including his correction: each TA
reviews an entire submission. Source: the TA efficiency discussion in the HackCMU
vault hub and this session. The shared UI handoff in the project hub was read and acknowledged after Ivan
provided its path. Direct Terminal messaging remains unavailable.

## Experience

- Grade one student's full final homework. Question navigation on the left, mapped PDF
  in the center, compact rubric on the right; student selection above. White surfaces, teal actions, thin
  dividers and readable type. Questions navigate within the selected student's work.
- Start review assigns that whole submission to one TA. Check each question,
  save and continue; the last unchecked question's action completes the review.
- All final answers remain in the queue. Optional AI suggestions start hidden.
  Readability concerns prompt inspection and never automatically deduct points.
- Final means the latest explicitly handed-in attempt for the current standard,
  even when a later practice upload exists. Practice-only students are excluded.
- Teaching counts distinct students' first-assessed difficulties, still-present
  flags, flags absent in a later attempt, and corrected judgments. A missing flag
  does not prove learning. Unassessed work is unknown, not correct.
- Student upload, page mapping, PDF markers and revision history remain; practice
  and submitted versions receive explicit labels. Earlier mistakes do not carry
  into the final review. General student feedback still excludes private solutions.
- Confirmed review comments can be selected for reuse and edited before saving.
  Students may explicitly ask for help on any question, including clean work;
  Teaching shows the requests separately from inferred difficulty counts.

## Contract

- GET `/classroom/me` adds the authenticated `id`.
- POST `/classroom/grading/attempts/{attempt_id}/claim`:
  `{expectedRevision, release}`. Staff-only, latest submitted attempt for the active
  rubric. One owner for the whole submission. Another TA cannot silently take it.
- POST `/classroom/grading/{question_id}/review`: `{attemptId,
  expectedQuestionRevision, checkedWork, decisions: {criterionId: {band, reason,
  resolution}}}`. Only the submission owner can save. All rubric items, score bands,
  changed-score reasons, uncertainty and open disputes are validated on the server.
  The scoped write retains all other questions and practice revisions. Stale edits
  conflict. A prior question decision can be revised until the submission is complete.
- Private `reviewAssignments` is keyed by attempt ID. `questionReview` records
  authenticated reviewer, timestamp and revision. `reviewHistory` retains prior
  assessment snapshots. Student projections expose none of these fields.
- Bulk workspace writes cannot forge ownership or overwrite claimed reviews.
  PDFs, mappings, published standards and practice attempts remain intact.
- A whole submission becomes reviewed only after every question is human-checked.
  No clean score or AI finding automatically completes review.
- POST `/classroom/grading/attempts/{attempt_id}/reopen`:
  `{expectedRevision, reason}`. Staff owner (or staff taking an unassigned imported
  review) can reopen with a reason. Preserve the completed review snapshot and
  invalidate stale question drafts, while retaining original PDFs and grades.
- POST `/classroom/attempts/{attempt_id}/help`: student-only owned attempt,
  `{questionId, message}` (optional message, at most 1,000 characters). One open
  request per attempt/question; repeated requests are idempotent. No grade changes.
- POST `/classroom/help/{help_id}/resolve`: staff-only `{expectedRevision}`;
  marks the request addressed with authenticated staff attribution. Student
  projections expose their own request's ID, question, message, status and time,
  never staff identity or other students' requests. Bulk saves cannot forge requests.

## Verification and limits

Exercise final-versus-later-practice selection, corrected-error exclusion,
distinct-student counts, unknown outcomes, ownership conflicts, stale edits,
student denial, privacy, complete-review arithmetic and cross-question preservation.
Run existing backend/frontend tests, lint and standalone build.

No paid model calls, dataset replacement or automatic-upload grading in this change.
Browser QA needs authorized browser access; the earlier denial must not be bypassed.
No claim of measured grading speedup or learning is made.

## Joaquin rubric studio integration

Based on main `b83e371` (PR #7). Keep its split PDF/rubric editor, signed deduction
controls, square editing selectors, normalized solution crops and acknowledged-save
revision handling. The connected whole-paper Grade view shows the selected
question's published solution crops; unpublished replacement PDFs and crop edits
must not change the reference used for a submitted attempt. The studio remains
reachable through Standards, with Grade and Teaching retaining their own routes.
Both module sets belong in the static allowlist, standalone bundle and controller
harness. UI editing selectors never update student scores.
