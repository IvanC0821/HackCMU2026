# API verification — 2026-09-12

## Automated checks

- All 35 documented HTTP operations received a successful response in the isolated
  API test suite. This is route coverage, not a claim of exhaustive input coverage.
- 69 backend tests pass; paid live tests are skipped during ordinary pytest runs.
- 8 frontend unit tests pass.
- Both Chrome workflows pass: advanced debug console and one-click sample homework.
- The separate Supabase storage branch passes its 39 backend tests. It was tested
  separately; this verification branch does not merge that pending branch.

The added route tests cover health, identity, administrator user creation, scoped
lists, feedback history, pattern analytics, restricted math checks, and rubric
draft jobs. Existing tests cover authorization, PDF geometry, grading, review,
disclosure limits, revisions, job retries and provider failures.

## Live services

| Check | Result |
|---|---|
| Z.ai hosted GLM-OCR | Passed in the live grading workflow after fixing coordinate configuration |
| OpenAI configured Astra model | Model access and a synthetic image + structured response passed |
| GPT-5.4 Mini | Model access, rubric-based assessment and generated hints passed |
| Mini rubric generation | Failed: `model_refused_or_incomplete` |
| Supabase Postgres | Read-only connection and `SELECT 1` passed; migration table exists |
| Supabase private storage | Synthetic PDF upload/read byte comparison/delete passed; test object removed |
| External JWT provider | Not configured; no live external-auth test performed |

Z.ai returned pixel boxes and page dimensions. The previous normalized default
correctly rejected those boxes but prevented OCR completion. The default is now
`pixels`; a captured, synthetic response guards against regression. Explicit
normalized mode remains supported for responses using that convention.

The live Mini assessment remained `review_required`, hid the score from the
student, and issued hints before finalization. The ordinary test suite separately
verifies instructor finalization. Mini was selected only inside the isolated test;
the application's configured model remains Astra and its external-AI switch remains
disabled. No real student work was sent to providers.

Rubric drafting failed on two attempts. The diagnostic response reported
`status: incomplete`, `reason: max_output_tokens`, an empty output list and zero
reported usage despite a 12,000-token request limit. This does not establish that
increasing the limit would solve the problem. Automatic rubric drafting remains
unverified; manually authored/imported rubrics are the working path.

## Reproduction

From `backend`, run `python -m pytest -q` for isolated tests. From `frontend`, run
`npm test`, `npm run test:browser`, and `npm run test:guided` (Chrome required).

Paid provider tests are explicitly opt-in:

```sh
VERITY_LIVE_API_TESTS=1 VERITY_LIVE_ENV_FILE=/path/to/.env python -m pytest -q tests/test_live_services.py
```

The environment file needs `OPENAI_API_KEY` and `ZAI_API_KEY`. Live tests use
synthetic PDFs and temporary local records. `VERITY_LIVE_MODEL` defaults to
`gpt-5.4-mini`; it does not change application settings. Requests incur provider
charges. Handwriting accuracy and production load were not benchmarked.

## Assignment hint-bank change

The earlier live hint-generation results above describe the prior implementation.
Student requests now use saved professor-approved text. Validation for this change:
79 backend tests and 66 frontend tests passed; 2 paid-provider tests were skipped.
Added checks cover setup-time generation with attached graded PDFs, manual modification,
approval/publication gates, student/TA access, disclosure limits, immutable published banks,
model failure, superseded jobs and concurrent professor edits. A real headless Chrome
workflow verified setup → blocked premature publication → edit → approve → publish with
no browser errors. An isolated SQLite migration reached `a281d40c791f` successfully.
Provider responses were mocked for new generation tests; no new paid model-quality benchmark
was run. The classroom adapter still requires staff to identify errors in arbitrary uploads.
