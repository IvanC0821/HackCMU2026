---
date: 2026-09-12
description: "Local combination of Joaquin's fetched backend and the staff MVP, with verified checks and unresolved product-contract gaps."
tags: [project/hackcmu, integration]
---

# Backend and staff integration

Project context: [[HackCMU 2026 Grading Copilot]].

## Checkout

- `/Users/a1111/code/HackCMU2026-backend-staff`
- Branch: `agent/integration/backend-staff`
- Backend base: `310a6ab` (`origin/agent/backend/api-verification`)
- Staff source: `0fcf2e0` (`agent/frontend/staff-mvp`)
- Clean automatic merge, intentionally stopped before committing. `MERGE_HEAD`
  identifies the staff source; the index contains the combined frontend changes.
- No merge commit, push, PR, or changes to main. No configured upstream for this
  integration branch. Preserve the staged merge when continuing work here.
- Original staff and student source files are unchanged. The coordination note in
  the original staff checkout was acknowledged separately. Uncommitted student
  files were not copied; branch ancestry cannot bring those files over.

## What Joaquin added

The latest fetched backend branch replaces Mathpix with hosted GLM-OCR, validates
its pixel-coordinate results, preserves PDF coordinate transforms, fails safely
on malformed responses, and adds route/provider tests. No HTTP route or core
grading schema used by the staff adapter changed in this update. The backend and
contract files in this checkout exactly match `310a6ab`.

The separate `agent/backend/supabase-storage` branch (`e3c2fb7`) is not an ancestor
of this update. It was not silently included. This checkout retains the latest
verification branch's local/S3 storage implementation.

## Verification in this checkout

- Backend: 69 passed, 2 paid-provider tests deliberately skipped; seven dependency
  deprecation warnings. Ran with `VERITY_LIVE_API_TESTS=0` and external AI off.
- Frontend: all 66 tests pass, including the staff draft-adapter mocks.
- Ruff passes; frontend build and standalone script parsing pass.
- No merge conflicts or diff whitespace errors.
- Synthetic offline API demo passes upload, rubric, assessment, approved hint,
  instructor finalization, student grade disclosure, and analytics. It uses a
  temporary database and synthetic PDFs; it is not a browser or live-AI run.
- Frontend staff code exactly matches `0fcf2e0`; this merge does not itself wire
  local IndexedDB grades to remote assessment records.

Tests used the already installed Python environment at
`/Users/a1111/code/HackCMU2026/backend/.venv/bin/python`, with the working directory
set to this checkout's `backend/`. No keys were read or copied, no paid provider
checks were enabled, and no cloud database/storage migrations were run.

## Fit and remaining work

This is a compatible backend foundation, not a completed shared-state student/TA
application. Resolve these before claiming the full product works:

| Requirement | Current state |
|---|---|
| Read handwriting and anchor possible issues | GLM-OCR adapter is present; anchors describe blocks/steps, not individual symbols. |
| Automatically generate a rubric | Joaquin's API_TEST_REPORT records failed live drafting attempts. Use reviewed manual/imported rubrics until this is fixed and retested. |
| Student selects question pages | Backend mapping remains staff-only. Add explicit owner-authorized page mapping without sharing staff tokens. |
| Student sees an estimated score | Backend hides scores until instructor finalization; requires an intentional student-safe contract change. |
| TA completes grading | TA can edit, but backend finalization is instructor-only. Resolve this against Ivan's requirement; do not silently override access controls. |
| Same assignment, submissions and reviews in two tabs | Current student and staff prototypes use separate local stores. Shared API-backed state remains to be implemented. |
| Charts update from class submissions | Backend analytics exist; current staff charts still read the local demonstration records. |

Joaquin reports successful live synthetic OCR/assessment/hint checks, but those
were not rerun here and do not establish general handwriting accuracy. His browser
checks concern the earlier debug/sample interfaces, not this staff UI.

Next owner should continue in this isolated checkout, preserve the pending merge,
and follow the student handoff before copying its uncommitted files. Keep the
integration local and uncommitted until Ivan changes that instruction. Browser QA,
shared-state integration and a verified live PDF workflow remain separate gates.
