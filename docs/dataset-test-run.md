---
date: 2026-09-12
description: Results and reproduction of the two-submission synthetic live grading pilot
tags: [testing, demo]
---

# Homework 1: live dataset test

Related: [[classroom-connection]].

Run: September 12, 2026. Synthetic data only. Two actual model requests, no retries.

| Submission | AI estimate | Hidden professor grade | Part disagreements | Model time |
|---|---:|---:|---:|---:|
| Hiro Tanaka | 38.5 / 40 | 38.5 / 40 | 0 of 19 | 74.86 s |
| Wesley Park | 37 / 40 | 37 / 40 | 0 of 19 | 92.63 s |

These two cases match the supplied professor records. This is a small synthetic
workflow test, not an accuracy benchmark or evidence of improved learning.

## Current classroom

26 PDFs (198 pages), 12 synthetic students, six questions and 19 scored parts.
The ten past grades were imported from `professor_grade.json`, not regenerated.
Both new scores are AI proposals awaiting TA review. Supplied page maps preserve
multiple pages per question and pages shared across questions. The old classroom
JSON was archived locally before replacement; its PDFs were not removed.

Student and teacher screens read the same SQLite records. The teacher chart polls
every 1.5 seconds. All students currently have one submission, so first/latest
averages should coincide; the demo does not fabricate a revision improvement.

Hiro's deductions: unlabeled elimination in 3(a), unjustified rank in 5(b).
Wesley's deductions: missing work in 1(a), wrong vector expression in 1(b), matrix
squaring in 2(f), and the no-solutions claim in 5(c). His valid determinant method
in 6(b) received full credit. Students receive only general categories, not these
staff explanations or worked answers.

The PDF annotation update locates all six deductions in the two new submissions.
Hiro's 3(a) marker highlights the related elimination work on page 3 (missing labels
have no incorrect symbol). His rank statement is matched on actual page 6, rather
than trusting the model's suggested page. Wesley has four matched-line markers on
pages 1, 1, 3 and 6. Click/hover/focus opens a solution-free explanation on the paper.
Escape dismisses it; highlights and pins scale with zoom.

Across all 12 students, 75 deductions have 5 matched-line anchors, 14 related-work
anchors, 49 subpart-only anchors and 7 unlocated findings. Historical professor
records generally lack quoted evidence, so a subpart location is explicitly labeled
as contextual, not an exact mistaken line. Ambiguous or absent text gets no fake pin.
Geometry comes from native PDF glyph bounds and rotation/crop transforms, following
[PyMuPDF's coordinate conventions](https://pymupdf.readthedocs.io/en/latest/page.html).
No scores, original PDFs, model responses or human review decisions were changed.

## Blind input and provenance

Each request used PDF-extracted text from the blank assignment, professor solution,
guidelines, persona, and all ten graded-example PDFs. It also used the target
submission's native text and images of every page (1.5× rendering).
The hidden test keys, design ground truth, README and grades_summary.csv were
excluded by an explicit file allowlist. Responses were saved before the hidden
professor records were opened for comparison. No score was tuned afterward.

The configured `gpt-6-astra` model and `high` reasoning setting were retained.
Usage: Hiro 67,711 input + 4,179 output tokens; Wesley 66,448 input + 4,925 output.
Provider-reported total: 143,263 tokens. Monetary billing was not measured.
Server validation requires every part once, half-point bands within the maximum,
and server-summed totals. Unreadable work may remain unresolved. Quoted locations
must match unique PDF text on a mapped page before becoming a student-visible pin.
Contextual pins instead require a detected question/subpart on a mapped page and
are labeled separately. Private quoted evidence is never included in student JSON.
Structured parsing follows the [official API guidance](https://developers.openai.com/api/docs/guides/structured-outputs).

Full raw responses and their hashes are retained in ignored local
`backend/data/classroom/pilot-runs/`. Sanitized, synthetic assessment records in
`demo-data/06_recorded_ai_test/` reproduce this completed run without API charges.
Replay is labeled as a recorded AI result, not a new live assessment.

## Reproduce

After the README installation steps, from `backend/`:

```sh
# Import all PDFs and ten prior grades; the two new submissions remain pending.
uv run python import_classroom_dataset.py

# Choose ONE: replay this recorded run for a free walkthrough...
uv run python import_classroom_dataset.py --replay-recorded

# ...or perform at most two real, paid requests using your configured server key.
uv run python import_classroom_dataset.py --grade-new

uv run python run_classroom.py
```

Re-running the importer preserves the current dataset and existing reviews. It does
not duplicate students, overwrite TA edits or automatically repeat paid requests.
Switch student using the top selector; open **View submission**. In the teacher
tab, open **Homework 1 → Review queue** or **Overview** for the chart.

For an existing database, `uv run python refresh_classroom_annotations.py` refreshes
only feedback/location metadata. It checks the stored PDF hash, preserves attempt
history and grades, and is idempotent. Restart the local server after updating code.

## Remaining limits

The measured grading latency is 75–93 seconds, not the desired few seconds.
Repeated reference context is large; a reviewed compact rubric and targeted
examples are a future optimization, not implemented performance improvement.
These PDFs use a handwriting font with native text, not real handwritten scans.
Arbitrary new browser uploads still wait for staff review; this CLI pilot does not
connect the public upload route to paid grading. The app is local, not hosted by GitHub.
Default open-demo mode deliberately allows every visitor to switch to staff.
