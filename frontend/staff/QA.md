---
date: 2026-09-12
description: "Verification evidence and outstanding gaps for the single-case teaching MVP."
tags: [project/hackcmu, quality]
---

# Verification

Project context: [[HackCMU 2026 Grading Copilot]].

## Evidence

- 66 Node tests pass (39 staff tests plus 27 preserved prototype regressions).
- Node tests cover the 8/10 incomplete case and both distinct valid 10/10 paths.
- A changed intermediate value is detected despite a correct final answer.
- A 200-case operation test independently calculates row additions and reversals.
- Controller event tests execute professor setup → checks → final submission →
  required TA skim → dashboard, plus disputes, malformed input and storage fallback.
- Storage tests use a transaction mock to verify PDF-blob round trips and rejection
  of stale-tab writes. Actual browser IndexedDB still needs manual verification.
- API mocks verify the existing upload/assignment/draft/job/result contract and
  no remote publishing. Live provider access has not been tested.
- Six PDF pages were rendered with Poppler and individually visually inspected.
  No clipping, missing glyphs or overlap observed. Rendered math matches the case
  data. Poppler emitted font-cache warnings, but produced readable pages.
- Build and standalone JavaScript parsing pass. Tests are not grading-accuracy or
  learning-outcome evidence for arbitrary handwritten homework.

## UI audit

Source-level audit using the workspace frontend-design/Impeccable checklist.
Browser rendering is unverified. Scores below are provisional source-review scores,
not a WCAG compliance certification or measured performance benchmark.

| Dimension | Score / 4 | Evidence and limitation |
|---|---|---|
| Accessibility | 3 | Native controls, visible labels/focus, skip link, chart description and table. Actual keyboard flow unverified. |
| Performance | 3 | No runtime framework/dependency; local compute. Whole-workspace blob persistence may be costly with large documents. |
| Responsive | 2 | Mobile, tablet and wide layouts; table scroll containers. No browser screenshots yet. |
| Theming | 3 | Consistent light palette and tokens; dark mode deliberately out of scope. |
| Design conventions | 3 | Brief-led minimalist course rail, document review and data-derived chart. Final visual judgment pending. |
| Total | 14 / 20 | Provisional; browser QA required before calling this demo-ready. |

Measured text contrast against white: muted #586367 = 6.18:1, teal #1a505a =
8.98:1, amber #815300 = 6.62:1. Dashed chart line #698b97 = 3.66:1 against
white (graphical mark, not text). Chart series also differ by dash and marker fill.

Positive findings: shared case data for UI/math/PDFs; explicit demo disclosures;
human review gate; independent page maps; escaped user text; draft/final separation;
no forced AI outputs, automatic grade publication or unmeasured improvement claims.

## Outstanding

- **P1 verification gap:** run the full UI in a browser at desktop and narrow widths,
  check PDF dialogs, keyboard operation, refresh persistence and concurrent tabs.
  Session cannot bind a loopback server (EPERM), and prior file-URL browser policy
  restrictions remain. User was asked to launch `npm run start:staff`.
- **P1 scope gap:** arbitrary handwritten-PDF grading and live GPT grading remain
  unintegrated with this new UI. The matrix checker uses explicit transcriptions.
  A general-purpose AI-grader demo requires a separate verified live pipeline.
- **P2:** large PDF blobs are stored with version snapshots; measure memory/save
  behavior before using many real submissions. Keep this rehearsal to one case.
- **P2:** role selector is a local preview, not authentication. No production use.
- **P2:** instructor-created rubric instructions outside the fixed row-case profile
  require manual review; they must not silently inherit the demo checker assumptions.

Next quality action: browser verification, focused responsive/keyboard fixes, then
the final polish pass. Do not publish a claim that all judging criteria are met.
