# Homework 1
Farid Haddad    Linear Algebra    Sep 17, 2026    GRADE: 35/40  (Prof. R. Castellano)

## Problem 1
(a)  2u = [4, -2, 6]^T, so 2u - v = [4, -2, 6]^T - [1, 4, -2]^T = [3, -6, 8]^T
Dot that with w:  (3)(-4) + (-6)(2) + (8)(6) = -12 - 12 + 48 = 24
(2u - v) · w = 24
-----------------
    [PROF: ✓]
(b)  (1/2)w = [-2, 1, 3]^T, so v + (1/2)w = [1 - 2, 4 + 1, -2 + 3]^T = [-1, 5, 1]^T
||v + (1/2)w|| = sqrt((-1)^2 + 5^2 + 1^2) = sqrt(1 + 25 + 1) = sqrt(27) = 3 sqrt(3)
3 sqrt(3) ≈ 5.20
----------------
    [PROF: ✓]
(c)  I need the dot product and both lengths, since cos θ = (u · w)/(||u|| ||w||).
u · w = (2)(-4) + (-1)(2) + (3)(6) = -8 - 2 + 18 = 12
||u|| = sqrt(4 + 1 + 9) = sqrt(14),   ||w|| = sqrt(16 + 4 + 36) = sqrt(56) = 2 sqrt(14)
||u|| ||w|| = sqrt(14) · 2 sqrt(14) = 2(14) = 28
cos θ = 12/28 = 3/7,  so θ = arccos(3/7)
θ ≈ 64.62°
----------

    [PROF: -1 E8 u · w is 8, not 12: (2)(-4) + (-1)(2) + (3)(6) = -8 - 2 + 18 = 8. The slip is carried consistently to cos θ = 3/7 and θ ≈ 64.62°, so it is deducted once.]
    [PROF: Problem 1  4/5]

## Problem 2
(a)  AB is undefined. A is 3x3 so it has 3 columns, B is 2x3 so it has 2 rows, 3 ≠ 2.
BA is fine: (2x3)(3x3) = 2x3.
row 1: [1(2)+0(1)+(-2)(0),  1(-1)+0(3)+(-2)(4),  1(0)+0(-2)+(-2)(1)] = [2, -9, -2]
row 2: [3(2)+1(1)+1(0),     3(-1)+1(3)+1(4),     3(0)+1(-2)+1(1)]    = [7, 2, -1]
BA = [ 2  -9  -2 ]
     [ 7   2  -1 ]
     ------------
    [PROF: -0.5 E8 BA entry (2,2) is 3(-1) + 1(3) + 1(4) = 4, not 2.]
(b)  A is 3x3, v is 3x1, so Av is 3x1.
Av = [2(1)+(-1)(-2)+0(3),  1(1)+3(-2)+(-2)(3),  0(1)+4(-2)+1(3)]^T = [4, -11, -5]^T
vA is undefined: v has 1 column, A has 3 rows, 1 ≠ 3.
    [PROF: ✓]
(c)  Aw is undefined: A has 3 columns, w is 1x3 so it has 1 row, 3 ≠ 1.
wA is (1x3)(3x3) = 1x3.
wA = [2(2)+0(1)+(-1)(0),  2(-1)+0(3)+(-1)(4),  2(0)+0(-2)+(-1)(1)] = [4  -6  1]
                                                                    ----------
    [PROF: -0.5 E8 wA third entry is 2(0) + 0(-2) + (-1)(1) = -1, not 1.]
(d)  vw is (3x1)(1x3) = 3x3.
vw = [  1(2)   1(0)   1(-1) ]   [  2   0  -1 ]
     [ -2(2)  -2(0)  -2(-1) ] = [ -4   0   2 ]
     [  3(2)   3(0)   3(-1) ]   [  6   0  -3 ]
wv is (1x3)(3x1) = 1x1, just the dot product:  wv = 2(1) + 0(-2) + (-1)(3) = -1
    [PROF: ✓]
(e)  A^2 = AA, both 3x3.
row 1: [2(2)+(-1)(1)+0(0),  2(-1)+(-1)(3)+0(4),  2(0)+(-1)(-2)+0(1)] = [3, -5, 2]
row 2: [1(2)+3(1)+(-2)(0),  1(-1)+3(3)+(-2)(4),  1(0)+3(-2)+(-2)(1)] = [5, 0, -8]
row 3: [0(2)+4(1)+1(0),     0(-1)+4(3)+1(4),     0(0)+4(-2)+1(1)]    = [4, 12, -7]
A^2 = [ 3  -5   2 ]
      [ 5   0  -8 ]
      [ 4  12  -7 ]
      ------------
    [PROF: -0.5 E8 A^2 entry (3,2) is 0(-1) + 4(3) + 1(4) = 16, not 12.]
(f)  B^2 = BB is undefined. B is 2x3, not square: the first B has 3 columns, the
second has 2 rows, 3 ≠ 2.

    [PROF: ✓]
    [PROF: Problem 2  4.5/6]

## Problem 3
(a)  Augmented matrix and row reduce:
                       [  1  2  -1 | -1 ]
                       [  2  3   1 |  2 ]
                       [ -1  1   2 | -1 ]
R2 → R2 - 2R1          [ 1  2  -1 | -1 ]
R3 → R3 + R1           [ 0 -1   3 |  4 ]
                       [ 0  3   1 |  0 ]
R2 → -R2               [ 1  2  -1 |  -1 ]
R3 → R3 - 3R2          [ 0  1  -3 |  -4 ]
                       [ 0  0  10 |  12 ]
R3 → (1/10)R3          [ 1  2  -1 |  -1 ]
                       [ 0  1  -3 |  -4 ]
                       [ 0  0   1 | 6/5 ]
Three pivots, so one solution. Back substituting, x3 = 6/5, then
x2 = -4 + 3(6/5) = -4 + 18/5 = -2/5
x1 = -1 - 2(-2/5) + 6/5 = -1 + 4/5 + 6/5 = 1
x = [1, -2/5, 6/5]^T
--------------------
    [PROF: -1 E8 R3 → R3 + R1 gives the constant -1 + (-1) = -2, not 0. Carried consistently to x = [1, -2/5, 6/5]^T; the correct solution is [2, -1, 1]^T.]
(b)                    [ 1  2  -1 |  4 ]
                       [ 2  5   1 |  6 ]
                       [ 3  7   0 | 10 ]
R2 → R2 - 2R1          [ 1  2  -1 |  4 ]
R3 → R3 - 3R1          [ 0  1   3 | -2 ]
                       [ 0  1   3 | -2 ]
R3 → R3 - R2           [ 1  0  -7 |  8 ]
R1 → R1 - 2R2          [ 0  1   3 | -2 ]
                       [ 0  0   0 |  0 ]
Column 3 has no pivot, so z is free. Let z = t.
Row 2: y = -2 - 3t.   Row 1: x = 8 + 7t.
Infinitely many solutions, one for each value of t.
[x, y, z]^T = [8, -2, 0]^T + t [7, -3, 1]^T,  t ∈ R
---------------------------------------------------

    [PROF: ✓]
    [PROF: Problem 3  5/6]

## Problem 4
(a)  Let x1, x2, x3 be the masses, in kg, of Alloy 1, Alloy 2, Alloy 3 that get used.
The 100 kg product holds 36 kg copper, 44 kg zinc, 20 kg nickel, and nothing is lost,
so for each metal the mass going in equals the mass coming out.
copper:  0.5 x1 + 0.2 x2 + 0.4 x3 = 36
zinc:    0.3 x1 + 0.7 x2 + 0.2 x3 = 44
nickel:  0.2 x1 + 0.1 x2 + 0.4 x3 = 20
    [PROF: ✓]
(b)  Multiply each row by 10 to clear the decimals:
[ 5  2  4 | 360 ]
[ 3  7  2 | 400 ]
[ 2  1  4 | 200 ]
    [PROF: -0.5 E8 The zinc row constant is 10(44) = 440, not 400.]
(c)                    [ 5  2  4 | 360 ]
                       [ 3  7  2 | 440 ]
                       [ 2  1  4 | 200 ]
R1 → R1 - 2R3          [ 1  0  -4 | -40 ]
                       [ 3  7   2 | 440 ]
                       [ 2  1   4 | 200 ]
R2 → R2 - 3R1          [ 1  0  -4 | -40 ]
R3 → R3 - 2R1          [ 0  7  14 | 520 ]
                       [ 0  1  12 | 280 ]
R2 → (1/7)R2           [ 1  0  -4 |    -40 ]
R3 → R3 - R2           [ 0  1   2 |  520/7 ]
                       [ 0  0  10 | 1440/7 ]
R3 → (1/10)R3          [ 1  0  -4 |   -40 ]
                       [ 0  1   2 | 520/7 ]
                       [ 0  0   1 | 144/7 ]
x3 = 144/7 ≈ 20.57,  x2 = 520/7 - 2(144/7) = 232/7 ≈ 33.14
x1 = -40 + 4(144/7) = -40 + 576/7 = 296/7 ≈ 42.29
Use about 42.29 kg of Alloy 1, 33.14 kg of Alloy 2, and 20.57 kg of Alloy 3.
----------------------------------------------------------------------------

    [PROF: -1 E8 From the matrix as written, R2 → R2 - 3R1 gives 440 - 3(-40) = 560, not 520. Carried consistently to 42.29, 33.14, 20.57 kg; the correct masses are 40, 40, 20 kg.]
    [PROF: Problem 4  6.5/8]

## Problem 5
(a)                    [ 1  2  1 ]
                       [ 2  4  3 ]
                       [ 3  6  4 ]
R2 → R2 - 2R1          [ 1  2  1 ]
R3 → R3 - 3R1          [ 0  0  1 ]
                       [ 0  0  1 ]
R3 → R3 - R2           [ 1  2  0 ]
R1 → R1 - R2           [ 0  0  1 ]
                       [ 0  0  0 ]
RREF(A) = [ 1  2  0 ]
          [ 0  0  1 ]
          [ 0  0  0 ]
          -----------
    [PROF: ✓]
(b)  rank(A) = 2, because the RREF has pivots in columns 1 and 3, so two pivots
(two nonzero rows).
    [PROF: ✓]
(c)  The same operations on [A | b] leave the bottom row as [ 0  0  0 | b3 - b1 - b2 ].
0 solutions: possible. If b3 ≠ b1 + b2, for example b = [0, 0, 1]^T, that row says
0 = 1, so the system is inconsistent.
Exactly 1 solution: impossible. Column 2 never holds a pivot, so x2 is free whenever
the system is consistent. rank(A) = 2 < 3 unknowns, so the solution is never unique.
Infinitely many: possible. If b3 = b1 + b2, say b = [1, 3, 4]^T or b = 0, the system
is consistent and the free variable x2 gives infinitely many solutions.

    [PROF: ✓]
    [PROF: Problem 5  7/7]

## Problem 6
(a)  Vectors as columns, then row reduce:
                       [ 1  2   0 ]
                       [ 0  1   1 ]
                       [ 2  3  -1 ]
R3 → R3 - 2R1          [ 1  2   0 ]
                       [ 0  1   1 ]
                       [ 0 -1  -1 ]
R3 → R3 + R2           [ 1  2  0 ]
                       [ 0  1  1 ]
                       [ 0  0  0 ]
Two pivots for three vectors, so there is a free variable and the set is dependent.
The relation is v3 = v2 - 2v1, since [2, 1, 3]^T - [2, 0, 4]^T = [0, 1, -1]^T, and
v1, v2 are not multiples of each other so they still span two dimensions.
Dependent, and the span is a plane through the origin in R^3.
---------------------------------------------------------
    [PROF: ✓]
(b)                    [ 1  0  1 ]
                       [ 1  1  0 ]
                       [ 0  1  1 ]
R2 → R2 - R1           [ 1  0   1 ]
                       [ 0  1  -1 ]
                       [ 0  1   1 ]
R3 → R3 - R2           [ 1  0   1 ]
                       [ 0  1  -1 ]
                       [ 0  0   2 ]
Three pivots for three vectors, so c1 v1 + c2 v2 + c3 v3 = 0 only when
c1 = c2 = c3 = 0, which is what independent means, and 3 of them fill R^3.
Independent, and the span is all of R^3.
----------------------------------------
    [PROF: ✓]
    [PROF: Problem 6  8/8]

## Grader summary
    Problem 1: 4/5
    Problem 2: 4.5/6
    Problem 3: 5/6
    Problem 4: 6.5/8
    Problem 5: 7/7
    Problem 6: 8/8
    Total: 35/40
    Your method is correct throughout and every row operation is labeled in the required form. Every point you lost is arithmetic: u · w in 1(c), three matrix entries in Problem 2, and constants in 3(a), 4(b), and 4(c). Check results against the problem statement — the masses in 4(c) sum to 96 kg, not the 100 kg you were given.
