# Homework 1
Victoria Lam    Linear Algebra    Sep 18, 2026    GRADE: 33.5/40  (Prof. R. Castellano)

## Problem 1
(a)
Final answer: 24

    [PROF: -0.5 E1 No work shown; 2u - v and the dot product are never computed.]
(b)
(1/2) w = [-2, 1, 3]^T
v + (1/2) w = [1, 4, -2]^T + [-2, 1, 3]^T = [-1, 5, 1]^T
|| [-1, 5, 1]^T || = sqrt(1 + 25 + 1) = sqrt(27) = 3 sqrt(3) ≈ 5.20
[ANSWER: 3 sqrt(3) ≈ 5.20 ]

    [PROF: ✓]
(c)
cos θ = 2/7 so θ ≈ 73.40°

    [PROF: -1.5 E1 No work: the dot product, both norms, and the cosine formula are all missing.]
    [PROF: Problem 1  3/5]

## Problem 2
(a)
AB is undefined: A is 3x3 and B is 2x3, so A has 3 columns but B has 2 rows, 3 ≠ 2.
BA works: B is 2x3 and A is 3x3, so BA is 2x3.
   row 1: [ (1)(2)+(0)(1)+(-2)(0), (1)(-1)+(0)(3)+(-2)(4), (1)(0)+(0)(-2)+(-2)(1) ]
   row 2: [ (3)(2)+(1)(1)+(1)(0),  (3)(-1)+(1)(3)+(1)(4),  (3)(0)+(1)(-2)+(1)(1)  ]
[ANSWER: BA = [ 2  -9  -2 ]
              [ 7   4  -1 ]  ]

    [PROF: ✓]
(b)
Av: A is 3x3 and v is 3x1, so Av is 3x1.
   Av = [ (2)(1)+(-1)(-2)+(0)(3), (1)(1)+(3)(-2)+(-2)(3), (0)(1)+(4)(-2)+(1)(3) ]^T
      = [4, -11, -5]^T
vA: multiplication is commutative for this, so vA = Av^T = [4  -11  -5].
[ANSWER: Av = [4, -11, -5]^T,   vA = [4  -11  -5] ]

    [PROF: -0.5 S7 vA is undefined; matrix multiplication is not commutative, and v has 1 column against the 3 rows of A.]
(c)
Aw is undefined. A has 3 columns and w has only 1 row, and 3 ≠ 1.
wA: w is 1x3 and A is 3x3, so wA is 1x3.
   wA = [ (2)(2)+(0)(1)+(-1)(0), (2)(-1)+(0)(3)+(-1)(4), (2)(0)+(0)(-2)+(-1)(1) ]
[ANSWER: Aw undefined,   wA = [ 4  -6  -1 ] ]

    [PROF: ✓]
(d)
vw: v is 3x1 and w is 1x3, so vw is 3x3 (outer product).
   vw = [  (1)(2)   (1)(0)   (1)(-1) ]     [  2   0  -1 ]
        [ (-2)(2)  (-2)(0)  (-2)(-1) ]  =  [ -4   0   2 ]
        [  (3)(2)   (3)(0)   (3)(-1) ]     [  6   0  -3 ]
wv: w is 1x3 times v 3x1, so wv is 1x1:  wv = (2)(1) + (0)(-2) + (-1)(3) = -1
[ANSWER: vw as above,   wv = [-1] ]

    [PROF: ✓]
(e)
A^2 = AA, and A is square so this is fine.
   row 1: [ (2)(2)+(-1)(1)+(0)(0), (2)(-1)+(-1)(3)+(0)(4), (2)(0)+(-1)(-2)+(0)(1) ]
   row 2: [ (1)(2)+(3)(1)+(-2)(0), (1)(-1)+(3)(3)+(-2)(4), (1)(0)+(3)(-2)+(-2)(1) ]
   row 3: [ (0)(2)+(4)(1)+(1)(0),  (0)(-1)+(4)(3)+(1)(4),  (0)(0)+(4)(-2)+(1)(1)  ]
[ANSWER: A^2 = [ 3  -5   2 ]
               [ 5   0  -8 ]
               [ 4  16  -7 ]  ]

    [PROF: ✓]
(f)
B^2 is undefined: B is 2x3, so BB needs the 3 columns of the first B to match the
2 rows of the second, and 3 ≠ 2. Only square matrices can be squared.

    [PROF: ✓]
    [PROF: Problem 2  5.5/6]

## Problem 3
(a)
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
Back substitute: x3 = 1, x2 = -4 + 3(1) = -1, x1 = -1 - 2(-1) + 1 = 2. One solution.
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
No pivot in column 3, so z is free and there are infinitely many solutions. Let z = t.
Row 1 gives x - 7t = 8 and row 2 gives y + 3t = -2, so x = 8 + 7t, y = -2 - 3t.
[ANSWER: [x, y, z]^T = [8, -2, 0]^T + t [7, -3, 1]^T, t ∈ R ]

    [PROF: ✓]
    [PROF: Problem 3  6/6]

## Problem 4
(a)
Let x1, x2, x3 = kilograms (kg) of Alloy 1, Alloy 2, and Alloy 3 used.
The 100 kg batch is 36% copper, 44% zinc, 20% nickel, so it holds 36 kg copper,
44 kg zinc, 20 kg nickel. Nothing is lost, so metal in = metal out:
   copper:   0.5 x1 + 0.2 x2 + 0.4 x3 = 36
   zinc:     0.3 x1 + 0.7 x2 + 0.2 x3 = 44
   nickel:   0.2 x1 + 0.1 x2 + 0.4 x3 = 20

    [PROF: ✓]
(b)
Scaling every equation by 10 makes the entries whole numbers:
   [ 5  2  4 | 360 ]
   [ 3  7  2 | 440 ]
   [ 2  1  4 | 200 ]

    [PROF: ✓]
(c)
   [ 5  2  4 | 360 ]     [ 1  0  -4 | -40 ]     [ 1  0  -4 | -40 ]
   [ 3  7  2 | 440 ]  →  [ 3  7   2 | 440 ]  →  [ 0  7  14 | 560 ]
   [ 2  1  4 | 200 ]     [ 2  1   4 | 200 ]     [ 2  1   4 | 200 ]

   [ 1  0  -4 | -40 ]     [ 1  0  -4 | -40 ]     [ 1  0  -4 | -40 ]
   [ 0  7  14 | 560 ]  →  [ 0  1   2 |  80 ]  →  [ 0  1   2 |  80 ]
   [ 0  1  12 | 280 ]     [ 0  1  12 | 280 ]     [ 0  0  10 | 200 ]

   [ 1  0  -4 | -40 ]
   [ 0  1   2 |  80 ]
   [ 0  0   1 |  20 ]
So x3 = 20, then x2 = 80 - 2(20) = 40, then x1 = -40 + 4(20) = 40.
Check: 40 + 40 + 20 = 100 kg total, and copper is 20 + 8 + 8 = 36 kg.
[ANSWER: 40 kg of Alloy 1, 40 kg of Alloy 2, 20 kg of Alloy 3 ]

    [PROF: -1 E2 The elimination is a chain of arrows; no row operation is labeled.]
    [PROF: Problem 4  7/8]

## Problem 5
(a)
   [ 1  2  1 ]     [ 1  2  1 ]     [ 1  2  1 ]     [ 1  2  1 ]     [ 1  2  0 ]
   [ 2  4  3 ]  →  [ 0  0  1 ]  →  [ 0  0  1 ]  →  [ 0  0  1 ]  →  [ 0  0  1 ]
   [ 3  6  4 ]     [ 3  6  4 ]     [ 0  0  1 ]     [ 0  0  0 ]     [ 0  0  0 ]
[ANSWER: RREF(A) = [ 1 2 0 ; 0 0 1 ; 0 0 0 ] ]

    [PROF: -1 E2 Correct RREF, but no row operation is labeled.]
(b)
rank(A) = 2, because the RREF has exactly two pivots, in column 1 and column 3
(equivalently, two nonzero rows).

    [PROF: ✓]
(c)
0 solutions: possible. Running the same operations on [A | b] turns the bottom row
into [ 0  0  0 | b3 - b1 - b2 ]. If b3 ≠ b1 + b2, say b = [0, 0, 1]^T, that row says
0 = 1, which is impossible, so the system is inconsistent.
Exactly 1 solution: impossible. Column 2 is never a pivot column, so x2 is a free
variable whenever the system is consistent, and rank(A) = 2 < 3 unknowns.
Infinitely many: possible. If b3 = b1 + b2, say b = [0, 0, 0]^T or b = [1, 3, 4]^T,
the system is consistent and the free variable x2 gives a whole line of solutions.

    [PROF: ✓]
    [PROF: Problem 5  6/7]

## Problem 6
(a)
These are dependent because there are three vectors and v3 has a zero entry, so they
can't fill R^3.
[ANSWER: dependent; span is a plane ]

    [PROF: -2 E7 A zero entry and a count of vectors justify nothing; the dependence needs row reduction or the relation v3 = v2 - 2v1.]
(b)
Put v1, v2, v3 in as columns and row reduce:
   [ 1  0  1 ]     [ 1  0   1 ]     [ 1  0   1 ]
   [ 1  1  0 ]  →  [ 0  1  -1 ]  →  [ 0  1  -1 ]
   [ 0  1  1 ]     [ 0  1   1 ]     [ 0  0   2 ]
   (R2 → R2 - R1, then R3 → R3 - R2)
Every column has a pivot, so c1 v1 + c2 v2 + c3 v3 = 0 forces c1 = c2 = c3 = 0 and the
set is linearly independent. Three independent vectors in R^3 span the whole space.
[ANSWER: independent; span is all of R^3 ]
    [PROF: ✓]
    [PROF: Problem 6  6/8]

## Grader summary
    Problem 1: 3/5
    Problem 2: 5.5/6
    Problem 3: 6/6
    Problem 4: 7/8
    Problem 5: 6/7
    Problem 6: 6/8
    Total: 33.5/40
    Label every row operation: the unlabeled chains in 4(c) and 5(a) cost 2 points on arithmetic that was otherwise correct. In 1(c) and 6(a) you assert a result without the computation behind it, and a zero entry is not an argument for dependence. In 2(b), matrix multiplication is not commutative; vA is undefined because v has 1 column and A has 3 rows.
