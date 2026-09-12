---
date: 2026-09-12
description: Connected classroom integration contract
tags: [integration, contract]
---

# Connected classroom contract

## Dataset pilot amendment (Ivan, 2026-09-12)

The labeled `demo-data` files may replace the active local classroom after archiving
its previous state. The importer stores all 26 PDFs, imports ten professor-reviewed
records, and maps two new student submissions from their supplied page maps. An
explicit CLI `--grade-new` runs two paid assessments; public demo uploads do not
automatically incur API charges. Only assignment/professor PDFs, ten graded-example
PDFs, and the target submission enter the grader. Hidden keys, README spoilers, and
the summary CSV are excluded; comparison happens after raw responses are saved.
AI scores remain provisional and server-calculated from published half-point bands.
Open demo exposes a synthetic-student selector using `X-Verity-Demo-Student`, limited
to the imported roster. Private mode still derives identity from authentication.

Related: [[contracts]] (the existing core API contract).

## Open-demo amendment (Ivan, 2026-09-12)

The latest request explicitly allows every demo visitor to switch between student
and staff without an access code. The local launcher now enables open demo mode by
default; `--private` retains the original authenticated mode. In open mode, a
`X-Verity-Demo-Role: student|teacher` header selects one of the two provisioned demo
identities for classroom routes. This is deliberately **not an access boundary**:
any visitor may select teacher, view references and change reviews. Dummy data only.

GET `/classroom/demo` reports whether open mode is enabled, without returning tokens.
The root opens the student workspace directly in open mode. Both workspaces provide
Student / TA–Professor navigation. Native grading API authentication is unchanged;
the bypass is confined to the connected classroom app and explicit launcher mode.
Without that launcher flag, role headers grant no access. No database reset occurs.

The original private-mode contract follows.

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
