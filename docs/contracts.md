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
character geometry; OCR regions retain provider boxes, coordinate format and transforms.
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
| ZAI_API_KEY | Optional hosted GLM-OCR credential; server only |
| GLM_OCR_BBOX_FORMAT | `pixels` (default, confirmed by live hosted API; provider page dimensions required) or `normalized` (0–1); never auto-detected |
| JWT_ISSUER, JWT_AUDIENCE, JWT_JWKS_URL | Configure all three for external RS256 auth |
| LOCAL_TOKENS_ENABLED | true; disable after external auth configuration |
| MAX_PDF_PAGES, MAX_UPLOAD_BYTES | 10, 20971520 |
| WORKER_POLL_SECONDS | 2 |

Examples: `backend/examples/rubric.json`, executable `backend/scripts/demo.py`.
Generated `backend/openapi.json` is the frontend schema reference.

## Additional MVP details

- `POST /assessments/{id}/math-checks`: staff submits `lhs`/`rhs`; returns a bounded
  polynomial identity check. Does not verify an assessment or change points.
- Feedback POST also requires `Idempotency-Key`; an uncached generated hint returns
  a job, whose `result_id` is an issued-feedback record. GET submission feedback
  retrieves it. Manual and cached responses return the issued record directly.
- AI-generated drafts are edited by posting a revised spec as a new draft version.
- Rubrics, source materials, and assignment policy are immutable in the MVP. New
  policies use a new assignment; new rubrics can be published on the same assignment.

## Debug frontend

The unlinked `/__debug__/` path is a static, plain HTML/JavaScript API console in
`frontend/__debug__/`. It does not add or bypass API permissions. A configurable
API origin defaults to `http://localhost:8000`; serve `frontend/` on
`http://localhost:3000` to match the default CORS configuration. The future website
can host this folder at the same path without adding it to navigation.

Inputs: staff/student bearer tokens (in memory only), active identity, resource
IDs, request preset, HTTP method, API path, JSON body, optional PDF and idempotency
key. Outputs: HTTP status, elapsed time, raw JSON/text or a private binary download.
Presets cover the math-homework workflow. All mutations require an explicit Send;
job watching only polls GET. Request paths are constrained to the chosen origin;
tokens are never written to browser storage, request logs or output JSON.

No new backend environment variables or API endpoints are introduced. The debug
page is unlinked and marked noindex; the URL itself is not access control. Deploy
it only where backend authorization and your deployment access rules are suitable.

## Local guided sample

`python -m scripts.debug_server` (from backend/) starts a loopback-only debug
frontend on port 3000 and a separate API on port 8001 using a temporary SQLite
DB, temporary PDFs, and two provisioned sample identities. It disables all external
AI and object-storage calls. The database and files disappear when the launcher
stops; the normal API/database on port 8000 are unaffected.

Only this development server implements `POST /__debug__/session`. It requires
same-origin JSON requests with a loopback Host and returns demo tokens, the API
origin, generated homework/answer-key PDFs and the sample rubric. No production
API endpoint or authentication bypass is introduced. Responses use no-store.

The console's primary button creates a course, enrollment, assignment, published
rubric, submission and manual assessment through the existing authenticated API.
The sample has a deliberate circular-induction mistake. Its outcome is a clearly
labeled fixed demonstration, not AI grading. It immediately issues the approved
hint, keeps the score hidden, and offers a separate explicit teacher-finalization
button. Tokens and IDs are filled in memory; raw request controls are collapsed
under Advanced. Static hosting still supports the existing manual console.

## Hosted handwriting OCR (GLM-OCR)

OCR uses Z.ai `POST https://api.z.ai/api/paas/v4/layout_parsing` with model
`glm-ocr` and server-side `ZAI_API_KEY` Bearer authentication. The worker sends
one unrotated PNG page per request as a base64 data URI (10 MiB maximum), with
crop-image and visualization output disabled. No public document URL is needed.
Both external-AI opt-ins remain required; `ocr_enabled` still controls assignment
OCR. No Mathpix credentials or automatic paid fallback are used for new OCR.

`layout_details` must contain exactly one page. Nonempty text/formula/table
blocks become `source: glm-ocr`, `granularity: step` regions with original content
and boxes. These are block/step anchors, never symbol-accurate pins. Image URLs are
not treated as student text. Missing layout, malformed/empty text output, invalid
boxes, or inconsistent page geometry fail closed before any regions are added.
Blank pages may return an empty layout with empty Markdown. Confidence is null
when the provider supplies none. Provider coordinate format, label, model, token
usage and page transforms are retained as evidence without logging raw responses.

Z.ai's API reference specifies normalized 0–1 boxes, but a live hosted request
on 2026-09-12 returned pixel boxes. The default is therefore `pixels`.
`GLM_OCR_BBOX_FORMAT` selects the convention explicitly. Pixel mode
requires returned page dimensions; aspect-ratio changes and reported rotations
are rejected. Coordinates are mapped through the actual rendered PNG dimensions
and the saved inverse transform, including render rounding at page boundaries.
Sources: https://docs.z.ai/api-reference/tools/layout-parsing and
https://github.com/zai-org/GLM-OCR/blob/main/glmocr/api.py.

Completed document OCR is reused, including historical provider records; no
existing evidence is rewritten. Failed jobs roll back OCR and can be explicitly
retried (which can incur another charge); there are no automatic HTTP retries.
Safe job errors include `glm_ocr_not_configured`, `ocr_image_too_large`,
`ocr_invalid_response`, `ocr_invalid_geometry`, and `ocr_request_failed`.

## Readable rubric drafts (connected classroom, 2026-09-12)

`RubricSpec` keeps its existing shape. Requirements and band descriptions are
complete TA-facing explanations, not abbreviated labels. Criteria retain source
pages and concept IDs; pattern definitions and exclusions remain staff-only.
Generation separates required presentation/graphs from optional style, distinguishes
minor slips from conceptual errors, and explains carried-through-error treatment.
Hints are prepared separately; drafting does not generate worked-solution ladders.
Native assignments accept up to 30 reference PDFs. Drafting accepts at most 160
reference pages / 40 MiB of rendered images and fails before a model call if exceeded.
All included pages have text, an image, and explicit document/page identity.

Connected routes (course instructor only, including the explicit open-demo teacher):
- `POST /classroom/rubric-drafts`: `{expectedRevision, consent: true, requestId}`.
  Requires server `EXTERNAL_AI_ENABLED` and configured credentials. Uses only saved
  blank/solution/past-example references, never student attempts or hidden keys.
  Returns a persistent `{id, status, revision, spec, coverage, error}` draft job (202).
  Reusing a request ID returns the same job; only one running job per course.
- `GET /classroom/rubric-drafts/{id}`: same staff-only shape; polling never calls AI.
  A completed spec is imported only if the workspace revision still matches. Existing
  published standards, submissions, and grades are unchanged. Finalizing is separate.

The local launcher is AI-off by default; `--allow-ai` enables explicit, consented
rubric requests. One provider request per job, no automatic paid retries. Jobs
interrupted by a process restart remain marked running and are not resubmitted.
