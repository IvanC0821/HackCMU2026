# Homework 1
Isabel Moreau    Linear Algebra    Sep 18, 2026    GRADE: 29/40  (Prof. R. Castellano)

## Problem 1
(a)
~~2u - v = [4, -2, 6]^T - [1, 4, -2]^T = [3, -6, 4]^T~~
2u = [4, -2, 6]^T
2u - v = [4 - 1, -2 - 4, 6 - (-2)]^T = [3, -6, 8]^T
(2u - v) · w = (3)(-4) + (-6)(2) + (8)(6) = -12 - 12 + 48 = 24
[ANSWER: (2u - v) · w = 24 ]
    [PROF: ✓]
(b)
(1/2)w = [-2, 1, 3]^T
v + (1/2)w = [1, 4, -2]^T + [-2, 1, 3]^T = [-1, 5, 1]^T
||v + (1/2)w|| = sqrt((-1)^2 + 5^2 + 1^2) = sqrt(1 + 25 + 1) = sqrt(27) = 3 sqrt(3)
[ANSWER: 3 sqrt(3) ≈ 5.20 ]
    [PROF: ✓]
(c)
cos θ = (u · w)/(||u|| ||w||)
u · w = (2)(-4) + (-1)(2) + (3)(6) = -8 - 2 + 18 = 8
||u|| = sqrt(4 + 1 + 9) = sqrt(14)
~~||w|| = sqrt(16 + 4 + 36) = sqrt(66)~~
||w|| = sqrt(16 + 4 + 36) = sqrt(56) = 2 sqrt(14)
||u|| ||w|| = sqrt(14) · 2 sqrt(14) = 28
cos θ = 8/28 = 2/7
θ = arccos(2/7)
[ANSWER: θ ≈ 73.40° ]

    [PROF: ✓]
    [PROF: Problem 1  5/5]

## Problem 2
(a)
AB is undefined, because A is 3x3 (3 columns) and B is 2x3 (2 rows), and 3 ≠ 2.
BA is 2x3 since B is 2x3 and A is 3x3.
~~row 1: [1(2)+0(1)+(-2)(0), 1(-1)+0(3)+(-2)(1),~~
row 1: [1(2)+0(1)+(-2)(0),  1(-1)+0(3)+(-2)(4),  1(0)+0(-2)+(-2)(1)] = [2, -9, -2]
row 2: [3(2)+1(1)+1(0),     3(-1)+1(3)+1(4),     3(0)+1(-2)+1(1)]    = [7, 4, -1]
[ANSWER: BA = [ 2  -9  -2 ]
              [ 7   4  -1 ] ]
    [PROF: ✓]
(b)
Av is (3x3)(3x1) = 3x1.
Av = [ 2(1) + (-1)(-2) + 0(3) ]   [   4 ]
     [ 1(1) + 3(-2) + (-2)(3) ] = [ -11 ]
     [ 0(1) + 4(-2) + 1(3)    ]   [   5 ]
vA is undefined: v is 3x1 so it has 1 column, A has 3 rows, and 1 ≠ 3.
[ANSWER: Av = [4, -11, 5]^T, vA undefined ]
    [PROF: -0.5 E8 Third entry of Av is 0(1) + 4(-2) + 1(3) = -5, not 5.]
(c)
Aw is undefined: A has 3 columns and w is 1x3 with only 1 row, 3 ≠ 1.
wA = [2(2)+0(1)+(-1)(0),  2(-1)+0(3)+(-1)(4),  2(0)+0(-2)+(-1)(1)]
[ANSWER: wA = [ 4  -6  1 ], Aw undefined ]
    [PROF: -0.5 E8 Third entry of wA is 2(0) + 0(-2) + (-1)(1) = -1, not 1.]
(d)
vw is (3x1)(1x3) = 3x3, so each entry is a v entry times a w entry.
vw = [  1(2)   1(0)   1(-1) ]   [  2   0  -1 ]
     [ -2(2)  -2(0)  -2(-1) ] = [ -4   0   2 ]
     [  3(2)   3(0)   3(-1) ]   [  6   0  -3 ]
wv is (1x3)(3x1) = 1x1 and equals the dot product: 2(1) + 0(-2) + (-1)(3) = -1
[ANSWER: vw as above, wv = [-1] ]
    [PROF: ✓]
(e)
A^2 = AA, defined since A is square.
row 1: [2(2)+(-1)(1)+0(0),  2(-1)+(-1)(3)+0(4),  2(0)+(-1)(-2)+0(1)] = [3, -5, 2]
row 2: [1(2)+3(1)+(-2)(0),  1(-1)+3(3)+(-2)(4),  1(0)+3(-2)+(-2)(1)] = [5, 0, -8]
row 3: [0(2)+4(1)+1(0),     0(-1)+4(3)+1(4),     0(0)+4(-2)+1(1)]    = [4, 12, -7]
[ANSWER: A^2 = [ 3  -5   2 ]
               [ 5   0  -8 ]
               [ 4  12  -7 ] ]
    [PROF: -0.5 E8 Entry (3,2) of A^2 is 0(-1) + 4(3) + 1(4) = 16, not 12.]
(f)
B^2 undefined.

    [PROF: -0.5 E5 Undefined with no dimension reason; state that B is 2x3, so BB would need 3 = 2.]
    [PROF: Problem 2  4/6]

## Problem 3
(a)
                  [  1  2  -1 | -1 ]
                  [  2  3   1 |  2 ]
                  [ -1  1   2 | -1 ]
R2 → R2 - 2R1     [ 1  2  -1 | -1 ]
R3 → R3 + R1      [ 0 -1   3 |  4 ]
                  [ 0  3   1 |  0 ]
R2 → -R2          [ 1  2  -1 |  -1 ]
R3 → R3 - 3R2     [ 0  1  -3 |  -4 ]
                  [ 0  0  10 |  12 ]
R3 → (1/10)R3     [ 1  2  -1 |  -1 ]
                  [ 0  1  -3 |  -4 ]
                  [ 0  0   1 | 6/5 ]
x3 = 6/5
x2 = -4 + 3(6/5) = -4 + 18/5 = -2/5
x1 = -1 - 2(-2/5) + 6/5 = -1 + 4/5 + 6/5 = 1
[ANSWER: x = [1, -2/5, 6/5]^T ]
    [PROF: -1 E8 In R3 → R3 + R1 the constant is -1 + (-1) = -2, not 0; the elimination and back substitution after the slip follow your numbers correctly.]
(b)
~~R2 → R2 - R1~~
                  [ 1  2  -1 |  4 ]
                  [ 2  5   1 |  6 ]
                  [ 3  7   0 | 10 ]
R2 → R2 - 2R1     [ 1  2  -1 |  4 ]
R3 → R3 - 3R1     [ 0  1   3 | -2 ]
                  [ 0  1   3 | -2 ]
R3 → R3 - R2      [ 1  0  -7 |  8 ]
R1 → R1 - 2R2     [ 0  1   3 | -2 ]
                  [ 0  0   0 |  0 ]
No pivot in column 3, so z is free. Let z = t. Then y = -2 - 3t and x = 8 + 7t,
so the system has infinitely many solutions.
[ANSWER: [x, y, z]^T = [8, -2, 0]^T + t [7, -3, 1]^T, t ∈ R ]

    [PROF: ✓]
    [PROF: Problem 3  5/6]

## Problem 4
(a)
Let x1 = kg of Alloy 1 used, x2 = kg of Alloy 2 used, x3 = kg of Alloy 3 used.
The 100 kg product has 36 kg copper, 44 kg zinc, and 20 kg nickel, and no metal is
lost, so for each metal the mass in equals the mass in the product.
copper:  0.5 x1 + 0.2 x2 + 0.4 x3 = 36
zinc:    0.3 x1 + 0.7 x2 + 0.2 x3 = 44
nickel:  0.2 x1 + 0.1 x2 + 0.4 x3 = 20
    [PROF: ✓]
(b)
Multiply everything by 10:
[ 5  2  4 | 360 ]
[ 3  7  2 | 440 ]
[ 2  1  4 | 200 ]
    [PROF: ✓]
(c)
R1 → R1 - 2R3     [ 1  0  -4 | -40 ]
                  [ 3  7   2 | 440 ]
                  [ 2  1   4 | 200 ]
R2 → R2 - 3R1     [ 1  0  -4 | -40 ]
R3 → R3 - 2R1     [ 0  7  14 | 560 ]
                  [ 0  1  12 | 280 ]
~~R2 → (1/2)R2~~
R2 → (1/7)R2      [ 1  0  -4 | -40 ]
R3 → R3 - R2      [ 0  1   2 |  80 ]
                  [ 0  0  10 | 200 ]
R3 → (1/10)R3     [ 1  0  -4 | -40 ]
                  [ 0  1   2 |  80 ]
                  [ 0  0   1 |  20 ]
x3 = 20,  x2 = 80 - 2(20) = 40,  x1 = -40 + 4(20) = 40
Check: 40 + 40 + 20 = 100 kg total, copper 20 + 8 + 8 = 36 kg.
[ANSWER: 40 kg of Alloy 1, 40 kg of Alloy 2, 20 kg of Alloy 3 ]

    [PROF: ✓]
    [PROF: Problem 4  8/8]

## Problem 5
(a)
                  [ 1  2  1 ]
                  [ 2  4  3 ]
                  [ 3  6  4 ]
R2 → R2 - 2R1     [ 1  2  1 ]
R3 → R3 - 3R1     [ 0  0  1 ]
                  [ 0  0  1 ]
R3 → R3 - R2      [ 1  2  0 ]
R1 → R1 - R2      [ 0  0  1 ]
                  [ 0  0  0 ]
[ANSWER: RREF(A) = [ 1  2  0 ]
                   [ 0  0  1 ]
                   [ 0  0  0 ] ]
    [PROF: ✓]
(b)
rank(A) = 2, since the RREF has two pivots (columns 1 and 3) and two nonzero rows.
[ANSWER: rank(A) = 2 ]
    [PROF: ✓]
(c)
0 solutions: possible.
1 solution: impossible.
Infinitely many: possible.

    [PROF: -4 E7 Three verdicts with no reason for any of them; a claim about the number of solutions earns no credit until you connect it to an inconsistent row, to the free variable in column 2, or to rank 2 < 3 unknowns.]
    [PROF: Problem 5  3/7]

## Problem 6
(a)
These are dependent because there are three vectors and v3 has a zero entry, so
they can't fill R^3.
[ANSWER: dependent, span is a plane ]
    [PROF: -2 E7 A zero entry in v3 says nothing about dependence; the justification points need the row reduction with two pivots or the relation v3 = v2 - 2v1.]
(b)
None of these is a multiple of another so they are independent.
[ANSWER: independent, span is R^3 ]
    [PROF: -2 E7 Pairwise non-multiplicity does not prove independence; show three pivots or det = 2 ≠ 0.]
    [PROF: Problem 6  4/8]

## Grader summary
    Problem 1: 5/5
    Problem 2: 4/6
    Problem 3: 5/6
    Problem 4: 8/8
    Problem 5: 3/7
    Problem 6: 4/8
    Total: 29/40
    Your elimination is clean, every row operation is labeled in the right form, and Problems 3(b) and 4 are fully correct. Three entry slips in Problem 2 and one constant slip in 3(a) — R3 → R3 + R1 gives -2, not 0 — cost you the arithmetic points. The real loss is justification: 5(c) states three verdicts with no reasons at all, and both parts of Problem 6 rest on arguments that prove nothing, so row reduce and count pivots or exhibit the dependence relation.
