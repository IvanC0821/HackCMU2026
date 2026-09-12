# Homework 1
Jamal Carter    Linear Algebra    Sep 15, 2026    GRADE: 30.5/40  (Prof. R. Castellano)

## Problem 1
(a)
2u = [4, -2, 6]^T
2u - v = [4, -2, 6]^T - [1, 4, -2]^T = [3, -6, 8]^T
(2u - v) · w = (3)(-4) + (-6)(2) + (8)(6) = -12 - 12 + 48 = 26
=> ANS: 26
    [PROF: -0.5 E8 (2u - v) · w = -12 - 12 + 48 = 24, not 26.]
(b)
(1/2)w = [-2, 1, 3]^T
v + (1/2)w = [-1, 5, 1]^T
||[-1, 5, 1]^T|| = sqrt(1 + 25 + 1) = sqrt(27) = 3 sqrt(3) ≈ 5.20
=> ANS: 3 sqrt(3) ≈ 5.20
    [PROF: ✓]
(c)
cos θ = (u · w)/(||u|| ||w||)
u · w = -8 - 2 + 18 = 8
||u|| = sqrt(4 + 1 + 9) = sqrt(14),  ||w|| = sqrt(16 + 4 + 36) = sqrt(56) = 2 sqrt(14)
||u|| ||w|| = 2(14) = 28
cos θ = 8/28 = 2/7  =>  θ = arccos(2/7)
=> ANS: θ ≈ 73.40°

    [PROF: ✓]
    [PROF: Problem 1  4.5/5]

## Problem 2
(a)
AB: undefined. A is 3x3, B is 2x3, 3 cols ≠ 2 rows.
BA: (2x3)(3x3) = 2x3.
r1 = [1(2)+0(1)+(-2)(0),  1(-1)+0(3)+(-2)(4),  1(0)+0(-2)+(-2)(1)] = [2, -9, -2]
r2 = [3(2)+1(1)+1(0),     3(-1)+1(3)+1(4),     3(0)+1(-2)+1(1)]    = [7, 4, -1]
=> BA = [ 2  -9  -2 ]
        [ 7   4  -1 ]
    [PROF: ✓]
(b)
Av: (3x3)(3x1) = 3x1.
Av = [2(1)+(-1)(-2)+0(3),  1(1)+3(-2)+(-2)(3),  0(1)+4(-2)+1(3)]^T = [4, -11, 5]^T
vA: undefined. v is 3x1, 1 col ≠ 3 rows of A.
=> ANS: Av = [4, -11, 5]^T, vA undefined
    [PROF: -0.5 E8 The third entry of Av is 0(1) + 4(-2) + 1(3) = -5, not 5.]
(c)
Aw: undefined. A has 3 cols, w is 1x3 so 1 row, 3 ≠ 1.
wA: (1x3)(3x3) = 1x3.
wA = [2(2)+0(1)+(-1)(0),  2(-1)+0(3)+(-1)(4),  2(0)+0(-2)+(-1)(1)] = [4  -6  -1]
=> ANS: wA = [4  -6  -1], Aw undefined
    [PROF: ✓]
(d)
vw: (3x1)(1x3) = 3x3.
vw = [  1(2)   1(0)   1(-1) ]   [  2   0  -1 ]
     [ -2(2)  -2(0)  -2(-1) ] = [ -4   0   2 ]
     [  3(2)   3(0)   3(-1) ]   [  6   0  -3 ]
wv: (1x3)(3x1) = 1x1 = 2(1) + 0(-2) + (-1)(3) = -1
=> ANS: vw above, wv = [-1]
    [PROF: ✓]
(e)
A^2 = AA, (3x3)(3x3).
r1 = [2(2)+(-1)(1)+0(0),  2(-1)+(-1)(3)+0(4),  2(0)+(-1)(-2)+0(1)] = [3, -5, 2]
r2 = [1(2)+3(1)+(-2)(0),  1(-1)+3(3)+(-2)(4),  1(0)+3(-2)+(-2)(1)] = [5, 0, -8]
r3 = [0(2)+4(1)+1(0),     0(-1)+4(3)+1(4),     0(0)+4(-2)+1(1)]    = [4, 12, -7]
=> A^2 = [ 3  -5   2 ]
         [ 5   0  -8 ]
         [ 4  12  -7 ]
    [PROF: -0.5 E8 Entry (3,2) of A^2 is 0(-1) + 4(3) + 1(4) = 16, not 12.]
(f)
B^2: undefined. B is 2x3, not square, BB needs 3 cols = 2 rows, false.

    [PROF: ✓]
    [PROF: Problem 2  5/6]

## Problem 3
(a)
[  1  2  -1 | -1 ]  R2→R2-2R1   [ 1  2  -1 | -1 ]  R2→-R2      [ 1  2  -1 |  -1 ]
[  2  3   1 |  2 ]  R3→R3+R1    [ 0 -1   3 |  4 ]  R3→R3-3R2   [ 0  1  -3 |  -4 ]
[ -1  1   2 | -1 ]  --------→   [ 0  3   1 |  0 ]  ---------→  [ 0  0  10 |  12 ]
R3 → (1/10)R3:
[ 1  2  -1 |  -1 ]
[ 0  1  -3 |  -4 ]
[ 0  0   1 | 6/5 ]
x3 = 6/5;  x2 = -4 + 3(6/5) = -2/5;  x1 = -1 - 2(-2/5) + 6/5 = 1
=> ANS: x = [1, -2/5, 6/5]^T
    [PROF: -1 E8 In R3 -> R3 + R1 the augmented entry is -1 + (-1) = -2, not 0.]
(b)
[ 1  2  -1 |  4 ]  R2→R2-2R1   [ 1  2  -1 |  4 ]  R3→R3-R2    [ 1  0  -7 |  8 ]
[ 2  5   1 |  6 ]  R3→R3-3R1   [ 0  1   3 | -2 ]  R1→R1-2R2   [ 0  1   3 | -2 ]
[ 3  7   0 | 10 ]  --------→   [ 0  1   3 | -2 ]  ---------→  [ 0  0   0 |  0 ]
No pivot in col 3 => z free, z = t.
y = -2 - 3t,  x = 8 + 7t. Infinitely many solutions.
=> ANS: [x, y, z]^T = [8, -2, 0]^T + t [7, -3, 1]^T,  t ∈ R

    [PROF: ✓]
    [PROF: Problem 3  5/6]

## Problem 4
(a)
x1 = kg of Alloy 1, x2 = kg of Alloy 2, x3 = kg of Alloy 3 (masses in kg).
Mass of each metal in = mass of that metal out.
Cu:  0.5 x1 + 0.2 x2 + 0.4 x3 = 0.36
Zn:  0.3 x1 + 0.7 x2 + 0.2 x3 = 0.44
Ni:  0.2 x1 + 0.1 x2 + 0.4 x3 = 0.20
    [PROF: -3 E6 Each equation sets a mass in kg equal to a mass fraction, so the right-hand sides must be 36, 44, and 20 kg.]
(b)
Metal masses on the right: 36, 44, 20 kg. x10 to clear decimals:
[ 5  2  4 | 360 ]
[ 3  7  2 | 440 ]
[ 2  1  4 | 200 ]
    [PROF: ✓]
(c)
R1 → R1 - 2R3:
[ 1  0  -4 | -40 ]
[ 3  7   2 | 440 ]
[ 2  1   4 | 200 ]
R2 → R2 - 3R1,  R3 → R3 - 2R1:
[ 1  0  -4 | -40 ]
[ 0  7  14 | 520 ]
[ 0  1  12 | 280 ]
R2 → (1/7)R2,  R3 → R3 - R2:
[ 1  0  -4 |    -40 ]
[ 0  1   2 |  520/7 ]
[ 0  0  10 | 1440/7 ]
R3 → (1/10)R3:
[ 1  0  -4 |   -40 ]
[ 0  1   2 | 520/7 ]
[ 0  0   1 | 144/7 ]
x3 = 144/7 ≈ 20.57
x2 = 520/7 - 2(144/7) = 232/7 ≈ 33.14
x1 = -40 + 4(144/7) = 296/7 ≈ 42.29
=> ANS: Alloy 1 ≈ 42.29 kg, Alloy 2 ≈ 33.14 kg, Alloy 3 ≈ 20.57 kg

    [PROF: -1 E8 In R2 -> R2 - 3R1 the constant is 440 - 3(-40) = 560, not 520.]
    [PROF: Problem 4  4/8]

## Problem 5
(a)
[ 1  2  1 ]
[ 2  4  3 ]
[ 3  6  4 ]
R2 → R2 - 2R1,  R3 → R3 - 3R1:
[ 1  2  1 ]
[ 0  0  1 ]
[ 0  0  1 ]
R3 → R3 - R2,  R1 → R1 - R2:
[ 1  2  0 ]
[ 0  0  1 ]
[ 0  0  0 ]
=> RREF(A) = [ 1  2  0 ]
             [ 0  0  1 ]
             [ 0  0  0 ]
    [PROF: ✓]
(b)
2 pivots in the RREF (cols 1 and 3) => rank(A) = 2
    [PROF: ✓]
(c)
Same ops on [A | b] leave row 3 as [ 0  0  0 | b3 - b1 - b2 ].
0 solutions: possible. b3 ≠ b1 + b2, e.g. b = [0, 0, 1]^T, gives row 3: 0 = 1,
inconsistent.
1 solution: impossible. Col 2 is never a pivot col, so x2 is free whenever the
system is consistent; rank 2 < 3 unknowns, so never unique.
Infinitely many: possible. b3 = b1 + b2, e.g. b = [1, 3, 4]^T, is consistent and x2
free => infinitely many.

    [PROF: ✓]
    [PROF: Problem 5  7/7]

## Problem 6
(a)
Vectors as columns:
[ 1  2   0 ]
[ 0  1   1 ]
[ 2  3  -1 ]
R3 → R3 - 2R1:
[ 1  2   0 ]
[ 0  1   1 ]
[ 0 -1   1 ]
R3 → R3 + R2:
[ 1  2  0 ]
[ 0  1  1 ]
[ 0  0  2 ]
3 pivots for 3 vectors => only c1 = c2 = c3 = 0 solves c1v1 + c2v2 + c3v3 = 0.
=> ANS: independent, span = all of R^3
    [PROF: -1 E8 In R3 -> R3 - 2R1 the third entry is -1 - 2(0) = -1, not 1; -2 S3 The slip reverses the conclusion, the set is dependent (v3 = v2 - 2v1) and the span is a plane, so the verdict and geometry points are lost.]
(b)
[ 1  0  1 ]
[ 1  1  0 ]
[ 0  1  1 ]
R2 → R2 - R1:
[ 1  0   1 ]
[ 0  1  -1 ]
[ 0  1   1 ]
R3 → R3 - R2:
[ 1  0   1 ]
[ 0  1  -1 ]
[ 0  0   2 ]
3 pivots for 3 vectors => independent, and 3 independent vectors in R^3 span R^3.
=> ANS: independent, span = all of R^3
    [PROF: ✓]
    [PROF: Problem 6  5/8]

## Grader summary
    Problem 1: 4.5/5
    Problem 2: 5/6
    Problem 3: 5/6
    Problem 4: 4/8
    Problem 5: 7/7
    Problem 6: 5/8
    Total: 30.5/40
    The methods are sound in every problem and the row operations are labeled throughout, but six separate arithmetic slips cost you points, and the one in 6(a) flipped the verdict: the set is dependent and its span is a plane. In 4(a) the right-hand sides are masses in kg (36, 44, 20), not the fractions 0.36, 0.44, 0.20; your part (b) has them right. Check each line against the one above it before you build on it.
