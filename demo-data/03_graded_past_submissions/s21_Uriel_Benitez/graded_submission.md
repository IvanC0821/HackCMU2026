# Homework 1
Uriel Benitez    Linear Algebra    Sep 17, 2026    GRADE: 21.5/40  (Prof. R. Castellano)

## Problem 1
(a)
Final answer: 24

    [PROF: -0.5 E1 No work shown; 2u - v and the dot product are never computed.]
(b)
(1/2) w = [-2, 1, 3]^T
v + (1/2) w = [1, 4, -2]^T + [-2, 1, 3]^T = [-1, 5, 1]^T
|| v + (1/2) w || = (-1)^2 + (5)^2 + (1)^2 = 1 + 25 + 1 = 27
[ANSWER: 27 ]

    [PROF: -0.5 E8 The square root is dropped; the norm is sqrt(27) = 3 sqrt(3), not 27.]
(c)
Use cos θ = (u · w) / (||u|| ||w||).
u · w = (2)(-4) + (-1)(2) + (3)(6) = -8 - 2 + 18 = 8
||u|| = sqrt(2^2 + (-1)^2 + 3^2) = sqrt(4 + 1 + 9) = sqrt(14)
||w|| = sqrt((-4)^2 + 2^2 + 6^2) = sqrt(16 + 4 + 36) = sqrt(56) = 2 sqrt(14)
cos θ = 8 / (sqrt(14))(2 sqrt(14)) = 8 / 28 = 2/7
θ = arccos(2/7) = 73.3985...°
[ANSWER: θ ≈ 73.40° ]

    [PROF: ✓]
    [PROF: Problem 1  4/5]

## Problem 2
(didn't get to this)

    (a) [PROF: 0/1 S6 Not attempted.]
    (b) [PROF: 0/1 S6 Not attempted.]
    (c) [PROF: 0/1 S6 Not attempted.]
    (d) [PROF: 0/1 S6 Not attempted.]
    (e) [PROF: 0/1 S6 Not attempted.]
    (f) [PROF: 0/1 S6 Not attempted.]
    [PROF: Problem 2  0/6]

## Problem 3
(a)
Augmented matrix:
   [  1  2  -1 | -1 ]
   [  2  3   1 |  2 ]
   [ -1  1   2 | -1 ]
R2 → R2 - 2R1:     [  1  2  -1 | -1 ]
                   [  0 -1   3 |  4 ]
                   [ -1  1   2 | -1 ]
R3 → R3 + R1:      [  1  2  -1 | -1 ]
                   [  0 -1   3 |  4 ]
                   [  0  3   1 | -2 ]
R2 → -R2:          [  1  2  -1 | -1 ]
                   [  0  1  -3 | -4 ]
                   [  0  3   1 | -2 ]
R3 → R3 - 3R2:     [  1  2  -1 | -1 ]
                   [  0  1  -3 | -4 ]
                   [  0  0  10 | 10 ]
R3 → (1/10)R3:     [  1  2  -1 | -1 ]
                   [  0  1  -3 | -4 ]
                   [  0  0   1 |  1 ]
Back substitute: x3 = 1, then x2 = -4 + 3(1) = -1, then x1 = -1 - 2(-1) + 1 = 2.
One solution only.
[ANSWER: x = [2, -1, 1]^T ]

    [PROF: ✓]
(b)
   [ 1  2  -1 |  4 ]
   [ 2  5   1 |  6 ]
   [ 3  7   0 | 10 ]
R2 → R2 - 2R1:     [ 1  2  -1 |  4 ]
                   [ 0  1   3 | -2 ]
                   [ 3  7   0 | 10 ]
R3 → R3 - 3R1:     [ 1  2  -1 |  4 ]
                   [ 0  1   3 | -2 ]
                   [ 0  1   3 | -2 ]
R3 → R3 - R2:      [ 1  2  -1 |  4 ]
                   [ 0  1   3 | -2 ]
                   [ 0  0   0 |  0 ]
R1 → R1 - 2R2:     [ 1  0  -7 |  8 ]
                   [ 0  1   3 | -2 ]
                   [ 0  0   0 |  0 ]
Column 3 has no pivot, so z is free and there are infinitely many solutions.
[ANSWER: infinitely many solutions, z is free ]

    [PROF: -1 E4 The free variable is named but no parametric general solution is given.]
    [PROF: Problem 3  5/6]

## Problem 4
(a)
Let x1 = mass of Alloy 1 used, in kg.
Let x2 = mass of Alloy 2 used, in kg.
Let x3 = mass of Alloy 3 used, in kg.
The 100 kg of target alloy holds 36 kg copper, 44 kg zinc, and 20 kg nickel, and
metal in = metal out, so:
   copper:  0.5 x1 + 0.2 x2 + 0.4 x3 = 36
   zinc:    0.3 x1 + 0.7 x2 + 0.2 x3 = 44
   nickel:  0.2 x1 + 0.1 x2 + 0.4 x3 = 20

    [PROF: ✓]
(c)
Times 10 to kill the decimals:
   5x1 + 2x2 + 4x3 = 360
   3x1 + 7x2 + 2x3 = 440
   2x1 +  x2 + 4x3 = 200
R1 → R1 - 2R3:     [ 1  0  -4 |  -40 ]
                   [ 3  7   2 |  440 ]
                   [ 2  1   4 |  200 ]
R2 → R2 - 3R1:     [ 1  0  -4 |  -40 ]
                   [ 0  7  14 |  520 ]
                   [ 2  1   4 |  200 ]
R3 → R3 - 2R1:     [ 1  0  -4 |  -40 ]
                   [ 0  7  14 |  520 ]
                   [ 0  1  12 |  280 ]
R2 → (1/7)R2:      [ 1  0  -4 |   -40 ]
                   [ 0  1   2 | 520/7 ]
                   [ 0  1  12 |   280 ]
R3 → R3 - R2:      [ 1  0  -4 |    -40 ]
                   [ 0  1   2 |  520/7 ]
                   [ 0  0  10 | 1440/7 ]
R3 → (1/10)R3:     [ 1  0  -4 |   -40 ]
                   [ 0  1   2 | 520/7 ]
                   [ 0  0   1 | 144/7 ]
x3 = 144/7 ≈ 20.57
x2 = 520/7 - 2(144/7) = 232/7 ≈ 33.14
x1 = -40 + 4(144/7) = -40 + 576/7 = 296/7 ≈ 42.29
[ANSWER: 42.29 kg of Alloy 1, 33.14 kg of Alloy 2, 20.57 kg of Alloy 3 ]

    [PROF: -1 E8 In R2 → R2 - 3R1 the constant is 440 - 3(-40) = 560, not 520; the slip is carried consistently.]
    (b) [PROF: 0/1 S6 Not attempted.]
    [PROF: Problem 4  6/8]

## Problem 5
(a)
R2 → R2 - 2R1:     [ 1  2  1 ]
                   [ 0  0  1 ]
                   [ 3  6  4 ]
R3 → R3 - 3R1:     [ 1  2  1 ]
                   [ 0  0  1 ]
                   [ 0  0  2 ]
R3 → R3 - 2R2:     [ 1  2  1 ]
                   [ 0  0  1 ]
                   [ 0  0  0 ]
R1 → R1 - R2:      [ 1  2  0 ]
                   [ 0  0  1 ]
                   [ 0  0  0 ]
[ANSWER: RREF(A) = [ 1 2 0 ; 0 0 1 ; 0 0 0 ] ]

    [PROF: -1 E8 In R3 → R3 - 3R1 the third entry is 4 - 3(1) = 1, not 2; the slip is carried consistently.]
(b)
rank(A) = 2

    [PROF: -0.5 E7 The rank is stated with no pivot-count justification.]
(c)
0 solutions: possible.
1 solution: impossible.
Infinitely many: possible.

    [PROF: -4 E7 Three bare verdicts with no reasons; an unjustified claim about the number of solutions earns no credit.]
    [PROF: Problem 5  1.5/7]

## Problem 6
(a)
Put v1, v2, v3 in as columns and row reduce:
   [ 1  2   0 ]
   [ 0  1   1 ]
   [ 2  3  -1 ]
R3 → R3 - 2R1:     [ 1  2   0 ]
                   [ 0  1   1 ]
                   [ 0 -1  -1 ]
R3 → R3 + R2:      [ 1  2  0 ]
                   [ 0  1  1 ]
                   [ 0  0  0 ]
Two pivots but three vectors, so the set is linearly dependent.
The relation is v3 = v2 - 2v1, since [2, 1, 3]^T - [2, 0, 4]^T = [0, 1, -1]^T.
v1 and v2 are not multiples of each other, so they span a plane through the origin.
[ANSWER: dependent; span is a plane in R^3 ]

    [PROF: ✓]
(b)
I'll use the determinant this time. Columns v1, v2, v3:
   | 1  0  1 |
   | 1  1  0 |
   | 0  1  1 |
Expand across the top row:
det = 1(1·1 - 0·1) - 0(1·1 - 0·0) + 1(0·1 - 1·1)
    = 1(1) - 0 + 1(-1)
    = 1 - 1 = 0
The determinant is 0, so the columns are linearly dependent.
Since they are dependent but not all multiples of one vector, the span is a plane.
[ANSWER: dependent; span is a plane in R^3 ]
    [PROF: -1 E8 The third minor is det[[1,1],[0,1]] = 1, so det = 2, not 0.; -2 S3 The slip reverses the conclusion, so the independence verdict and the geometric description are both lost.]
    [PROF: Problem 6  5/8]

## Grader summary
    Problem 1: 4/5
    Problem 2: 0/6
    Problem 3: 5/6
    Problem 4: 6/8
    Problem 5: 1.5/7
    Problem 6: 5/8
    Total: 21.5/40
    Problem 2 is blank and Problem 4(b) was never written; that is 7 points you did not attempt. Where you do show the elimination the work is clean and labeled, but you state verdicts without reasons in 5(b) and 5(c), and E7 gives no credit for an unjustified claim about rank or the number of solutions. Check each row operation as you write it: the slips in 4(c), 5(a), and 6(b) cost 3 points directly, and the one in 6(b) flipped your conclusion for 2 more.
