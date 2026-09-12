# Math homework API contract

<!-- TODO: Replace the temporary Verity product name before launch. -->

Scope: typed/handwritten math and proof homework PDFs (10 pages, 20 MiB), private
PDF answer keys, standards, published rubrics, manual/AI assessment, immediate
practice hints, instructor-reviewed final grades. Backend owns this contract.

## Transport and authorization

Prefix `/api/v1`. JSON except multipart PDF uploads. `/docs` and `/openapi.json`
describe schemas. UUID strings; UTC timestamps; zero-based page indexes.
`Authorization: Bearer <token>` except health endpoints. Tokens are locally
provisioned opaque tokens (only hashes stored) or verified RS256 JWTs from the
configured issuer/audience/JWKS. JWT subjects must match provisioned users.
Global roles: admin/instructor/student. Course roles: instructor/ta/student.
TAs grade; instructors finalize and manage membership. Students access only their
own submissions, issued hints and finalized scores. Private materials, rubric
internals and proposed scores are staff-only. Unauthorized resources return 404.
Errors use HTTP status and `detail`. Lists use bounded `limit`/`offset`.

## Routes (relative to `/api/v1`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/me` | Identity and memberships |
| POST | `/users` | Admin provisions user / external subject |
| GET, POST | `/courses` | Accessible courses / create |
| POST | `/courses/{id}/members` | Enroll provisioned user |
| GET, POST | `/courses/{id}/assignments` | List / create homework and policies |
| GET | `/assignments/{id}` | Assignment, student-safe projection |
| POST | `/documents?course_id=...&kind=...` | Multipart `file`; assignment/answer_key/rubric/standard/submission |
| GET | `/documents/{id}` | Geometry and evidence regions |
| GET | `/documents/{id}/file` | Private original PDF |
| GET | `/documents/{id}/pages/{index}/image` | Upright PNG preview |
| POST | `/assignments/{id}/rubric-versions` | Manual JSON rubric draft/import |
| POST | `/assignments/{id}/rubric-drafts:generate` | Optional AI draft job, never auto-publish |
| GET | `/rubric-versions/{id}` | Staff reads rubric |
| POST | `/rubric-versions/{id}:publish` | Publish immutable rubric version |
| GET, POST | `/assignments/{id}/submissions` | Authorized list / immutable revision |
| GET | `/submissions/{id}` | Submission and assessments |
| PUT | `/submissions/{id}/regions` | Staff question mapping / transcription before assessment |
| POST | `/submissions/{id}/assessments` | Manual complete outcomes or AI job |
| GET | `/assessments/{id}` | Staff proposal; student status and finalized score |
| PUT | `/assessments/{id}/results` | Replace complete outcomes with expected_version |
| POST | `/assessments/{id}/findings` | Add manual finding |
| PATCH | `/findings/{id}` | Correct/confirm/dismiss/reposition with expected_version |
| POST | `/assessments/{id}:finalize` | Instructor finalizes reviewed grade |
| POST | `/assessments/{id}/feedback` | Issue manual/bank/generated hints |
| GET | `/submissions/{id}/feedback` | Disclosure-filtered issued history |
| GET | `/assignments/{id}/analytics/questions` | SQL coverage and conceptual rates |
| GET | `/assignments/{id}/analytics/patterns` | Distinct student pattern counts |
| GET | `/jobs/{id}` | Authorized status / safe error / result ID |
| POST | `/jobs/{id}:retry` | Retry failure without duplicate results |

## Records and invariants

Assignment: public questions (ID/prompt), private material document IDs,
external-AI permission (false), OCR permission and feedback policy. Policy fields:
`max_disclosure_level` / `release_level` (0–4), `location_visibility`
(point/question/hidden), `max_findings` (1–10), `max_words` (10–300),
`allow_generated` (false), `show_scores` (true).

Rubric: criteria with stable IDs, question ID, requirement, maximum points,
performance bands with fixed points, concept IDs and source references; approved
patterns with definition, exclusions, concept, category and hint ladder; standards.
JSON is the import format. Published versions are immutable. Sum selected band
points in code; uncertain outcomes block finalization. Complex scoring dependency
rules are deferred. Every assessment pins the submission and published rubric.
Manual and AI writes share result/finding/feedback tables, with audit provenance.
Full criterion coverage and valid evidence ownership are mandatory.

Findings: criterion, approved pattern or null, category, impact, evidence IDs,
optional root cause, page anchor, provenance, instructor confirmation and status.
An anchor has `document_revision_id`, `page_index`, `x`, `y`, `units: pt`,
`coordinate_space: pymupdf_unrotated`, and target granularity. Native regions have
character geometry; OCR regions retain polygons, confidence and transforms.
Model-selected region IDs determine pins in code. A line creates a step anchor;
unlocalized findings remain `pending_anchor`. No-AI manual grading supports scans.

Mutable writes use expected_version and return 409 on stale edits. Finalized
assessments are immutable. Reassessment creates a new record. Audit retains prior
proposals when instructors revise results or findings.

Assessment creation and AI drafting require `Idempotency-Key` (1–128 chars).
A reused key with a different request returns 409. Jobs respond 202 with
`id`, `kind`, `status`, `result_id`, `error_code`. A separate DB-backed worker
atomically claims jobs; Postgres supports multiple workers, SQLite local demos.
Claims expire after 30 minutes; explicit retries allow at most three attempts.
Results and job completion commit together. No in-process background processing.

AI proposals prepare practice feedback without requiring final grading. Poll the
job, then issue feedback through POST. Generated feedback calls receive no private
solutions. Effective hint level is min(requested, instructor, release).
Repeated requests reuse cached text per finding/level; issuing is distinct from
reading. Strict disclosure uses approved hints; generated hints are advisory.
All external calls, including OCR, require global and assignment opt-in.

Analytics use latest-assessed or first-submitted per student at a single rubric
version. Uncertain outcomes count as unresolved, not completed denominators.
Deduplicate students, exclude dismissed findings, distinguish confirmed flags.
Return `as_of`, rubric/taxonomy version and attempt policy.

## Backend environment

| Variable | Default / purpose |
|---|---|
| DATABASE_URL | sqlite:///./data/verity.db; deployment: postgresql+psycopg://... |
| STORAGE_DIR | ./data/documents (private) |
| S3_BUCKET, S3_REGION, S3_ENDPOINT_URL | Optional private S3-compatible storage |
| AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY | Optional S3 credentials; SDK credential chain supported |
| CORS_ORIGINS | JSON array, localhost:3000 default |
| EXTERNAL_AI_ENABLED | false; global external-call switch |
| OPENAI_API_KEY, OPENAI_MODEL | Server key; configurable model, gpt-6-astra default |
| OPENAI_REASONING_EFFORT | high |
| MATHPIX_APP_ID, MATHPIX_APP_KEY | Optional handwriting OCR credentials |
| JWT_ISSUER, JWT_AUDIENCE, JWT_JWKS_URL | Configure all three for external RS256 auth |
| LOCAL_TOKENS_ENABLED | true; disable after external auth configuration |
| MAX_PDF_PAGES, MAX_UPLOAD_BYTES | 10, 20971520 |
| WORKER_POLL_SECONDS | 2 |

Examples: `backend/examples/rubric.json`, executable `backend/scripts/demo.py`.
Generated `backend/openapi.json` is the frontend schema reference.
