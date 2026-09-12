# Homework 1
# Vectors, Matrices, and Linear Systems
Due Fri, Sep. 18, 2026

You must submit a PDF of your work by 11:59pm on Friday, September 18.
Remember to do all of the following:
  - Show all of your work, including brief explanations of what you are doing.
  - Keep your work organized and legible, and clearly indicate your final answers.
  - If you completed this assignment on paper, use a scanner or scanning app to get a PDF.
  - Tag all of the pages each problem appears on when uploading.

Total: 40 points.

## Part 1: Vectors

Problem 1 (5 pts)
Let u = [2, -1, 3]^T,  v = [1, 4, -2]^T,  and  w = [-4, 2, 6]^T  (column vectors in R^3).
Calculate each of the following.
  (a) (2u - v) · w                                                          1 pt
  (b) || v + (1/2) w ||                                                     1 pt
  (c) The angle between u and w (in degrees, rounded to two decimal places) 3 pts

## Part 2: Matrices

Problem 2 (6 pts)
Let
      A = [ 2  -1   0 ]        B = [ 1   0  -2 ]        v = [  1 ]        w = [ 2   0  -1 ]
          [ 1   3  -2 ]            [ 3   1   1 ]            [ -2 ]
          [ 0   4   1 ]                                     [  3 ]
Calculate each of the following by hand or explain why they are undefined.
  (a) AB and BA          1 pt
  (b) Av and vA          1 pt
  (c) Aw and wA          1 pt
  (d) vw and wv          1 pt
  (e) A^2                1 pt
  (f) B^2                1 pt

## Part 3: Linear Systems and Gaussian Elimination

Problem 3 (6 pts)
Use Gaussian elimination to find the general solution to each linear system.
Show every elementary row operation you use.
  (a)    x1 + 2x2 -  x3 = -1                                                3 pts
        2x1 + 3x2 +  x3 =  2
        -x1 +  x2 + 2x3 = -1

  (b)     x + 2y -  z =  4                                                  3 pts
         2x + 5y +  z =  6
         3x + 7y      = 10

Problem 4 (8 pts)
A foundry blends three stock alloys to produce 100 kg of a target alloy. The compositions by mass are:
      Alloy 1:  50% copper, 30% zinc, 20% nickel
      Alloy 2:  20% copper, 70% zinc, 10% nickel
      Alloy 3:  40% copper, 20% zinc, 40% nickel
The target alloy must be 36% copper, 44% zinc, and 20% nickel by mass. Assume no metal is lost
in blending, so the mass of each metal going in equals the mass of that metal in the product.
  (a) Create a system of three linear equations relating the masses of Alloy 1, Alloy 2, and    3 pts
      Alloy 3 used. Explain what any variables you create represent, including units.
      (Hint: write one equation for copper, one for zinc, and one for nickel.)
  (b) Convert the linear system from part (a) into an augmented matrix.                          1 pt
  (c) Use Gaussian elimination to find the mass of each alloy needed.                            4 pts

Problem 5 (7 pts)
Let
      A = [ 1  2  1 ]
          [ 2  4  3 ]
          [ 3  6  4 ]
  (a) Find the RREF of A, showing all elementary row operations.                                 2 pts
  (b) What is the rank of A? Explain.                                                            1 pt
  (c) Depending on the vector b, could the matrix equation Ax = b have 0, 1, or infinitely      4 pts
      many solutions? Explain why each case is possible or impossible.

## Part 4: Span and Linear Independence

Problem 6 (8 pts)
Determine whether or not each set of vectors is linearly independent. Then describe the span of
the vectors geometrically as a point, line, plane, or all of R^3.
  (a) v1 = [1, 0, 2]^T,   v2 = [2, 1, 3]^T,   v3 = [0, 1, -1]^T                                  4 pts
  (b) v1 = [1, 1, 0]^T,   v2 = [0, 1, 1]^T,   v3 = [1, 0, 1]^T                                   4 pts
