# Homework 1 Grading Guidelines
# Linear Algebra (21-254 style, fictional course data)
Finalized by the instructor for TA use. Total 40 points.

## Course-wide expectations (apply to every problem)
E1. Show work with brief explanations. A bare final answer with no supporting work earns at most
    half credit on that part, even when the answer is correct.
E2. Every Gaussian elimination step must be labeled with the elementary row operation used, in the
    form  R2 → R2 - 2R1  (or equivalent wording). Unlabeled row reduction: deduct 1 point per
    problem, even if the final answer is correct.
E3. Final answers must be clearly indicated (boxed, underlined, or labeled "Final answer").
    Vectors are written as column vectors, or with an explicit transpose, e.g. [2, -1, 1]^T.
E4. General solutions of systems with free variables must name the free variable(s) and be written
    in parametric form. "x3 is free" with no parametrization loses 1 point.
E5. "Undefined" answers must state the dimension reason (which sizes fail to match).
E6. Applied problems: define every variable with units, and state final answers with units.
E7. Claims about independence, rank, or number of solutions must be justified (row reduction,
    an explicit dependence relation, or a pivot-count argument). "By inspection" earns no credit.
E8. Arithmetic slips that are carried through consistently: deduct once (usually 1 point) where the
    slip occurs; do not re-deduct for consequences downstream if the method is otherwise correct.
E9. Alternative valid methods (e.g., a determinant to test independence of three vectors in R^3,
    Cramer's rule, or substitution for a small system) earn full credit when the reasoning is
    complete and correct, EXCEPT where the problem explicitly requires Gaussian elimination
    (Problems 3, 4c, 5a). There, a different method earns at most half credit for that part.

## Problem 1 (5 pts)
(a) 1 pt: 24. Full credit needs 2u - v computed and the dot product expanded.
(b) 1 pt: 3 sqrt(3) (or sqrt(27), or ≈ 5.20). Must show the intermediate vector [-1, 5, 1]^T.
(c) 3 pts: θ ≈ 73.40°.
    1 pt correct u·w = 8 and both norms (sqrt(14), sqrt(56) = 2 sqrt(14));
    1 pt cos θ = 2/7 with the formula stated;
    1 pt correct angle in degrees to two decimals. Radians only, or wrong rounding: -1.

## Problem 2 (6 pts, 1 pt each)
(a) AB undefined (3 cols vs 2 rows); BA = [2 -9 -2; 7 4 -1].
(b) Av = [4, -11, -5]^T; vA undefined.
(c) Aw undefined; wA = [4 -6 -1].
(d) vw = [2 0 -1; -4 0 2; 6 0 -3]; wv = [-1] (1x1).
(e) A^2 = [3 -5 2; 5 0 -8; 4 16 -7].
(f) B^2 undefined (B not square).
Each part: both pieces correct with reasons → 1; one piece wrong or "undefined" with no reason → 0.5;
both wrong → 0. Entry-level arithmetic slip in an otherwise correct product → 0.5.

## Problem 3 (6 pts)
(a) 3 pts: x = [2, -1, 1]^T.
    1 pt correct augmented matrix and labeled row operations reaching echelon form;
    1 pt correct back substitution / RREF;
    1 pt correct final answer stated as a vector. Unlabeled row ops: -1 (E2).
(b) 3 pts: [x, y, z]^T = [8, -2, 0]^T + t[7, -3, 1]^T.
    1 pt labeled row ops reaching RREF [1 0 -7 | 8; 0 1 3 | -2; 0 0 0 | 0];
    1 pt identifying z as free and stating infinitely many solutions;
    1 pt parametric form (E4). A single particular solution presented as "the" solution: max 1/3.

## Problem 4 (8 pts)
(a) 3 pts: variables defined as masses in kg (E6) and three correct equations
    (0.5x1 + 0.2x2 + 0.4x3 = 36, 0.3x1 + 0.7x2 + 0.2x3 = 44, 0.2x1 + 0.1x2 + 0.4x3 = 20).
    -1 if variables are not explained; -1 if units missing; -1 per wrong equation.
    Using x1 + x2 + x3 = 100 in place of one metal equation is acceptable (it is a consequence).
(b) 1 pt: correct augmented matrix (decimal or the x10 integer version).
(c) 4 pts: 40 kg, 40 kg, 20 kg.
    2 pts labeled Gaussian elimination (E2 applies: unlabeled → -1);
    1 pt correct back substitution;
    1 pt final answer with units (E6).

## Problem 5 (7 pts)
(a) 2 pts: RREF = [1 2 0; 0 0 1; 0 0 0] with every row operation labeled. Correct RREF with no
    labeled operations: 1/2 (E2). Stopping at echelon form (not reduced): -0.5.
(b) 1 pt: rank 2 because there are two pivots (or two nonzero rows in RREF). No reason: 0.5.
(c) 4 pts: 0 solutions possible (1 pt, must give a reason such as an inconsistent row or a b not in
    the column space); exactly 1 solution impossible (2 pts: must connect rank 2 < 3 unknowns, or a
    free variable, to why uniqueness never happens); infinitely many possible (1 pt, with reason).
    Claiming exactly one solution is possible: 0 for that piece.

## Problem 6 (8 pts, 4 pts each)
(a) Dependent; span is a plane. 2 pts justification (row reduction with two pivots, or the explicit
    relation v3 = v2 - 2v1); 1 pt correct dependent/independent verdict; 1 pt correct geometric
    description. "Independent" verdict with correct arithmetic: max 1/4.
(b) Independent; span is all of R^3. 2 pts justification (three pivots, or det = 2 ≠ 0); 1 pt verdict;
    1 pt geometry. A determinant argument is a fully acceptable alternative here (E9).

## Feedback category vocabulary (for student-facing flags)
The student-facing feedback must use only these broad categories, never the rubric text above:
  - arithmetic: a numerical slip in an otherwise sound method
  - logic: a reasoning step that does not follow, or a wrong conclusion from correct work
  - missing-work: required steps, justification, or row-operation labels are absent
  - notation: vectors/matrices written in a form that does not match course conventions
  - presentation: final answer not indicated, units missing, or variables not defined
  - method: a method other than the one the problem requires
