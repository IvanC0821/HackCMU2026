---
date: 2026-09-12
description: Concise, notation-safe staff grading explanations without changing scores or private evidence
tags: [design, grading]
---

# Grading explanation clarity

Related integration specification: [[classroom-connection]].

Scope approved by Ivan's September 12 request: make TA deduction reasons concise,
readable, and mathematically precise. No scoring changes or automatic regrading.

## Design context

- Audience: professors and TAs skimming proposed homework grades before approving.
- Job: understand what is wrong, verify the supporting math, and check the deduction.
- Tone: short, specific, calm. Keep the existing minimalist Lato/teal interface.
- Put the main reason first; disclose long calculations and internal codes on demand.
- Preserve mathematical notation and original evidence. Never invent a clearer
  explanation when the saved evidence does not support it.

## Implementation

New model output is guided toward Reason / Check / Rule lines within the existing
private string fields. There are no route, data-schema, rubric, score, privacy, or
student-feedback policy changes. Prompt brevity is guidance, not a claim of perfect
model compliance. Existing notes get a conservative, lossless preview; the entire
original remains expandable. No database migration or paid rewrite is required.

Math uses locally vendored KaTeX to produce accessible native MathML. Invalid math
falls back to escaped source. Trust is disabled and macro expansion is bounded.

The prompt examples/explicit format follow the official OpenAI guidance:
https://developers.openai.com/api/docs/guides/prompt-engineering
The copy hierarchy follows the workspace's Impeccable Clarify/UX-writing guidance.

## Verification

- Exact saved screenshot note: Farid, part 1(c), still 2/3.
- Concise reason, preserved complete original, follow-through condition retained.
- Fractions, row indices, matrices, signs, degrees, membership/subset symbols.
- Changed scores retain the original proposal label; missing reasons stay explicit.
- HTML injection, invalid TeX, and recursive macros cannot break review rendering.
- Existing upload, scoring, student privacy, and TA review regressions.
