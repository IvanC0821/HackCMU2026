# Homework 1
Caleb Thornton    Linear Algebra    Sep 18, 2026    GRADE: 31/40  (Prof. R. Castellano)

## Problem 1
(a) 2u - v = [4, -2, 6]^T - [1, 4, -2]^T = [3, -6, 8]^T
    (2u - v) · w = (3)(-4) + (-6)(2) + (8)(6) = -12 - 12 + 48 = 24
    [ANSWER: 24 ]

    [PROF: ✓]
(b) (1/2)w = [-2, 1, 3]^T
    v + (1/2)w = [1, 4, -2]^T + [-2, 1, 3]^T = [-1, 5, 1]^T
    || v + (1/2)w || = sqrt(1 + 25 + 1) = sqrt(27) = 3 sqrt(3) ≈ 5.20
    [ANSWER: 3 sqrt(3) ≈ 5.20 ]

    [PROF: ✓]
(c) cos θ = (u · w) / (||u|| ||w||)
    u · w = (2)(-4) + (-1)(2) + (3)(6) = -8 - 2 + 18 = 8
    ||u|| = sqrt(4 + 1 + 9) = sqrt(14),  ||w|| = sqrt(16 + 4 + 36) = sqrt(56) = 2 sqrt(14)
    ~~cos θ = 8/sqrt(56)~~ no, the denominator is both norms multiplied:
    cos θ = 8 / (sqrt(14) · 2 sqrt(14)) = 8/28 = 2/7
    θ = arccos(2/7) ≈ 73.40°
    [ANSWER: θ ≈ 73.40° ]

    [PROF: ✓]
    [PROF: Problem 1  5/5]

## Problem 2
(a) AB is not defined. A is 3x3 and B is 2x3, and A's 3 columns do not match B's 2 rows.
    BA is (2x3)(3x3) = 2x3:
    row 1: [ 1(2)+0(1)+(-2)(0), 1(-1)+0(3)+(-2)(4), 1(0)+0(-2)+(-2)(1) ] = [2, -9, -2]
    row 2: [ 3(2)+1(1)+1(0), 3(-1)+1(3)+1(4), 3(0)+1(-2)+1(1) ] = [7, 4, -1]
    BA = [ 2  -9  -2 ]
         [ 7   4  -1 ]

    [PROF: ✓]
(b) Av = [ 2(1)+(-1)(-2)+0(3),  1(1)+3(-2)+(-2)(3),  0(1)+4(-2)+1(3) ]^T = [4, -11, -5]^T
    vA is defined too. Multiplication is commutative for this, you are hitting the same
    matrix with the same vector, so vA is just Av laid on its side:
    vA = Av^T = [ 4  -11  -5 ]

    [PROF: -0.5 S7 vA is undefined because v has 1 column and A has 3 rows, and matrix multiplication is not commutative, so Av written sideways is not vA.]
(c) Aw: not defined.
    wA is (1x3)(3x3) = 1x3:
    wA = [ 2(2)+0(1)+(-1)(0),  2(-1)+0(3)+(-1)(4),  2(0)+0(-2)+(-1)(1) ] = [ 4  -6  -1 ]

    [PROF: -0.5 E5 Aw is called undefined with no dimension reason, which must state that A has 3 columns and w has 1 row.]
(d) vw is (3x1)(1x3) = 3x3:
    vw = [  2   0  -1 ]
         [ -4   0   2 ]
         [  6   0  -3 ]
    wv is (1x3)(3x1) = 1x1: 2(1) + 0(-2) + (-1)(3) = -1, so wv = [ -1 ].

    [PROF: ✓]
(e) A^2 = AA:
    row 1: [ 2(2)+(-1)(1)+0(0), 2(-1)+(-1)(3)+0(4), 2(0)+(-1)(-2)+0(1) ] = [3, -5, 2]
    row 2: [ 1(2)+3(1)+(-2)(0), 1(-1)+3(3)+(-2)(4), 1(0)+3(-2)+(-2)(1) ] = [5, 0, -8]
    row 3: [ 0(2)+4(1)+1(0), 0(-1)+4(3)+1(4), 0(0)+4(-2)+1(1) ] = [4, 16, -7]
    A^2 = [ 3  -5   2 ]
          [ 5   0  -8 ]
          [ 4  16  -7 ]

    [PROF: ✓]
(f) B^2 is not defined: B is 2x3, and squaring needs a square matrix (3 columns would have
    to meet 2 rows).

    [PROF: ✓]
    [PROF: Problem 2  5/6]

## Problem 3
(a) [  1  2  -1 | -1 ]       [ 1   2  -1 | -1 ]       [ 1   2  -1 | -1 ]
    [  2  3   1 |  2 ]  →    [ 0  -1   3 |  4 ]  →    [ 0  -1   3 |  4 ]
    [ -1  1   2 | -1 ]       [-1   1   2 | -1 ]       [ 0   3   1 | -2 ]

        [ 1  2  -1 | -1 ]       [ 1  2  -1 | -1 ]       [ 1  2  -1 | -1 ]
    →   [ 0  1  -3 | -4 ]  →    [ 0  1  -3 | -4 ]  →    [ 0  1  -3 | -4 ]
        [ 0  3   1 | -2 ]       [ 0  0  10 | 10 ]       [ 0  0   1 |  1 ]
    x3 = 1, x2 = -4 + 3(1) = -1, x1 = -1 - 2(-1) + 1 = 2, and there are no free columns
    so the solution is unique.
    [ANSWER: x = [2, -1, 1]^T ]

    [PROF: -1 E2 Row operations are not labeled, so write R2 → R2 - 2R1 beside each step the way you did in (b).]
(b) [ 1  2  -1 |  4 ]
    [ 2  5   1 |  6 ]
    [ 3  7   0 | 10 ]
    R2 → R2 - 2R1, R3 → R3 - 3R1:  [ 1  2  -1 |  4 ]
                                   [ 0  1   3 | -2 ]
                                   [ 0  1   3 | -2 ]
    R3 → R3 - R2:                  [ 1  2  -1 |  4 ]
                                   [ 0  1   3 | -2 ]
                                   [ 0  0   0 |  0 ]
    R1 → R1 - 2R2:                 [ 1  0  -7 |  8 ]
                                   [ 0  1   3 | -2 ]
                                   [ 0  0   0 |  0 ]
    Column 3 has no pivot, so z is the free variable. Let z = t, then x = 8 + 7t and
    y = -2 - 3t. The solution set is a line, so there are infinitely many solutions.
    [ANSWER: [x, y, z]^T = [8, -2, 0]^T + t[7, -3, 1]^T,  t ∈ R ]

    [PROF: ✓]
    [PROF: Problem 3  5/6]

## Problem 4
(a) Let x1 = kg of Alloy 1 used, x2 = kg of Alloy 2 used, x3 = kg of Alloy 3 used (masses
    in kilograms). The 100 kg of product is 36 kg copper, 44 kg zinc, 20 kg nickel, and no
    metal is lost, so each metal balances:
    copper: 0.5 x1 + 0.2 x2 + 0.4 x3 = 36
    zinc:   0.3 x1 + 0.7 x2 + 0.2 x3 = 44
    nickel: 0.2 x1 + 0.1 x2 + 0.4 x3 = 20

    [PROF: ✓]
(b) Multiply through by 10 so there are no decimals:
    [ 5  2  4 | 360 ]
    [ 3  7  2 | 440 ]
    [ 2  1  4 | 200 ]

    [PROF: ✓]
(c) [ 5  2  4 | 360 ]       [ 1  0  -4 | -40 ]       [ 1  0  -4 | -40 ]
    [ 3  7  2 | 440 ]  →    [ 3  7   2 | 440 ]  →    [ 0  7  14 | 560 ]
    [ 2  1  4 | 200 ]       [ 2  1   4 | 200 ]       [ 2  1   4 | 200 ]

        [ 1  0  -4 | -40 ]       [ 1  0  -4 | -40 ]       [ 1  0  -4 | -40 ]
    →   [ 0  7  14 | 560 ]  →    [ 0  1   2 |  80 ]  →    [ 0  1   2 |  80 ]
        [ 0  1  12 | 280 ]       [ 0  1  12 | 280 ]       [ 0  0  10 | 200 ]

        [ 1  0  -4 | -40 ]
    →   [ 0  1   2 |  80 ]
        [ 0  0   1 |  20 ]
    x3 = 20, x2 = 80 - 2(20) = 40, x1 = -40 + 4(20) = 40. Total is 100 kg, which checks.
    [ANSWER: 40 kg of Alloy 1, 40 kg of Alloy 2, 20 kg of Alloy 3 ]

    [PROF: -1 E2 Row operations are not labeled, so label every step, starting with R1 → R1 - 2R3.]
    [PROF: Problem 4  7/8]

## Problem 5
(a) A = [ 1  2  1 ]
        [ 2  4  3 ]
        [ 3  6  4 ]
    R2 → R2 - 2R1:  [ 1  2  1 ]      R3 → R3 - 3R1:  [ 1  2  1 ]
                    [ 0  1  1 ]                      [ 0  1  1 ]
                    [ 3  6  4 ]                      [ 0  0  1 ]
    R2 → R2 - R3:   [ 1  2  1 ]      R1 → R1 - R3:   [ 1  2  0 ]
                    [ 0  1  0 ]                      [ 0  1  0 ]
                    [ 0  0  1 ]                      [ 0  0  1 ]
    R1 → R1 - 2R2:  [ 1  0  0 ]
                    [ 0  1  0 ]
                    [ 0  0  1 ]
    [ANSWER: RREF(A) = I ]

    [PROF: -1 E8 Arithmetic slip in R2 → R2 - 2R1, whose second entry is 4 - 2(2) = 0, so that row is [0 0 1] and the RREF is [1 2 0; 0 0 1; 0 0 0], not I.]
(b) rank(A) = 3 because the RREF is the identity, so there is a pivot in all three columns.
    [ANSWER: rank(A) = 3 ]

    [PROF: -1 S3 The slip in (a) changed the conclusion, since the correct RREF has pivots only in columns 1 and 3, so rank(A) = 2, not 3.]
(c) ~~It depends on b, since~~ Actually it does not depend on b at all here.
    A row reduces all the way to I, so [A | b] row reduces to [ I | c ] for some column c,
    and reading that off gives x1, x2, x3 directly with nothing left over. So Ax = b has
    exactly one solution, no matter which b you pick.
    0 solutions: impossible. Every row of the RREF has a pivot in it, so you can never end
    up with a row that reads 0 = nonzero, which is the only way a system is inconsistent.
    Infinitely many: impossible. All three columns are pivot columns, so there is no free
    variable, and without a free variable you cannot build a second solution.
    [ANSWER: always exactly 1 solution; 0 and infinitely many are both impossible ]

    [PROF: -2 S7 Exactly one solution is impossible because column 2 is never a pivot column, so x2 is free whenever the system is consistent, and claiming uniqueness earns 0 for that piece; -2 S3 Zero solutions is possible when b3 ≠ b1 + b2 and infinitely many is possible when b3 = b1 + b2, so both cases you ruled out are lost.]
    [PROF: Problem 5  1/7]

## Problem 6
(a) Row reduce the matrix whose columns are v1, v2, v3:
    [ 1  2   0 ]
    [ 0  1   1 ]
    [ 2  3  -1 ]
    R3 → R3 - 2R1:  [ 1  2   0 ]     R3 → R3 + R2:  [ 1  2  0 ]
                    [ 0  1   1 ]                    [ 0  1  1 ]
                    [ 0 -1  -1 ]                    [ 0  0  0 ]
    R1 → R1 - 2R2:  [ 1  0  -2 ]
                    [ 0  1   1 ]
                    [ 0  0   0 ]
    Two pivots but three vectors, so they are dependent. The relation is v3 = v2 - 2v1,
    since [2, 1, 3]^T - [2, 0, 4]^T = [0, 1, -1]^T. Two of them are independent, so the span
    is 2-dimensional and passes through the origin.
    [ANSWER: dependent; span is a plane ]

    [PROF: ✓]
(b) [ 1  0  1 ]
    [ 1  1  0 ]
    [ 0  1  1 ]
    R2 → R2 - R1:   [ 1  0   1 ]     R3 → R3 - R2:  [ 1  0   1 ]
                    [ 0  1  -1 ]                    [ 0  1  -1 ]
                    [ 0  1   1 ]                    [ 0  0   2 ]
    Three pivots for three vectors, so c1 v1 + c2 v2 + c3 v3 = 0 only when all the c's are
    0. That is independence, and three independent vectors fill up R^3.
    [ANSWER: independent; span is all of R^3 ]
    [PROF: ✓]
    [PROF: Problem 6  8/8]

## Grader summary
    Problem 1: 5/5
    Problem 2: 5/6
    Problem 3: 5/6
    Problem 4: 7/8
    Problem 5: 1/7
    Problem 6: 8/8
    Total: 31/40
    Label every row operation: 3(a) and 4(c) carry none, and that costs a point each. Matrix multiplication is not commutative, so vA is undefined rather than Av on its side. Problem 5 turns on one entry: R2 → R2 - 2R1 gives [0 0 1], and carrying [0 1 1] forward produced rank 3 and a unique solution for every b, which reverses all three cases in (c).
