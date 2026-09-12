# Homework 1
Yusuf Demir    Linear Algebra    Sep 15, 2026    GRADE: 40/40  (Prof. R. Castellano)
## Problem 1
(a) 2u - v = [4, -2, 6]^T - [1, 4, -2]^T = [3, -6, 8]^T
    (2u - v) · w = 3(-4) + (-6)(2) + 8(6) = -12 - 12 + 48 = 24
    Ans: 24
    -------
    [PROF: ✓]
(b) (1/2)w = [-2, 1, 3]^T → v + (1/2)w = [1, 4, -2]^T + [-2, 1, 3]^T = [-1, 5, 1]^T
    || [-1, 5, 1]^T || = sqrt(1 + 25 + 1) = sqrt(27) = 3 sqrt(3) ≈ 5.20
    Ans: 3 sqrt(3) ≈ 5.20
    ---------------------
    [PROF: ✓]
(c) cos θ = (u · w) / (||u|| ||w||)
    u · w = 2(-4) + (-1)(2) + 3(6) = -8 - 2 + 18 = 8
    ||u|| = sqrt(4 + 1 + 9) = sqrt(14) → ||w|| = sqrt(16 + 4 + 36) = sqrt(56) = 2 sqrt(14)
    cos θ = 8 / (sqrt(14) · 2 sqrt(14)) = 8/28 = 2/7 → θ = arccos(2/7) = 73.398...°
    Ans: θ ≈ 73.40°
    ---------------
    [PROF: ✓]
    [PROF: Problem 1  5/5]

## Problem 2
(a) AB undefined: A is 3x3 so it has 3 cols, B is 2x3 so it has 2 rows, 3 ≠ 2.
    BA is 2x3 → r1 = [1(2)+0(1)-2(0), 1(-1)+0(3)-2(4), 1(0)+0(-2)-2(1)] = [2, -9, -2]
                r2 = [3(2)+1(1)+1(0), 3(-1)+1(3)+1(4), 3(0)+1(-2)+1(1)] = [7,  4, -1]
    Ans: AB undefined,  BA = [ 2  -9  -2 ]
                             [ 7   4  -1 ]
    --------------------------------------
    [PROF: ✓]
(b) Av = [2(1)-1(-2)+0(3), 1(1)+3(-2)-2(3), 0(1)+4(-2)+1(3)]^T = [4, -11, -5]^T
    vA undefined: v is 3x1 so it has 1 col, A has 3 rows, 1 ≠ 3.
    Ans: Av = [4, -11, -5]^T,  vA undefined
    ---------------------------------------
    [PROF: ✓]
(c) Aw undefined: A has 3 cols, w is 1x3 so it has 1 row, 3 ≠ 1.
    wA = [2(2)+0(1)-1(0), 2(-1)+0(3)-1(4), 2(0)+0(-2)-1(1)] = [4, -6, -1]
    Ans: Aw undefined,  wA = [ 4  -6  -1 ]
    --------------------------------------
    [PROF: ✓]
(d) vw is 3x1 · 1x3 = 3x3 →  [  1(2)   1(0)   1(-1) ]   [  2   0  -1 ]
                             [ -2(2)  -2(0)  -2(-1) ] = [ -4   0   2 ]
                             [  3(2)   3(0)   3(-1) ]   [  6   0  -3 ]
    wv is 1x3 · 3x1 = 1x1 → wv = 2(1) + 0(-2) + (-1)(3) = -1
    Ans: vw above,  wv = [-1]  (1x1)
    --------------------------------
    [PROF: ✓]
(e) A^2 = AA → r1 = [2(2)-1(1)+0(0), 2(-1)-1(3)+0(4), 2(0)-1(-2)+0(1)] = [3, -5,  2]
                r2 = [1(2)+3(1)-2(0), 1(-1)+3(3)-2(4), 1(0)+3(-2)-2(1)] = [5,  0, -8]
                r3 = [0(2)+4(1)+1(0), 0(-1)+4(3)+1(4), 0(0)+4(-2)+1(1)] = [4, 16, -7]
    Ans: A^2 = [ 3  -5   2 ]
               [ 5   0  -8 ]
               [ 4  16  -7 ]
    ------------------------
    [PROF: ✓]
(f) B^2 undefined: B is 2x3, so BB would need 3 cols = 2 rows, which fails. B is not
    square, so it cannot be squared.
    Ans: B^2 undefined
    ------------------
    [PROF: ✓]
    [PROF: Problem 2  6/6]

## Problem 3
(a) Augmented matrix → eliminate → back substitute.
   [  1  2  -1 | -1 ]     [  1  2  -1 | -1 ]     [  1  2  -1 | -1 ]
   [  2  3   1 |  2 ] --> [  0 -1   3 |  4 ] --> [  0 -1   3 |  4 ]
   [ -1  1   2 | -1 ]     [ -1  1   2 | -1 ]     [  0  3   1 | -2 ]
                          R2 → R2 - 2R1          R3 → R3 + R1
   [  1  2  -1 | -1 ]     [  1  2  -1 | -1 ]     [  1  2  -1 | -1 ]
   [  0  1  -3 | -4 ] --> [  0  1  -3 | -4 ] --> [  0  1  -3 | -4 ]
   [  0  3   1 | -2 ]     [  0  0  10 | 10 ]     [  0  0   1 |  1 ]
   R2 → -R2               R3 → R3 - 3R2          R3 → (1/10)R3
    x3 = 1 → x2 = -4 + 3(1) = -1 → x1 = -1 - 2(-1) + 1 = 2. Three pivots, so unique.
    Ans: x = [2, -1, 1]^T
    ---------------------
    [PROF: ✓]
(b)
   [ 1  2  -1 |  4 ]     [ 1  2  -1 |  4 ]     [ 1  2  -1 |  4 ]
   [ 2  5   1 |  6 ] --> [ 0  1   3 | -2 ] --> [ 0  1   3 | -2 ]
   [ 3  7   0 | 10 ]     [ 3  7   0 | 10 ]     [ 0  1   3 | -2 ]
                         R2 → R2 - 2R1         R3 → R3 - 3R1
   [ 1  2  -1 |  4 ]     [ 1  0  -7 |  8 ]
   [ 0  1   3 | -2 ] --> [ 0  1   3 | -2 ]
   [ 0  0   0 |  0 ]     [ 0  0   0 |  0 ]
   R3 → R3 - R2          R1 → R1 - 2R2
    No pivot in col 3 → z is free, so there are infinitely many solutions. Let z = t:
    x = 8 + 7t, y = -2 - 3t, z = t.
    Ans: [x, y, z]^T = [8, -2, 0]^T + t [7, -3, 1]^T,  t ∈ R
    --------------------------------------------------------
    [PROF: ✓]
    [PROF: Problem 3  6/6]

## Problem 4
(a) Let x1, x2, x3 = mass in kg of Alloy 1, Alloy 2, Alloy 3 used in the blend.
    The 100 kg product holds 36 kg Cu, 44 kg Zn, 20 kg Ni, and no metal is lost, so
    for each metal the mass in = the mass out:
    Cu:  0.5 x1 + 0.2 x2 + 0.4 x3 = 36
    Zn:  0.3 x1 + 0.7 x2 + 0.2 x3 = 44
    Ni:  0.2 x1 + 0.1 x2 + 0.4 x3 = 20
    (adding all three → x1 + x2 + x3 = 100, which checks out)
    [PROF: ✓]
(b) Multiply each row by 10 to clear the decimals:
    Ans: [ 5  2  4 | 360 ]
         [ 3  7  2 | 440 ]
         [ 2  1  4 | 200 ]
    ----------------------
    [PROF: ✓]
(c)
   [ 5  2   4 | 360 ]     [ 1  0  -4 | -40 ]     [ 1  0  -4 | -40 ]
   [ 3  7   2 | 440 ] --> [ 3  7   2 | 440 ] --> [ 0  7  14 | 560 ]
   [ 2  1   4 | 200 ]     [ 2  1   4 | 200 ]     [ 2  1   4 | 200 ]
                          R1 → R1 - 2R3          R2 → R2 - 3R1
   [ 1  0  -4 | -40 ]     [ 1  0  -4 | -40 ]     [ 1  0  -4 | -40 ]
   [ 0  7  14 | 560 ] --> [ 0  1   2 |  80 ] --> [ 0  1   2 |  80 ]
   [ 0  1  12 | 280 ]     [ 0  1  12 | 280 ]     [ 0  0  10 | 200 ]
   R3 → R3 - 2R1          R2 → (1/7)R2           R3 → R3 - R2
   [ 1  0  -4 | -40 ]
   [ 0  1   2 |  80 ]
   [ 0  0   1 |  20 ]
   R3 → (1/10)R3
    x3 = 20 → x2 = 80 - 2(20) = 40 → x1 = -40 + 4(20) = 40.
    Check: 40 + 40 + 20 = 100 kg, Cu = 20 + 8 + 8 = 36 kg. ✓
    Ans: 40 kg Alloy 1, 40 kg Alloy 2, 20 kg Alloy 3
    ------------------------------------------------
    [PROF: ✓]
    [PROF: Problem 4  8/8]

## Problem 5
(a)
   [ 1  2  1 ]     [ 1  2  1 ]     [ 1  2  1 ]     [ 1  2  1 ]     [ 1  2  0 ]
   [ 2  4  3 ] --> [ 0  0  1 ] --> [ 0  0  1 ] --> [ 0  0  1 ] --> [ 0  0  1 ]
   [ 3  6  4 ]     [ 3  6  4 ]     [ 0  0  1 ]     [ 0  0  0 ]     [ 0  0  0 ]
                   R2 → R2 - 2R1   R3 → R3 - 3R1   R3 → R3 - R2    R1 → R1 - R2
    Ans: RREF(A) = [ 1  2  0 ; 0  0  1 ; 0  0  0 ]
    ------------------------------------------------
    [PROF: ✓]
(b) rank(A) = 2, since the RREF has exactly two pivots (cols 1 and 3), i.e. two
    nonzero rows.
    Ans: rank(A) = 2
    ----------------
    [PROF: ✓]
(c) Row reducing [A | b] the same way makes row 3 into [ 0  0  0 | b3 - b1 - b2 ].
    0 solutions: possible. If b3 ≠ b1 + b2, e.g. b = [0, 0, 1]^T, row 3 reads 0 = 1,
      so the system is inconsistent.
    Exactly 1: impossible. Col 2 is never a pivot col, so x2 is free whenever the
      system is consistent; rank(A) = 2 < 3 unknowns, so uniqueness cannot happen.
    Infinitely many: possible. If b3 = b1 + b2, e.g. b = 0 or b = [1, 3, 4]^T, the
      system is consistent and the free variable x2 gives a whole line of solutions.
    Ans: 0 possible, 1 impossible, ∞ possible
    -----------------------------------------
    [PROF: ✓]
    [PROF: Problem 5  7/7]

## Problem 6
(a) Row reduce the matrix whose columns are v1, v2, v3:
   [ 1  2   0 ]     [ 1  2   0 ]     [ 1  2  0 ]     [ 1  0  -2 ]
   [ 0  1   1 ] --> [ 0  1   1 ] --> [ 0  1  1 ] --> [ 0  1   1 ]
   [ 2  3  -1 ]     [ 0 -1  -1 ]     [ 0  0  0 ]     [ 0  0   0 ]
                    R3 → R3 - 2R1    R3 → R3 + R2    R1 → R1 - 2R2
    Two pivots for three vectors → linearly dependent. The relation is v3 = v2 - 2v1,
    since [2, 1, 3]^T - [2, 0, 4]^T = [0, 1, -1]^T. ✓
    v1 and v2 are not parallel, so their span is a plane through the origin.
    Ans: dependent; span is a plane in R^3
    --------------------------------------
    [PROF: ✓]
(b) Same idea with v1, v2, v3 as columns:
   [ 1  0  1 ]     [ 1  0   1 ]     [ 1  0   1 ]
   [ 1  1  0 ] --> [ 0  1  -1 ] --> [ 0  1  -1 ]
   [ 0  1  1 ]     [ 0  1   1 ]     [ 0  0   2 ]
                   R2 → R2 - R1     R3 → R3 - R2
    Three pivots for three vectors → c1 v1 + c2 v2 + c3 v3 = 0 only when
    c1 = c2 = c3 = 0, so the set is linearly independent.
    Three independent vectors in R^3 span all of R^3.
    Ans: independent; span is all of R^3
    ------------------------------------
    [PROF: ✓]
    [PROF: Problem 6  8/8]

## Grader summary
    Problem 1: 5/5
    Problem 2: 6/6
    Problem 3: 6/6
    Problem 4: 8/8
    Problem 5: 7/7
    Problem 6: 8/8
    Total: 40/40
    40/40. Every row operation is labeled, every claim about rank, solution count, and independence carries a justification, and Problem 4 keeps its units from the variable definitions through to the answer. One note, no deduction: N5 puts the row operation to the left of or above the matrix it produces; yours sit underneath, which is labeled but harder to follow.
