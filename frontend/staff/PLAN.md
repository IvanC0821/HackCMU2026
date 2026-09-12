---
date: 2026-09-12
description: "Approved professor/TA MVP scope, minimal UI, local persistence, API boundaries, and verification plan."
tags: [project/hackcmu, implementation]
---

# Professor and TA MVP

Project context: [[HackCMU 2026 Grading Copilot]].

Approved brief, 2026-09-12: unlimited checks for now; teacher workspace first.
Ivan subsequently approved the full single-case walkthrough: professor setup,
incomplete/corrected/alternative work, student feedback, TA skim, and analytics.
Simulation using Ivan's actual homework remains deferred. No technical explanation
is included in the demo-video sequence.

## Workflow

- Linear Algebra → Homework 1 → reference PDFs → editable rubric → finalize setup.
- Homework dashboard: first/latest question percentages, coverage, mistake drill-down,
  recitation priorities and an editable announcement draft. Derived from records,
  never decorative or randomized numbers.
- Graded homeworks: all final submissions require a skim of every question.
  Prioritize disputes and unclear work, preserve full work and history, require
  rationale for changed scores. Either staff role can save local reviewed grades.
- Rubric changes create versions. Old reviews stay attached to their version;
  a separate action creates unresolved reviews against the current version.
- Browser-local persistence includes PDF blobs. State and files can be cleared only
  after explicit confirmation. No credentials are persisted.
- Sample fixture generation is labeled and separate from live API rubric drafting.
  Live drafting uses existing authenticated API routes to create a new assignment
  inside an existing course and import a generated draft locally;
  it does not modify the backend contract or publish a rubric remotely.
- Primary demo is one student's missing-work/revision case; any larger synthetic
  cohort is optional and explicitly labeled, never evidence of class performance.
- The single-case checker evaluates explicitly entered matrices, elementary row
  operations and final values. It is not OCR or general handwritten AI grading.
- Matching PDF assets support the example; the checker reads the transcription,
  not those PDF bytes. Complete and alternative paths both receive full credit.

## Design

Quiet, familiar, readable teaching tool. Retain Lato (with offline sans fallback),
white #ffffff, navigation #f8f9f9, text #25292b, teal #1a505a,
blue #076bad, amber #815300. Fixed rem type scale 0.875/1/1.25/1.75.
Left course rail, wide workspace, underlined section navigation. The meaningful
question chart anchors the dashboard. Review uses a large document next to a
compact rubric. No decorative chart, gradients, or stacked card grids.

Review against brief: one course/homework initially, locally functional controls,
explicit sample labels, staff authority and unlimited attempts. Preserve the older
prototype modules and unrelated student worktree. No proprietary branding/assets.

## Verification

Unit tests: rubric validation, decimals, versions, all-question skim, overrides,
appeals, per-student analytics, stale data exclusion, unlimited revisions.
UI event tests, mock API contract tests, build/parse, responsive/keyboard source
audit. A browser checklist is recorded in QA.md, but session loopback binding currently fails EPERM.
Do not claim browser or live-provider verification unless actually run.
