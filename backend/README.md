# Math homework backend

<!-- TODO: Replace temporary Verity branding before launch. -->

FastAPI API for handwritten/typed math homework, private PDF answer keys, versioned
rubrics, manual grading, optional AI assessment and immediate practice hints.
AI grades remain proposals until an instructor reviews and finalizes them.

## Run locally

Requires Python 3.12+ and [uv](https://docs.astral.sh/uv/getting-started/installation/).
From the repository root:

```bash
cp .env.example .env
cd backend
uv sync --frozen
uv run python -m alembic upgrade head
uv run python -m verity.cli teacher@example.test --name "Instructor" --role instructor
uv run python -m verity.cli student@example.test --name "Student" --role student
uv run python -m uvicorn verity.api:app --reload --port 8000
```

The CLI returns each user ID and an expiring bearer token. Keep tokens private.
Use the instructor token to create a course and enroll the student ID. Click
**Authorize** at http://localhost:8000/docs and enter the token. The frontend sends
`Authorization: Bearer <token>` on requests. Never embed server provider keys in
frontend code. Global role does not grant membership in someone else's course.

In a separate terminal, from `backend/`:

```bash
uv run python -m verity.jobs
```

SQLite and private local files need no extra services. AI remains off by default.
For local Postgres and separate API/worker containers instead:

```bash
docker compose -f backend/compose.yaml up --build
```

Run that from the repository root after copying `.env.example` to `.env`. The
Compose password is a local-only development value; Postgres is not host-exposed.
Provision users with `docker compose -f backend/compose.yaml exec api python -m
verity.cli ...`. No accounts or paid hosting are created by these files.

## Complete example and checks

From `backend/`:

```bash
uv run python -m scripts.demo
uv run python -m pytest -q
uv run ruff check verity tests scripts
uv run python -m scripts.export_openapi
```

The demo uses synthetic PDFs and a temporary database to exercise upload → rubric
→ grading → permitted hints → instructor finalization → student grade → analytics.
It runs without external AI. The suite also exercises mocked provider processing,
private-resource authorization, stale edits, retries, invalid evidence, uncertain
work, and cropped/rotated PDF geometry. Live model quality and handwriting accuracy
need evaluation with real instructor-approved examples and configured credentials.

## Frontend workflow

1. Instructor creates a course and enrolls provisioned students.
2. Upload instructor PDFs using multipart `file` and `kind=assignment`, `answer_key`,
   `rubric`, or `standard`; attach document IDs when creating the assignment.
3. Create a rubric from `examples/rubric.json`, or enqueue AI rubric drafting.
   Inspect the draft via its job result ID. To edit, submit the revised spec as a
   new draft version. Explicitly publish the chosen version. Published versions
   are immutable. Every assignment question must have a criterion.
4. Student uploads `kind=submission` (10 pages / 20 MiB max) and registers it under
   `/assignments/{id}/submissions`. Each new PDF is a distinct revision.
5. For a single-question submission, the whole document is available as evidence.
   For several questions, staff maps regions first via `/submissions/{id}/regions`.
   Scans can be mapped with manual boxes even without transcription. After
   assessment starts, evidence is pinned; corrections use a new submission revision.
6. POST `/submissions/{id}/assessments` with `rubric_id`, `source: ai` and a unique
   `Idempotency-Key`. Poll `/jobs/{id}`. A successful `result_id` is the assessment
   ID. Manual requests supply a complete `results` list and finish synchronously,
   using the same job response shape. Retry a failed job via `/jobs/{id}:retry`.
7. POST `/assessments/{id}/feedback` with a unique `Idempotency-Key`, `source: bank`
   or `ai`, and `requested_level`. Approved/cached hints return immediately; uncached
   AI hints return 202 with a job. Poll, then GET `/submissions/{id}/feedback`.
   No grade review is needed for practice hints. AI latency still applies; there
   is no promise of instantaneous OCR or inference.
8. Staff reads the proposal, selects rubric bands, edits/dismisses/repositions
   findings and performs optional bounded polynomial checks. Use current
   `version` as `expected_version` for edits. Instructors finalize with
   `acknowledge_review: true`; TAs cannot finalize. Uncertain outcomes and unresolved
   findings block finalization. Students see scores only after finalization.

The generated `openapi.json` and [shared contract](../docs/contracts.md) describe
all routes. Analytics require an explicit rubric ID and return distinct student
counts with coverage, not a count of annotations. Choose `latest_assessed` or
`first_submitted`; versions are never mixed. Error-pattern IDs are local to their
rubric/taxonomy version. Blank work is an assessed incomplete outcome when the
rubric defines it; unreadable work is uncertain and excluded from the denominator.

## AI and OCR configuration

Set `EXTERNAL_AI_ENABLED=true` and `OPENAI_API_KEY` in the root `.env`. Assignments
must also opt in with `external_ai_allowed: true`. `OPENAI_MODEL` defaults to
`gpt-6-astra`; set it to a Responses/structured-output/vision-capable model available
to your account. `OPENAI_REASONING_EFFORT` defaults to `high`. No reviewer model is
used. The API uses [Responses structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
with `store: false`; schema validation is not mathematical verification.

For handwriting OCR, configure `MATHPIX_APP_ID` and `MATHPIX_APP_KEY`, then set
`ocr_enabled: true` on the assignment. Pages retain images even when native text
exists. [Mathpix line geometry](https://docs.mathpix.com/reference/post-v3-text)
is mapped through stored transforms; auto-rotation is disabled and
`improve_mathpix: false` is sent. Both global and assignment permission switches
are checked before external calls. All pages may be sent to configured providers;
upload de-identified homework when evaluating with real work.

Approved pattern hints are the default. Optional generated hints require
`feedback_policy.allow_generated: true`. They are generated from a limited teaching
brief, without answer-key PDFs or staff grading rationales. Deterministic checks
bound levels, lengths and counts, but cannot guarantee free-form semantic
nondisclosure. Use approved hints for strict assignments. Repeated requests reuse
cached text for the same finding version and level. Feedback history records what
was issued, not whether a student read it. Instructor edits invalidate hint caches
by finding version; previously issued text remains an auditable historical record.

## PDF coordinates

Anchors use unrotated PyMuPDF page points (`pymupdf_unrotated`, zero-based page,
explicit document revision). Preview PNGs are rendered unrotated at the stored
scale. Multiply canonical points by `page_to_image` for those images. For a viewer
showing the original rotated PDF, apply the stored `rotation_matrix` before its
viewport scaling. Preserve aspect ratio. Do not guess coordinates from browser width.
Native evidence includes character IDs; OCR currently gives step/line geometry.
A step pin is never represented as symbol-accurate. Instructor-supplied pins are
bounds-checked. Missing automatic evidence leaves `pending_anchor`.

## Persistence and deployment

SQLAlchemy records live in Postgres in deployment; Alembic owns schema changes.
Use the Docker image for an API service and a separate worker service. Run
`alembic upgrade head` once before starting them. Health endpoints are
`/health/live` and `/health/ready`. Configure explicit frontend CORS origins.

Set a private managed Postgres `DATABASE_URL` and `S3_BUCKET`/`S3_REGION` (optional
`S3_ENDPOINT_URL`). Use the normal AWS credential chain/workload identity. Documents
are read through authorized API endpoints; there are no public object URLs.
Configure a provider's HTTPS JWKS URL, issuer and audience, provision its user
subjects, then disable `LOCAL_TOKENS_ENABLED`. Authentication verifies signature,
issuer, audience and expiry; course roles stay in the database. This repository
provides token verification/provisioning, not a hosted login or signup UI.

Workers claim durable jobs with conditional SQL updates. Completion and result
writes commit together. A crashed claim expires after 30 minutes and can be retried
up to three attempts. PostgreSQL supports multiple worker processes. Do not use
SQLite across multiple hosts. This is a small MVP: jobs process questions serially;
large-course throughput, rate limiting, cloud deployment, LMS features, automatic
scan segmentation and long-term retention/deletion administration are future work.

`POST /assessments/{id}/math-checks` supports only bounded rational polynomial
identities, using an AST whitelist and SymPy construction without string eval.
It does not verify arbitrary proofs or change grades.
