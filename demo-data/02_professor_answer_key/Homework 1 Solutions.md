# Homework 1 Solutions
# Vectors, Matrices, and Linear Systems
Instructor worked solution. Every step below is the level of work expected from students.

## Problem 1 (5 pts)
u = [2, -1, 3]^T,  v = [1, 4, -2]^T,  w = [-4, 2, 6]^T

(a) (2u - v) · w
    2u - v = [4, -2, 6]^T - [1, 4, -2]^T = [3, -6, 8]^T
    (2u - v) · w = (3)(-4) + (-6)(2) + (8)(6) = -12 - 12 + 48 = 24
    Final answer: 24

(b) || v + (1/2) w ||
    (1/2) w = [-2, 1, 3]^T
    v + (1/2) w = [1, 4, -2]^T + [-2, 1, 3]^T = [-1, 5, 1]^T
    || v + (1/2) w || = sqrt((-1)^2 + 5^2 + 1^2) = sqrt(1 + 25 + 1) = sqrt(27) = 3 sqrt(3) ≈ 5.20
    Final answer: 3 sqrt(3) (≈ 5.20)

(c) Angle between u and w
    The angle θ satisfies cos θ = (u · w) / (||u|| ||w||).
    u · w = (2)(-4) + (-1)(2) + (3)(6) = -8 - 2 + 18 = 8
    ||u|| = sqrt(4 + 1 + 9) = sqrt(14)
    ||w|| = sqrt(16 + 4 + 36) = sqrt(56) = 2 sqrt(14)
    cos θ = 8 / (sqrt(14) · 2 sqrt(14)) = 8 / 28 = 2/7
    θ = arccos(2/7) ≈ 73.40°
    Final answer: θ ≈ 73.40°

## Problem 2 (6 pts)
A = [2 -1 0; 1 3 -2; 0 4 1] (3x3),  B = [1 0 -2; 3 1 1] (2x3),  v = [1, -2, 3]^T (3x1),  w = [2 0 -1] (1x3)

(a) AB is undefined: A has 3 columns but B has 2 rows.
    BA is 2x3:
      row 1: [1(2)+0(1)+(-2)(0),  1(-1)+0(3)+(-2)(4),  1(0)+0(-2)+(-2)(1)] = [2, -9, -2]
      row 2: [3(2)+1(1)+1(0),     3(-1)+1(3)+1(4),     3(0)+1(-2)+1(1)]    = [7,  4, -1]
      BA = [ 2  -9  -2 ]
           [ 7   4  -1 ]

(b) Av = [2(1)+(-1)(-2)+0(3),  1(1)+3(-2)+(-2)(3),  0(1)+4(-2)+1(3)]^T = [4, -11, -5]^T
    vA is undefined: v has 1 column but A has 3 rows.

(c) Aw is undefined: A has 3 columns but w has 1 row.
    wA = [2(2)+0(1)+(-1)(0),  2(-1)+0(3)+(-1)(4),  2(0)+0(-2)+(-1)(1)] = [4  -6  -1]

(d) vw is the 3x3 outer product:
      vw = [  1(2)   1(0)   1(-1) ]   [  2   0  -1 ]
           [ -2(2)  -2(0)  -2(-1) ] = [ -4   0   2 ]
           [  3(2)   3(0)   3(-1) ]   [  6   0  -3 ]
    wv = 2(1) + 0(-2) + (-1)(3) = -1   (a 1x1 matrix; this is the dot product of w and v)

(e) A^2 = AA
      row 1: [2(2)+(-1)(1)+0(0),  2(-1)+(-1)(3)+0(4),  2(0)+(-1)(-2)+0(1)]   = [3, -5,  2]
      row 2: [1(2)+3(1)+(-2)(0),  1(-1)+3(3)+(-2)(4),  1(0)+3(-2)+(-2)(1)]   = [5,  0, -8]
      row 3: [0(2)+4(1)+1(0),     0(-1)+4(3)+1(4),     0(0)+4(-2)+1(1)]      = [4, 16, -7]
      A^2 = [ 3  -5   2 ]
            [ 5   0  -8 ]
            [ 4  16  -7 ]

(f) B^2 is undefined: B is 2x3, not square, so BB requires 3 = 2, which fails.

## Problem 3 (6 pts)

(a) Augmented matrix:
      [  1  2  -1 | -1 ]
      [  2  3   1 |  2 ]
      [ -1  1   2 | -1 ]
    R2 → R2 - 2R1:        [ 1  2  -1 | -1 ]
                          [ 0 -1   3 |  4 ]
                          [-1  1   2 | -1 ]
    R3 → R3 + R1:         [ 1  2  -1 | -1 ]
                          [ 0 -1   3 |  4 ]
                          [ 0  3   1 | -2 ]
    R2 → -R2:             [ 1  2  -1 | -1 ]
                          [ 0  1  -3 | -4 ]
                          [ 0  3   1 | -2 ]
    R3 → R3 - 3R2:        [ 1  2  -1 | -1 ]
                          [ 0  1  -3 | -4 ]
                          [ 0  0  10 | 10 ]
    R3 → (1/10)R3:        [ 1  2  -1 | -1 ]
                          [ 0  1  -3 | -4 ]
                          [ 0  0   1 |  1 ]
    Back substitution: x3 = 1;  x2 = -4 + 3(1) = -1;  x1 = -1 - 2(-1) + 1 = 2.
    The system has exactly one solution.
    Final answer: x = [x1, x2, x3]^T = [2, -1, 1]^T

(b) Augmented matrix:
      [ 1  2  -1 |  4 ]
      [ 2  5   1 |  6 ]
      [ 3  7   0 | 10 ]
    R2 → R2 - 2R1:        [ 1  2  -1 |  4 ]
                          [ 0  1   3 | -2 ]
                          [ 3  7   0 | 10 ]
    R3 → R3 - 3R1:        [ 1  2  -1 |  4 ]
                          [ 0  1   3 | -2 ]
                          [ 0  1   3 | -2 ]
    R3 → R3 - R2:         [ 1  2  -1 |  4 ]
                          [ 0  1   3 | -2 ]
                          [ 0  0   0 |  0 ]
    R1 → R1 - 2R2:        [ 1  0  -7 |  8 ]
                          [ 0  1   3 | -2 ]
                          [ 0  0   0 |  0 ]
    The third column has no pivot, so z is a free variable. Let z = t.
    x = 8 + 7t,   y = -2 - 3t,   z = t.
    There are infinitely many solutions.
    Final answer: [x, y, z]^T = [8, -2, 0]^T + t [7, -3, 1]^T,  t ∈ R

## Problem 4 (8 pts)

(a) Let x1, x2, x3 be the masses (in kg) of Alloy 1, Alloy 2, and Alloy 3 used.
    The product is 100 kg, so it contains 36 kg copper, 44 kg zinc, and 20 kg nickel.
    Copper:  0.5 x1 + 0.2 x2 + 0.4 x3 = 36
    Zinc:    0.3 x1 + 0.7 x2 + 0.2 x3 = 44
    Nickel:  0.2 x1 + 0.1 x2 + 0.4 x3 = 20
    (Adding the three equations gives x1 + x2 + x3 = 100, as expected.)

(b) Multiplying each equation by 10 to clear decimals, the augmented matrix is
      [ 5  2  4 | 360 ]
      [ 3  7  2 | 440 ]
      [ 2  1  4 | 200 ]

(c) R1 → R1 - 2R3:        [ 1  0  -4 | -40 ]
                          [ 3  7   2 | 440 ]
                          [ 2  1   4 | 200 ]
    R2 → R2 - 3R1:        [ 1  0  -4 | -40 ]
                          [ 0  7  14 | 560 ]
                          [ 2  1   4 | 200 ]
    R3 → R3 - 2R1:        [ 1  0  -4 | -40 ]
                          [ 0  7  14 | 560 ]
                          [ 0  1  12 | 280 ]
    R2 → (1/7)R2:         [ 1  0  -4 | -40 ]
                          [ 0  1   2 |  80 ]
                          [ 0  1  12 | 280 ]
    R3 → R3 - R2:         [ 1  0  -4 | -40 ]
                          [ 0  1   2 |  80 ]
                          [ 0  0  10 | 200 ]
    R3 → (1/10)R3:        [ 1  0  -4 | -40 ]
                          [ 0  1   2 |  80 ]
                          [ 0  0   1 |  20 ]
    Back substitution: x3 = 20;  x2 = 80 - 2(20) = 40;  x1 = -40 + 4(20) = 40.
    Check: 40 + 40 + 20 = 100 kg. Copper: 20 + 8 + 8 = 36 kg. ✓
    Final answer: 40 kg of Alloy 1, 40 kg of Alloy 2, 20 kg of Alloy 3.

## Problem 5 (7 pts)
A = [1 2 1; 2 4 3; 3 6 4]

(a) R2 → R2 - 2R1:        [ 1  2  1 ]
                          [ 0  0  1 ]
                          [ 3  6  4 ]
    R3 → R3 - 3R1:        [ 1  2  1 ]
                          [ 0  0  1 ]
                          [ 0  0  1 ]
    R3 → R3 - R2:         [ 1  2  1 ]
                          [ 0  0  1 ]
                          [ 0  0  0 ]
    R1 → R1 - R2:         [ 1  2  0 ]
                          [ 0  0  1 ]
                          [ 0  0  0 ]
    Final answer: RREF(A) = [1 2 0; 0 0 1; 0 0 0]

(b) rank(A) = 2, because the RREF has two pivot positions (columns 1 and 3).

(c) Zero solutions: possible. Row-reducing [A | b] with the same operations gives a third row
    of [0 0 0 | b3 - b1 - b2]. If b3 ≠ b1 + b2 (for example b = [0, 0, 1]^T), the last row reads
    0 = nonzero, so the system is inconsistent.
    Exactly one solution: impossible. Column 2 is never a pivot column, so whenever the system is
    consistent, x2 is a free variable and there are infinitely many solutions. Equivalently,
    rank(A) = 2 < 3 = number of unknowns.
    Infinitely many solutions: possible. If b3 = b1 + b2 (for example b = 0, or b = [1, 3, 4]^T),
    the system is consistent and has a free variable, so there are infinitely many solutions.

## Problem 6 (8 pts)

(a) v1 = [1, 0, 2]^T, v2 = [2, 1, 3]^T, v3 = [0, 1, -1]^T
    Row reduce [v1 v2 v3]:
      [ 1  2   0 ]   R3 → R3 - 2R1   [ 1  2   0 ]   R3 → R3 + R2   [ 1  2  0 ]   R1 → R1 - 2R2   [ 1  0  -2 ]
      [ 0  1   1 ]   ------------>   [ 0  1   1 ]   ----------->   [ 0  1  1 ]   ------------>   [ 0  1   1 ]
      [ 2  3  -1 ]                   [ 0 -1  -1 ]                  [ 0  0  0 ]                   [ 0  0   0 ]
    Only two pivots for three vectors, so the set is linearly dependent.
    In fact v3 = v2 - 2 v1: [2, 1, 3]^T - [2, 0, 4]^T = [0, 1, -1]^T. ✓
    v1 and v2 are not parallel, so the span is a plane through the origin in R^3.
    Final answer: linearly dependent; span is a plane.

(b) v1 = [1, 1, 0]^T, v2 = [0, 1, 1]^T, v3 = [1, 0, 1]^T
    Row reduce [v1 v2 v3]:
      [ 1  0  1 ]   R2 → R2 - R1   [ 1  0   1 ]   R3 → R3 - R2   [ 1  0   1 ]
      [ 1  1  0 ]   ----------->   [ 0  1  -1 ]   ----------->   [ 0  1  -1 ]
      [ 0  1  1 ]                  [ 0  1   1 ]                  [ 0  0   2 ]
    Three pivots for three vectors, so the only solution to c1 v1 + c2 v2 + c3 v3 = 0 is
    c1 = c2 = c3 = 0. The set is linearly independent.
    Three independent vectors in R^3 span all of R^3.
    Final answer: linearly independent; span is all of R^3.
