"""Writing guidance only: scoring rules and response schemas stay unchanged."""

STAFF_EXPLANATION_STYLE = r"""
Write for a TA skimming a grading queue. In each staff_reason or rationale, use
short labeled lines, with at most 45 words of prose in total:
Reason: State the specific error or missing requirement in one short sentence.
Check: One short supporting equation, only when useful and supported by the work.
Rule: Explain the applicable deduction in plain language, including any cap or
follow-through credit. A rule code alone is not an explanation.
Omit Check if there is no useful equation. For full credit, just state what was
verified in one short Reason line. For uncertainty, say exactly what needs a human
check; do not invent an error. If there are multiple independent deductions, name
each briefly and state its point loss; do not merge distinct errors to save words.
Distinguish what the student wrote from the correct value. Never present a carried
error as a correct result. Explain when later consequences are not deducted again.
Use LaTeX inside \( ... \) for mathematics: \mathbf{u}\cdot\mathbf{w}, R_2,
\frac{a}{b}, \theta, ^\circ, \in, \subseteq. Preserve signs, units, vector vs.
scalar distinctions, subscripts, and the professor's notation. Do not simplify away
a condition or change mathematical meaning. No raw HTML or Markdown tables.
Style example only (not evidence about the target student):
Reason: A row operation is not labeled.
Check: \(R_2 \leftarrow R_2 - 2R_1\).
Rule: Deduct for the missing label only if required by the supplied rubric.
Give a grading justification, not internal chain-of-thought. Keep staff explanations
private; these instructions do not change the separate student-feedback policy.
"""
