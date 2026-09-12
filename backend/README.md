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
   `rubric`, `standard`, or `graded_example`; attach document IDs when creating the assignment.
3. Create a rubric from `examples/rubric.json`, or enqueue AI rubric drafting.
   Inspect the draft via its job result ID. To edit, submit the revised spec as a
   new draft version. Review/edit and approve its hint bank, then explicitly publish the chosen version. Published versions
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
   or `ai`, and `requested_level`. Both return saved, approved hints immediately.
   Read history at `/submissions/{id}/feedback`. Hint generation and professor approval
   happen during setup; grade review remains separate. OCR/assessment latency still applies.
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

For hosted handwriting OCR, add `ZAI_API_KEY` to the root `.env`, set
`EXTERNAL_AI_ENABLED=true`, and set both `external_ai_allowed: true` and
`ocr_enabled: true` on the assignment. Restart the API and worker. The adapter uses
[Z.ai GLM-OCR layout parsing](https://docs.z.ai/api-reference/tools/layout-parsing);
no local model, GPU, or additional SDK is required. The key stays server-side.
OpenAI credentials are still needed separately for AI grading and generated hints.

The worker sends one unrotated PNG per page as a base64 data URI, limited to 10 MiB
per image. No public storage URL is created. Returned text and formula blocks are
mapped into the existing step-level evidence records. Blocks are not symbol-accurate
anchors, and confidence is unknown when the provider supplies none.
`GLM_OCR_BBOX_FORMAT=pixels` follows the hosted API response verified on 2026-09-12.
Pixel mode requires provider page dimensions. The reference documentation instead
describes 0–1 coordinates; `normalized` remains available for that convention.
No coordinate format is guessed; malformed boxes, rotations, missing layout or
inconsistent dimensions fail safely. Token usage is copied into each region's
evidence for inspection; it must not be summed across regions as a billing total.

Both global and assignment opt-ins are checked before external calls. Original
PDFs stay unchanged. Crop-image and visualization outputs are disabled; this does
not promise provider zero retention. Completed OCR (including historical evidence)
is reused. No automatic HTTP retries or alternate paid provider calls occur;
explicitly retrying a failed job can incur new OCR charges. The guided sample
launcher remains offline and does not call Z.ai.

Assignment hint banks are prepared once during setup. AI drafts require
`feedback_policy.allow_generated: true` and external AI permission. They use the current
rubric, attached references and graded examples; the professor reviews and edits them
before publication. Student feedback only selects approved saved text. Repeated requests
never call a model. Issued feedback remains an auditable historical record.

## PDF coordinates

Anchors use unrotated PyMuPDF page points (`pymupdf_unrotated`, zero-based page,
explicit document revision). Preview PNGs are rendered unrotated at the stored
scale. Multiply canonical points by `page_to_image` for those images. For a viewer
showing the original rotated PDF, apply the stored `rotation_matrix` before its
viewport scaling. Preserve aspect ratio. Do not guess coordinates from browser width.
Native evidence includes character IDs; OCR currently gives block/step geometry.
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

## Hints prepared during assignment setup

Student feedback uses a saved, professor-approved assignment hint bank. It never calls a
hint model, even for the compatibility request `source: "ai"`. The response source is
`bank`. Assessment jobs also only select saved hints; grades still require their separate
human review. Legacy published rubrics retain their previously approved hints.

Creating a rubric automatically prepares a bank. With external AI and generated feedback
enabled, the worker generates a draft once. Otherwise it imports rubric hints and fills
missing targets with conservative, editable templates. Assignment creation also queues
initial rubric drafting when both settings are enabled; staff responses include
`setup_job_id`. A question must have criteria before a criterion-specific hint bank can be
prepared. Repeated student requests never trigger generation or recalibration.

Staff workflow (prefix `/api/v1`):
1. `GET /rubric-versions/{id}/hint-bank` — inspect entries, original proposal, provenance,
   calibration notes, and generation job/error.
2. `PUT /rubric-versions/{id}/hint-bank` — send `expected_version` and edited `entries`.
   Only text is editable; target IDs, levels and complete coverage are validated.
3. `POST /rubric-versions/{id}/hint-bank:approve` — send `expected_version`. Professor-only;
   this approves exactly the current text and invalidates outstanding generation.
4. Publish the rubric. Its bank is now immutable. New standards use a new version/bank.
5. A failed draft can be edited manually or explicitly retried through
   `POST /rubric-versions/{id}/hint-bank:generate` with `expected_version`.

Upload prior graded PDFs using `kind=graded_example` and include their document IDs in
`material_document_ids`. AI sees the attached reference PDFs (images plus native text),
including teacher annotations. It records calibration notes for professor review; current
rubric requirements override conflicting historical examples. It never automatically
mines unrelated student submissions or changes scores from these examples. There is a
20-reference-page and bounded-context limit; failures are visible and preserve editable
hints. Original proposals and edits are retained in audit history.

For the connected website, use `python run_classroom.py --ai-hints` to enable setup-time
AI and its worker, using configured provider credentials/model. Without that flag, the
same review/edit/approval flow works with rubric hints and conservative templates.
Grading standards → **Assignment hints → Review / refresh hints** provides the controls.
Attach examples under past graded work. Classroom saves wait 30 seconds before queued
generation; superseded drafts are skipped to avoid paying for every edit. Review saves
and student requests do not regenerate hints. The adapter still requires manual review
to identify errors in arbitrary uploaded student PDFs.

Run `python -m alembic upgrade head` before restarting the core API/worker. The new
`assignment_hint_banks` table is additive; the classroom launcher creates its local table
at startup. Previously published classroom versions keep generic feedback until a new
standard is published with approved hints. No answer key or whole hint bank is returned
to the student API.
