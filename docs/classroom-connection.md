---
date: 2026-09-12
description: Connected classroom integration contract
tags: [integration, contract]
---

# Connected classroom contract

Related: [[contracts]] (the existing core API contract).

Approved scope: Ivan, 2026-09-12, combine student and teacher into one application,
enforce private staff access, test the complete flow, then publish an isolated GitHub branch.

The connected launcher uses the existing Python dependencies, bearer authentication,
PDF ingestion and private file storage. A revision-checked classroom workspace preserves
the staff prototype schema without rewriting the independently developed grading API.
This adapter is deliberately separate from the native assessment/job pipeline.

- Staff GET/PUT `/classroom/workspace`: course membership required; compare-and-swap
  revision prevents silently overwriting concurrent student uploads or staff changes.
- Student GET `/classroom/student`: explicit allowlist of published question prompts,
  maximum points and the authenticated student's own attempt history and scores.
  Never returns solution PDFs, expected answers, bands, private criteria, staff notes,
  grading examples, draft content, or another student's work.
- POST `/classroom/files`: authenticated PDF upload, same validation as core backend.
- GET `/classroom/files/{id}`: staff within course, own submission, or published blank
  question document only. No public upload directory or sample solution routes.
- POST `/classroom/attempts`: authenticated student, owned PDF, current published
  version and validated zero-based page mapping; immutable revision and idempotency ID.
- POST `/classroom/attempts/{id}/final`: explicit final hand-in; practice is separate.
- Reference uploads and student uploads are persisted server-side. Refresh restores
  records; short polling connects tabs and devices. Tokens are provisioned by the local
  administrator, never automatically handed out by role selection in a public endpoint.

Arbitrary PDF model grading is not connected by this adapter. New work remains pending
until staff review. No fixture score is applied to real uploads. Final/estimated scores
are calculated from published scoring bands; only fixed general error-category text
is returned to students. Exact-location markers require actual evidence and are not
fabricated from page assignments.

Run loopback-only via `backend/run_classroom.py`; production SSO, TLS, deployment and
integration into the native assessment pipeline remain separate work. Source publication
does not publish the private database, PDFs, or provisioned access codes.
