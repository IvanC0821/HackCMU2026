# Homework 1
Arjun Mehta    Linear Algebra    Sep 17, 2026    GRADE: 31.5/40  (Prof. R. Castellano)

## Problem 1
(a) Final answer: 24
    -----------------

    [PROF: -0.5 E1 Bare answer; 2u - v and the expanded dot product are not shown.]
(b) (1/2) w = [-2, 1, 3]^T
    v + (1/2) w = [1, 4, -2]^T + [-2, 1, 3]^T = [-1, 5, 1]^T
    || v + (1/2) w || = sqrt(1 + 25 + 1) = sqrt(27) = 3 sqrt(3) ≈ 5.20
    Final answer: 3 sqrt(3)
    ----------------------

    [PROF: ✓]
(c) cos θ = (u · w) / (||u|| ||w||)
    u · w = (2)(-4) + (-1)(2) + (3)(6) = -8 - 2 + 18 = 8
    ||u|| = sqrt(4 + 1 + 9) = sqrt(14)
    ||w|| = sqrt(16 + 4 + 36) = sqrt(56) = 2 sqrt(14)
    cos θ = 8 / (sqrt(14) · 2 sqrt(14)) = 8 / 28 = 2/7
    θ = arccos(2/7) ≈ 73°
    Final answer: θ ≈ 73°
    --------------------

    [PROF: -1 E8 Angle rounded to 73°; the problem requires two decimals, θ ≈ 73.40°.]
    [PROF: Problem 1  3.5/5]

## Problem 2
(a) AB: undefined, because A has 3 columns and B has only 2 rows (3 ≠ 2).
    BA is 2x3 since B is 2x3 and A is 3x3.
    row 1: [ 1(2)+0(1)+(-2)(0), 1(-1)+0(3)+(-2)(4), 1(0)+0(-2)+(-2)(1) ] = [2, -9, -2]
    row 2: [ 3(2)+1(1)+1(0), 3(-1)+1(3)+1(4), 3(0)+1(-2)+1(1) ] = [7, 4, -1]
    BA = [ 2  -9  -2 ]
         [ 7   4  -1 ]
    ---------------------
    [PROF: ✓]
(b) Av = [ 2(1)+(-1)(-2)+0(3),  1(1)+3(-2)+(-2)(3),  0(1)+4(-2)+1(3) ]^T = [4, -11, -5]^T
    vA: undefined, v is 3x1 and A is 3x3, so 1 column cannot meet 3 rows.
    Final answer: Av = [4, -11, -5]^T,  vA undefined
    ------------------------------------------------
    [PROF: ✓]
(c) Aw: undefined, A is 3x3 and w is 1x3, so 3 columns cannot meet 1 row.
    wA = [ 2(2)+0(1)+(-1)(0),  2(-1)+0(3)+(-1)(4),  2(0)+0(-2)+(-1)(1) ] = [ 4  -6  -1 ]
    [PROF: -0.5 N6 Final answer is neither boxed nor labeled Final answer.]
(d) vw is 3x1 times 1x3, so it is 3x3:
    vw = [  2   0  -1 ]
         [ -4   0   2 ]
         [  6   0  -3 ]
    wv is 1x3 times 3x1, so it is 1x1: 2(1) + 0(-2) + (-1)(3) = -1.  wv = [ -1 ]
    -----------------------------------------------------------------------------
    [PROF: ✓]
(e) A^2 = A times A:
    row 1: [ 2(2)+(-1)(1)+0(0), 2(-1)+(-1)(3)+0(4), 2(0)+(-1)(-2)+0(1) ] = [3, -5, 2]
    row 2: [ 1(2)+3(1)+(-2)(0), 1(-1)+3(3)+(-2)(4), 1(0)+3(-2)+(-2)(1) ] = [5, 0, -8]
    row 3: [ 0(2)+4(1)+1(0), 0(-1)+4(3)+1(4), 0(0)+4(-2)+1(1) ] = [4, 16, -7]
    A^2 = [ 3  -5   2 ]
          [ 5   0  -8 ]
          [ 4  16  -7 ]
    ---------------------
    [PROF: ✓]
(f) B^2 undefined
    ----------------

    [PROF: -0.5 E5 Undefined is stated with no dimension reason; B is 2x3, so BB would need 3 = 2.]
    [PROF: Problem 2  5/6]

## Problem 3
(a) [  1  2  -1 | -1 ]
    [  2  3   1 |  2 ]
    [ -1  1   2 | -1 ]
    R2 → R2 - 2R1:   [ 1   2  -1 | -1 ]
                     [ 0  -1   3 |  4 ]
                     [-1   1   2 | -1 ]
    R3 → R3 + R1:    [ 1   2  -1 | -1 ]
                     [ 0  -1   3 |  4 ]
                     [ 0   3   1 | -2 ]
    R2 → -R2:        [ 1  2  -1 | -1 ]
                     [ 0  1  -3 | -4 ]
                     [ 0  3   1 | -2 ]
    R3 → R3 - 3R2:   [ 1  2  -1 | -1 ]
                     [ 0  1  -3 | -4 ]
                     [ 0  0  10 | 10 ]
    R3 → (1/10)R3:   [ 1  2  -1 | -1 ]
                     [ 0  1  -3 | -4 ]
                     [ 0  0   1 |  1 ]
    x3 = 1, x2 = -4 + 3(1) = -1, x1 = -1 - 2(-1) + 1 = 2. One solution only.
    Final answer: x = [2, -1, 1]^T
    ------------------------------

    [PROF: ✓]
(b) [ 1  2  -1 |  4 ]
    [ 2  5   1 |  6 ]
    [ 3  7   0 | 10 ]
    R2 → R2 - 2R1:   [ 1  2  -1 |  4 ]
                     [ 0  1   3 | -2 ]
                     [ 3  7   0 | 10 ]
    R3 → R3 - 3R1:   [ 1  2  -1 |  4 ]
                     [ 0  1   3 | -2 ]
                     [ 0  1   3 | -2 ]
    R3 → R3 - R2:    [ 1  2  -1 |  4 ]
                     [ 0  1   3 | -2 ]
                     [ 0  0   0 |  0 ]
    R1 → R1 - 2R2:   [ 1  0  -7 |  8 ]
                     [ 0  1   3 | -2 ]
                     [ 0  0   0 |  0 ]
    There is no pivot in column 3, so z is free.
    Final answer: z is free, so there are infinitely many solutions
    ---------------------------------------------------------------

    [PROF: -1 E4 Free variable named but no parametric form; write [x, y, z]^T = [8, -2, 0]^T + t[7, -3, 1]^T, t ∈ R.]
    [PROF: Problem 3  5/6]

## Problem 4
(a) Let x1 = mass of Alloy 1 used, in kg; x2 = mass of Alloy 2, in kg; x3 = mass of
    Alloy 3, in kg. The 100 kg of product holds 36 kg copper, 44 kg zinc, 20 kg nickel,
    and none of the metal is lost, so in = out for each metal:
    copper:  0.5 x1 + 0.2 x2 + 0.4 x3 = 36
    zinc:    0.3 x1 + 0.7 x2 + 0.2 x3 = 44
    nickel:  0.2 x1 + 0.1 x2 + 0.4 x3 = 20
    -----------------------------------------

    [PROF: ✓]
(b) Times 10 on every row to kill the decimals:
    [ 5  2  4 | 360 ]
    [ 3  7  2 | 440 ]
    [ 2  1  4 | 200 ]
    ------------------

    [PROF: ✓]
(c) R1 → R1 - 2R3:   [ 1  0  -4 | -40 ]
                     [ 3  7   2 | 440 ]
                     [ 2  1   4 | 200 ]
    R2 → R2 - 3R1:   [ 1  0  -4 | -40 ]
                     [ 0  7  14 | 560 ]
                     [ 2  1   4 | 200 ]
    R3 → R3 - 2R1:   [ 1  0  -4 | -40 ]
                     [ 0  7  14 | 560 ]
                     [ 0  1  12 | 280 ]
    R2 → (1/7)R2:    [ 1  0  -4 | -40 ]
                     [ 0  1   2 |  80 ]
                     [ 0  1  12 | 280 ]
    R3 → R3 - R2:    [ 1  0  -4 | -40 ]
                     [ 0  1   2 |  80 ]
                     [ 0  0  10 | 200 ]
    R3 → (1/10)R3:   [ 1  0  -4 | -40 ]
                     [ 0  1   2 |  80 ]
                     [ 0  0   1 |  20 ]
    x3 = 20, x2 = 80 - 2(20) = 40, x1 = -40 + 4(20) = 40
    Final answer: x1 = 40, x2 = 40, x3 = 20
    ---------------------------------------

    [PROF: -1 E6 Final answer carries no units; state 40 kg, 40 kg, 20 kg.]
    [PROF: Problem 4  7/8]

## Problem 5
(a) R2 → R2 - 2R1:   [ 1  2  1 ]
                     [ 0  0  1 ]
                     [ 3  6  4 ]
    R3 → R3 - 3R1:   [ 1  2  1 ]
                     [ 0  0  1 ]
                     [ 0  0  1 ]
    R3 → R3 - R2:    [ 1  2  1 ]
                     [ 0  0  1 ]
                     [ 0  0  0 ]
    R1 → R1 - R2:    [ 1  2  0 ]
                     [ 0  0  1 ]
                     [ 0  0  0 ]
    Final answer: RREF(A) = [ 1 2 0 ; 0 0 1 ; 0 0 0 ]
    -------------------------------------------------

    [PROF: ✓]
(b) There are pivots in column 1 and column 3 and nothing in row 3, so two pivots.
    Final answer: rank(A) = 2
    -------------------------

    [PROF: ✓]
(c) Running the same row operations on [A | b] turns the last row into
    [ 0 0 0 | b3 - b1 - b2 ].
    0 solutions is possible: pick b = [0, 0, 1]^T, then that last row says 0 = 1, which is
    impossible, so the system is inconsistent.
    Exactly 1 solution is impossible: column 2 has no pivot, so x2 is always free. Any time
    the system is consistent that free variable gives a whole family of answers. Put another
    way rank(A) = 2 but there are 3 unknowns, and 2 < 3, so a unique solution can't happen.
    Infinitely many is possible: take b = [1, 3, 4]^T (or b = 0). Then b3 = b1 + b2, the last
    row is 0 = 0, the system is consistent, and free x2 gives infinitely many solutions.

    [PROF: ✓]
    [PROF: Problem 5  7/7]

## Problem 6
(a) These are dependent because there are three vectors and v3 has a zero entry, so they
    can't fill R^3. The span is a plane.
    ------------------------------------

    [PROF: -2 E7 A zero entry in v3 is not a dependence argument; row reduce to two pivots or give v3 = v2 - 2v1.]
(b) None of these is a multiple of another so they are independent; span is R^3.
    -----------------------------------------------------------------------------
    [PROF: -2 E7 Pairwise non-parallel does not prove independence; show three pivots or det = 2 ≠ 0.]
    [PROF: Problem 6  4/8]

## Grader summary
    Problem 1: 3.5/5
    Problem 2: 5/6
    Problem 3: 5/6
    Problem 4: 7/8
    Problem 5: 7/7
    Problem 6: 4/8
    Total: 31.5/40
    Problems 3, 4, and 5 are computed correctly and every row operation is labeled. Problem 6 costs you four points: a zero entry in v3 and none is a multiple of another are not justifications, and row reduction or an explicit dependence relation is required every time. Show the work in 1(a), round the angle to two decimals, write the general solution parametrically, and give 4(c) in kg.
