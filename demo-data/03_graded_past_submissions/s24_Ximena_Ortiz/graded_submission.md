# Homework 1
Ximena Ortiz    Linear Algebra    Sep 18, 2026    GRADE: 33/40  (Prof. R. Castellano)

## Problem 1
(a)
First I scale u by 2 and subtract v entry by entry, then dot the result with w:
   2u - v = [4, -2, 6]^T - [1, 4, -2]^T = [3, -6, 8]^T
   (2u - v) · w = (3)(-4) + (-6)(2) + (8)(6) = -12 - 12 + 48 = 24
[ANSWER: 24 ]

    [PROF: ✓]
(b)
Halving w first gives (1/2) w = [-2, 1, 3]^T, and adding that to v gives
   v + (1/2) w = [1, 4, -2]^T + [-2, 1, 3]^T = [-1, 5, 1]^T.
The length is the square root of the sum of the squares of the entries:
   || v + (1/2) w || = sqrt((-1)^2 + 5^2 + 1^2) = sqrt(1 + 25 + 1) = sqrt(27)
Since 27 = 9 · 3, this simplifies to 3 sqrt(3), which is about 5.20.
[ANSWER: 3 sqrt(3) ≈ 5.20 ]

    [PROF: ✓]
(c)
cos θ = (u · w) / (||u|| ||w||), so I need the dot product and both lengths first.
   u · w = (2)(-4) + (-1)(2) + (3)(6) = -8 - 2 + 18 = 8
   ||u|| = sqrt(4 + 1 + 9) = sqrt(14)
   ||w|| = sqrt(16 + 4 + 36) = sqrt(56) = 2 sqrt(14)
   cos θ = 8 / (sqrt(14) · 2 sqrt(14)) = 8 / (2 · 14) = 8/28 = 2/7
The inverse cosine of 2/7 in degrees is 73.398...°, which I round to two decimals.
[ANSWER: θ ≈ 73.40° ]

    [PROF: ✓]
    [PROF: Problem 1  5/5]

## Problem 2
(a)
AB is undefined, because A is 3x3 and B is 2x3, so the 3 columns of A do not match the
2 rows of B. BA is defined (2x3 times 3x3) and the product is 2x3.
   row 1 = [ 1(2)+0(1)+(-2)(0), 1(-1)+0(3)+(-2)(4), 1(0)+0(-2)+(-2)(1) ] = [2, -9, -2]
   row 2 = [ 3(2)+1(1)+1(0),    3(-1)+1(3)+1(4),    3(0)+1(-2)+1(1)    ] = [7,  4, -1]
[ANSWER: AB undefined;  BA = [ 2  -9  -2 ]
                             [ 7   4  -1 ]  ]
    [PROF: ✓]
(b)
Av is defined (3x3 times 3x1) and the result is another 3x1 column:
   Av = [ 2(1)+(-1)(-2)+0(3), 1(1)+3(-2)+(-2)(3), 0(1)+4(-2)+1(3) ]^T = [4, -11, -5]^T
vA is undefined, because v is 3x1 and so it has only 1 column, while A has 3 rows.
[ANSWER: Av = [4, -11, -5]^T;  vA undefined ]
    [PROF: ✓]
(c)
Aw is undefined: A has 3 columns but w is 1x3, so it has only 1 row, and 3 ≠ 1.
wA is defined (1x3 times 3x3) and the answer is a 1x3 row vector:
   wA = [ 2(2)+0(1)+(-1)(0), 2(-1)+0(3)+(-1)(4), 2(0)+0(-2)+(-1)(1) ] = [4, -6, -1]
[ANSWER: Aw undefined;  wA = [ 4  -6  -1 ] ]
    [PROF: ✓]
(d)
Both exist but have different shapes: vw is 3x1 times 1x3, so 3x3, and wv is 1x1.
   vw = [  1(2)   1(0)   1(-1) ]     [  2   0  -1 ]
        [ -2(2)  -2(0)  -2(-1) ]  =  [ -4   0   2 ]
        [  3(2)   3(0)   3(-1) ]     [  6   0  -3 ]
   wv = 2(1) + 0(-2) + (-1)(3) = 2 - 3 = -1, which is the dot product of w and v.
[ANSWER: vw as above;  wv = [-1] ]
    [PROF: ✓]
(e)
A is square, so A^2 = AA is defined and is again 3x3. Multiplying row by column:
   row 1 = [ 2(2)+(-1)(1)+0(0), 2(-1)+(-1)(3)+0(4), 2(0)+(-1)(-2)+0(1) ] = [3, -5,  2]
   row 2 = [ 1(2)+3(1)+(-2)(0), 1(-1)+3(3)+(-2)(4), 1(0)+3(-2)+(-2)(1) ] = [5,  0, -8]
   row 3 = [ 0(2)+4(1)+1(0),    0(-1)+4(3)+1(4),    0(0)+4(-2)+1(1)    ] = [4, 16, -7]
[ANSWER: A^2 = [ 3  -5   2 ]
               [ 5   0  -8 ]
               [ 4  16  -7 ]  ]
    [PROF: ✓]
(f)
B^2 is undefined: squaring needs the columns to match the rows, but B is 2x3, so BB
would require 3 = 2.
[ANSWER: B^2 undefined (B is not square) ]

    [PROF: ✓]
    [PROF: Problem 2  6/6]

## Problem 3
(a)
   [  1  2  -1 | -1 ]
   [  2  3   1 |  2 ]
   [ -1  1   2 | -1 ]
so x1 = 2, x2 = -1, x3 = 1
[ANSWER: x = [2, -1, 1]^T ]

    [PROF: -1.5 E1 No elimination is shown; the solution is stated straight off the augmented matrix, and the problem requires every row operation.]
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
The bottom row is all zeros, so it tells me nothing and I drop it. Taking z = 0, the
first row gives x = 8 and the second gives y = -2, so the system has one solution.
[ANSWER: x = 8, y = -2, z = 0 ]

    [PROF: -1 S7 The zero row means z is free, so the system has infinitely many solutions, not one.; -1 E4 Setting z = 0 gives one particular solution, not the general solution in parametric form.]
    [PROF: Problem 3  2.5/6]

## Problem 4
(a)
Let x1, x2, x3 be the masses in kilograms of Alloy 1, Alloy 2, Alloy 3 in the blend.
The finished 100 kg batch is 36% copper, 44% zinc, 20% nickel, so it holds 36 kg of
copper, 44 kg of zinc, 20 kg of nickel. No metal is lost, so for each metal the mass
going in equals the mass coming out:
   copper:  0.5 x1 + 0.2 x2 + 0.4 x3 = 36
   zinc:    0.3 x1 + 0.7 x2 + 0.2 x3 = 44
   nickel:  0.2 x1 + 0.1 x2 + 0.4 x3 = 20

    [PROF: ✓]
(b)
I multiplied every equation by 10 first so I wouldn't have to row reduce decimals:
   [ 5  2  4 | 360 ]
   [ 3  7  2 | 440 ]
   [ 2  1  4 | 200 ]

    [PROF: ✓]
(c)
R1 → R1 - 2R3:     [ 1  0  -4 | -40 ]
                   [ 3  7   2 | 440 ]
                   [ 2  1   4 | 200 ]
R2 → R2 - 3R1:     [ 1  0  -4 | -40 ]
                   [ 0  7  14 | 560 ]
                   [ 2  1   4 | 200 ]
R3 → R3 - 2R1:     [ 1  0  -4 | -40 ]
                   [ 0  7  14 | 560 ]
                   [ 0  1  12 | 280 ]
R2 → (1/7)R2:      [ 1  0  -4 | -40 ]
                   [ 0  1   2 |  80 ]
                   [ 0  1  12 | 280 ]
R3 → R3 - R2:      [ 1  0  -4 | -40 ]
                   [ 0  1   2 |  80 ]
                   [ 0  0  10 | 200 ]
R3 → (1/10)R3:     [ 1  0  -4 | -40 ]
                   [ 0  1   2 |  80 ]
                   [ 0  0   1 |  20 ]
Back substituting: x3 = 20, then x2 = 80 - 2(20) = 40, then x1 = -40 + 4(20) = 40.
Checking against the copper equation, 0.5(40) + 0.2(40) + 0.4(20) = 20 + 8 + 8 = 36.
[ANSWER: 40 kg of Alloy 1, 40 kg of Alloy 2, and 20 kg of Alloy 3 ]

    [PROF: ✓]
    [PROF: Problem 4  8/8]

## Problem 5
(a)
   [ 1  2  1 ]     [ 1  2  1 ]     [ 1  2  1 ]     [ 1  2  1 ]     [ 1  2  0 ]
   [ 2  4  3 ]  →  [ 0  0  1 ]  →  [ 0  0  1 ]  →  [ 0  0  1 ]  →  [ 0  0  1 ]
   [ 3  6  4 ]     [ 3  6  4 ]     [ 0  0  1 ]     [ 0  0  0 ]     [ 0  0  0 ]
[ANSWER: RREF(A) = [ 1 2 0 ; 0 0 1 ; 0 0 0 ] ]

    [PROF: -1 E2 Correct RREF, but no row operation is labeled.]
(b)
rank(A) = 2

    [PROF: -0.5 E7 The rank is stated with no pivot-count justification.]
(c)
Zero solutions is possible. Running the same operations on [A | b] turns the third row
into [ 0  0  0 | b3 - b1 - b2 ]. Whenever b3 ≠ b1 + b2, for instance b = [0, 0, 1]^T,
that row reads 0 = 1, which is false, so no x can satisfy the system.
Exactly one solution is impossible. Column 2 never becomes a pivot column, so x2 is
always a free variable once the system is consistent, and a free variable means more
than one solution. In rank terms, rank(A) = 2 < 3 unknowns, so uniqueness can't occur.
Infinitely many solutions is possible. If b3 = b1 + b2, say b = [1, 3, 4]^T or b = 0,
the last row reads 0 = 0 and the system is consistent, so the free variable x2 gives
an entire line of solutions.

    [PROF: ✓]
    [PROF: Problem 5  5.5/7]

## Problem 6
(a)
These are dependent because there are three vectors and v3 has a zero entry, so they
can't fill R^3.
[ANSWER: dependent; span is a plane ]

    [PROF: -2 E7 A zero entry and a count of vectors justify nothing; the dependence needs row reduction or the relation v3 = v2 - 2v1.]
(b)
Three vectors in R^3 make a square matrix, so I can test independence by determinant:
   | 1  0  1 |
   | 1  1  0 |
   | 0  1  1 |
Expanding along the first row with cofactors,
det = 1(1·1 - 0·1) - 0(1·1 - 0·0) + 1(1·1 - 1·0) = 1 - 0 + 1 = 2.
The determinant is 2 ≠ 0, so c1 v1 + c2 v2 + c3 v3 = 0 forces c1 = c2 = c3 = 0 and the
vectors are independent. Three independent vectors in R^3 have to span all of R^3.
[ANSWER: independent; span is all of R^3 ]
    [PROF: ✓]
    [PROF: Problem 6  6/8]

## Grader summary
    Problem 1: 5/5
    Problem 2: 6/6
    Problem 3: 2.5/6
    Problem 4: 8/8
    Problem 5: 5.5/7
    Problem 6: 6/8
    Total: 33/40
    Problem 3 is where this paper fell apart: 3(a) gives the answer with no elimination at all, and in 3(b) you drop the zero row, set z = 0, and call one particular solution the solution. A free variable means infinitely many solutions, and the general solution must be written in parametric form with the parameter and its domain. Label the row operations in 5(a), and justify your claims: 'v3 has a zero entry' is not an argument for dependence, and a bare rank value earns half credit.
