---
date: 2026-09-12
description: "A product-only, under-three-minute video rehearsal for one missing-row-operations case."
tags: [project/hackcmu, demo]
---

# Demo

Project context: [[HackCMU 2026 Grading Copilot]].

Target duration: 2 minutes 45 seconds. This is a rehearsal target, not a recorded
or measured video duration. No technical architecture explanation in the video.

| Time | Screen | What to show |
|---|---|---|
| 0:00–0:15 | Homework 1 | A student has the right answer, but their reasoning is incomplete. |
| 0:15–0:45 | Professor setup | The question PDF, worked solution, and explicit missing-work deduction. Finalize the standard. |
| 0:45–1:10 | Incomplete work | Check it. Highlight the gap between matrices and the broad feedback. No solution steps are supplied. |
| 1:10–1:40 | Revision | Check the corrected work, then the valid alternative. Both satisfy the standard. Submit final. |
| 1:40–2:15 | TA review | Compare the original attempt with the revision, skim the complete work, and save the reviewed grade. |
| 2:15–2:45 | Learning progress | First-attempt difficulty remains visible after the work improves. Show one student, one resolved issue, and the teaching use case. |

Keep the demo-case and provisional-score labels visible. Describe this as a
controlled workflow demonstration. Do not imply the authored student revision was
produced by a real student responding to the tool, or that the checker read the PDF.

If live AI rubric drafting is available and validated beforehand, use that actual
draft. Otherwise explicitly identify the preloaded standard as the demo rubric.
Do not fake a live provider call or conceal a recorded fallback.

Disputes and corrections work, but are an optional follow-up outside this tight
main sequence. A deliberate AI mistake is not required to demonstrate the product.

For the separate technical presentation: show the matrix-operation verifier,
rubric band scoring, immutable-version history and tests. Explain what uses the
model and what runs deterministically. Have a professor validate the intended
deduction; use only feedback or video participation they actually consent to.
