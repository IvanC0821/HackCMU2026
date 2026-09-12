# Homework 1
Bianca Russo    Linear Algebra    Sep 15, 2026    GRADE: 34/40  (Prof. R. Castellano)

## Problem 1
(a) I scale u first and then subtract v one component at a time.
    2u = [4, -2, 6]^T, so 2u - v = [4 - 1, -2 - 4, 6 - (-2)]^T = [3, -6, 8]^T.
    Now the dot product with w, multiplying matching entries and adding them up:
    (3)(-4) + (-6)(2) + (8)(6) = -12 - 12 + 48 = 24
    Final answer: (2u - v) · w = 24
    [PROF: ✓]
(b) Half of w is (1/2)w = [-2, 1, 3]^T, and adding it to v entry by entry gives
    v + (1/2)w = [1 + (-2), 4 + 1, -2 + 3]^T = [-1, 5, 1]^T.
    The norm is the square root of the sum of the squares of the entries, so
    || v + (1/2)w || = sqrt((-1)^2 + 5^2 + 1^2) = sqrt(1 + 25 + 1) = 27
    Final answer: || v + (1/2)w || = 27
    [PROF: -0.5 E8 sqrt(1 + 25 + 1) is evaluated as 27; the radical is dropped, and the norm is sqrt(27) = 3 sqrt(3) ≈ 5.20.]
(c) The angle comes from cos θ = (u · w) / (||u|| ||w||), so I need the dot product of the
    two vectors and both of their lengths.
    u · w = (2)(-4) + (-1)(2) + (3)(6) = -8 - 2 + 18 = 12
    ||u|| = sqrt(2^2 + (-1)^2 + 3^2) = sqrt(4 + 1 + 9) = sqrt(14)
    ||w|| = sqrt((-4)^2 + 2^2 + 6^2) = sqrt(16 + 4 + 36) = sqrt(56) = 2 sqrt(14)
    The lengths multiply to sqrt(14) · 2 sqrt(14) = 2 · 14 = 28, so cos θ = 12/28 = 3/7.
    Taking the inverse cosine, θ = arccos(3/7) = 64.6231...°, which rounds to 64.62°.
    Final answer: θ ≈ 64.62°

    [PROF: -1 E8 u · w is summed as 12, but -8 - 2 + 18 = 8, so cos θ = 2/7 and θ ≈ 73.40°.]
    [PROF: Problem 1  3.5/5]

## Problem 2
(a) A is 3x3 and B is 2x3. For AB we would need A's 3 columns to match B's 2 rows, and
    3 ≠ 2, so AB is undefined. BA is fine: (2x3)(3x3) comes out 2x3.
    row 1: 1(2)+0(1)+(-2)(0) = 2,  1(-1)+0(3)+(-2)(4) = -9,  1(0)+0(-2)+(-2)(1) = -2
    row 2: 3(2)+1(1)+1(0) = 7,  3(-1)+1(3)+1(4) = 2,  3(0)+1(-2)+1(1) = -1
    Final answer: BA = [ 2  -9  -2 ]
                       [ 7   2  -1 ]
    [PROF: -0.5 E8 BA entry (2,2) is 3(-1) + 1(3) + 1(4) = 4, not 2.]
(b) A is 3x3 and v is 3x1, so Av is defined and 3x1, each entry a row of A dotted with v.
    Av = [ 2(1)+(-1)(-2)+0(3),  1(1)+3(-2)+(-2)(3),  0(1)+4(-2)+1(3) ]^T = [4, -11, -5]^T
    vA is undefined, because v has only 1 column while A has 3 rows, and 1 ≠ 3.
    Final answer: Av = [4, -11, -5]^T,  vA undefined
    [PROF: ✓]
(c) Aw is undefined: A has 3 columns but the row vector w has only 1 row, so 3 ≠ 1.
    wA is (1x3)(3x3), so it is a 1x3 row vector:
    [ 2(2)+0(1)+(-1)(0),  2(-1)+0(3)+(-1)(4),  2(0)+0(-2)+(-1)(1) ] = [ 4  -6  -1 ]
    [PROF: -0.5 N6 wA is not boxed or labeled as the final answer.]
(d) vw is (3x1)(1x3), so it is 3x3 and each entry is an entry of v times an entry of w:
    vw = [  2   0  -1 ]
         [ -4   0   2 ]
         [  6   0  -3 ]
    wv is (1x3)(3x1) = 1x1, which is just the dot product of w and v:
    wv = 2(1) + 0(-2) + (-1)(3) = 2 - 3 = -1, so wv = [ -1 ].
    [PROF: -0.5 N6 vw and wv are not boxed or labeled as the final answer.]
(e) A is square, so A^2 = AA is defined and is 3x3. Going row by row:
    row 1: [ 2(2)+(-1)(1)+0(0),  2(-1)+(-1)(3)+0(4),  2(0)+(-1)(-2)+0(1) ] = [3, -5, 2]
    row 2: [ 1(2)+3(1)+(-2)(0),  1(-1)+3(3)+(-2)(4),  1(0)+3(-2)+(-2)(1) ] = [5, 0, -8]
    row 3: [ 0(2)+4(1)+1(0),     0(-1)+4(3)+1(4),     0(0)+4(-2)+1(1)    ] = [4, 16, -7]
    Final answer: A^2 = [ 3  -5   2 ]
                        [ 5   0  -8 ]
                        [ 4  16  -7 ]
    [PROF: ✓]
(f) B^2 = BB is undefined. B is 2x3, so squaring it would need its 3 columns to match its
    own 2 rows. Only a square matrix can be multiplied by itself.

    [PROF: ✓]
    [PROF: Problem 2  4.5/6]

## Problem 3
(a) I write the augmented matrix and clear the first column first.
    [  1  2  -1 | -1 ]
    [  2  3   1 |  2 ]
    [ -1  1   2 | -1 ]
    R2 → R2 - 2R1, R3 → R3 + R1:  [ 1   2  -1 | -1 ]
                                  [ 0  -1   3 |  4 ]
                                  [ 0   3   1 | -2 ]
    R2 → -R2:                     [ 1  2  -1 | -1 ]
                                  [ 0  1  -3 | -4 ]
                                  [ 0  3   1 | -2 ]
    R3 → R3 - 3R2:                [ 1  2  -1 | -1 ]
                                  [ 0  1  -3 | -4 ]
                                  [ 0  0  10 | 10 ]
    R3 → (1/10)R3:                [ 1  2  -1 | -1 ]
                                  [ 0  1  -3 | -4 ]
                                  [ 0  0   1 |  1 ]
    Back substituting from the bottom up: x3 = 1, then x2 - 3(1) = -4 gives x2 = -1, then
    x1 + 2(-1) - 1 = -1 gives x1 = 2. Every column has a pivot, so there are no free
    variables and this is the only solution.
    Final answer: x = [2, -1, 1]^T
    [PROF: ✓]
(b) [ 1  2  -1 |  4 ]
    [ 2  5   1 |  6 ]
    [ 3  7   0 | 10 ]
    R2 → R2 - 2R1:   [ 1  2  -1 |  4 ]
                     [ 0  1   3 | -2 ]
                     [ 3  7   0 | 10 ]
    R3 → R3 - 3R1:   [ 1  2  -1 |  4 ]
                     [ 0  1   3 | -2 ]
                     [ 0  1   3 |  0 ]
    R3 → R3 - R2:    [ 1  2  -1 |  4 ]
                     [ 0  1   3 | -2 ]
                     [ 0  0   0 |  2 ]
    That bottom row says 0x + 0y + 0z = 2, and no choice of x, y, z makes 0 equal 2, so the
    three planes never meet in a common point.
    Final answer: no solution, the system is inconsistent

    [PROF: -1 E8 R3 → R3 - 3R1 gives the constant 10 - 3(4) = -2, not 0; -2 S3 that slip flips the conclusion, since the system is consistent with z free, so the free variable, the infinitely many solutions, and the parametric form are all lost.]
    [PROF: Problem 3  3/6]

## Problem 4
(a) Let x1 be the mass of Alloy 1 used, in kg; x2 the mass of Alloy 2, in kg; and x3 the
    mass of Alloy 3, in kg. The product weighs 100 kg and is 36% copper, 44% zinc, and
    20% nickel, so it holds 36 kg copper, 44 kg zinc, and 20 kg nickel. Nothing is lost in
    blending, so for each metal the mass going in equals the mass coming out:
    copper: 0.5 x1 + 0.2 x2 + 0.4 x3 = 36
    zinc:   0.3 x1 + 0.7 x2 + 0.2 x3 = 44
    nickel: 0.2 x1 + 0.1 x2 + 0.4 x3 = 20
    [PROF: ✓]
(b) Multiplying every equation by 10 clears the decimals and keeps the elimination tidy:
    [ 5  2  4 | 360 ]
    [ 3  7  2 | 440 ]
    [ 2  1  4 | 200 ]
    [PROF: ✓]
(c) R1 → R1 - 2R3:                [ 1  0  -4 | -40 ]
                                  [ 3  7   2 | 440 ]
                                  [ 2  1   4 | 200 ]
    R2 → R2 - 3R1, R3 → R3 - 2R1: [ 1  0  -4 | -40 ]
                                  [ 0  7  14 | 560 ]
                                  [ 0  1  12 | 280 ]
    R2 → (1/7)R2:                 [ 1  0  -4 | -40 ]
                                  [ 0  1   2 |  80 ]
                                  [ 0  1  12 | 280 ]
    R3 → R3 - R2:                 [ 1  0  -4 | -40 ]
                                  [ 0  1   2 |  80 ]
                                  [ 0  0  10 | 200 ]
    R3 → (1/10)R3:                [ 1  0  -4 | -40 ]
                                  [ 0  1   2 |  80 ]
                                  [ 0  0   1 |  20 ]
    Back substituting: x3 = 20, then x2 = 80 - 2(20) = 40, then x1 = -40 + 4(20) = 40.
    As a check the masses add to 40 + 40 + 20 = 100 kg, and the copper works out to
    0.5(40) + 0.2(40) + 0.4(20) = 20 + 8 + 8 = 36 kg, exactly the target.
    Final answer: 40 kg of Alloy 1, 40 kg of Alloy 2, and 20 kg of Alloy 3

    [PROF: ✓]
    [PROF: Problem 4  8/8]

## Problem 5
(a) R2 → R2 - 2R1:  [ 1  2  1 ]     R3 → R3 - 3R1:  [ 1  2  1 ]
                    [ 0  0  1 ]                     [ 0  0  1 ]
                    [ 3  6  4 ]                     [ 0  0  1 ]
    R3 → R3 - R2:   [ 1  2  1 ]     R1 → R1 - R2:   [ 1  2  0 ]
                    [ 0  0  1 ]                     [ 0  0  1 ]
                    [ 0  0  0 ]                     [ 0  0  0 ]
    Final answer: RREF(A) = [ 1 2 0 ; 0 0 1 ; 0 0 0 ]
    [PROF: ✓]
(b) The reduced form has leading ones in column 1 and column 3 and a row of zeros at the
    bottom, so there are exactly two pivots. Final answer: rank(A) = 2
    [PROF: ✓]
(c) Running the same operations on [A | b] turns the bottom row into [ 0 0 0 | b3-b1-b2 ],
    and that one entry decides everything.
    Zero solutions is possible: choosing b = [0, 0, 1]^T makes the bottom row read 0 = 1,
    a contradiction, so the system is inconsistent.
    Exactly one solution is impossible: column 2 is not a pivot column, so x2 is a free
    variable in every consistent case, and a free variable gives a whole family of answers.
    Put differently, rank(A) = 2 is less than the 3 unknowns, so the solution set is never
    a single point.
    Infinitely many is possible: if b3 = b1 + b2, say b = [1, 3, 4]^T or b = 0, the bottom
    row reads 0 = 0, the system is consistent, and free x2 gives infinitely many solutions.

    [PROF: ✓]
    [PROF: Problem 5  7/7]

## Problem 6
(a) I put the vectors in the columns of a matrix and row reduce, since the pivot count
    tells me whether they are independent.
    [ 1  2   0 ]
    [ 0  1   1 ]
    [ 2  3  -1 ]
    R3 → R3 - 2R1:  [ 1  2   0 ]     R3 → R3 + R2:  [ 1  2  0 ]
                    [ 0  1   1 ]                    [ 0  1  1 ]
                    [ 0 -1  -1 ]                    [ 0  0  0 ]
    R1 → R1 - 2R2:  [ 1  0  -2 ]
                    [ 0  1   1 ]
                    [ 0  0   0 ]
    Two pivots for three vectors, so one of them is redundant and the set is dependent.
    In fact v3 = v2 - 2v1, since [2, 1, 3]^T - [2, 0, 4]^T = [0, 1, -1]^T. Because v1 and v2
    are independent of each other, the span they fill is two dimensional.
    Final answer: linearly dependent, and the span is a plane through the origin
    [PROF: ✓]
(b) [ 1  0  1 ]
    [ 1  1  0 ]
    [ 0  1  1 ]
    R2 → R2 - R1:   [ 1  0   1 ]     R3 → R3 - R2:  [ 1  0   1 ]
                    [ 0  1  -1 ]                    [ 0  1  -1 ]
                    [ 0  1   1 ]                    [ 0  0   2 ]
    All three columns hold a pivot, so the only way to get c1 v1 + c2 v2 + c3 v3 = 0 is
    c1 = c2 = c3 = 0, which is exactly what linear independence means. Three independent
    vectors in R^3 span the whole space.
    Final answer: linearly independent, and the span is all of R^3
    [PROF: ✓]
    [PROF: Problem 6  8/8]

## Grader summary
    Problem 1: 3.5/5
    Problem 2: 4.5/6
    Problem 3: 3/6
    Problem 4: 8/8
    Problem 5: 7/7
    Problem 6: 8/8
    Total: 34/40
    Your method is sound in every problem; every point lost came from a single bad sum. Recheck each subtraction before you carry it: 10 - 3(4) = -2 in 3(b), not 0, and that one entry turned a consistent system into an inconsistent one and cost the whole part. Label the final answer in Problem 2(c) and 2(d) the way you did everywhere else.
