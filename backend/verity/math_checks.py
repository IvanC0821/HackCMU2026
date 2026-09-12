"""Bounded polynomial identity checks; no eval, sympify, or parse_expr on user text."""

import ast

import sympy


class Unsupported(ValueError):
    pass


def polynomial_identity(lhs, rhs):
    try:
        trees = [ast.parse(s, mode="eval") for s in (lhs, rhs)]
        nodes = [n for t in trees for n in ast.walk(t)]
        if len(nodes) > 128:
            raise Unsupported()
        names = {n.id for n in nodes if isinstance(n, ast.Name)}
        if len(names) > 3 or any(not n.isascii() or not n.isalpha() or len(n) > 10 for n in names):
            raise Unsupported()

        def degree(n):
            if isinstance(n, ast.Constant) and type(n.value) is int and abs(n.value) <= 10000:
                return 0
            if isinstance(n, ast.Name):
                return 1
            if isinstance(n, ast.UnaryOp) and isinstance(n.op, (ast.UAdd, ast.USub)):
                return degree(n.operand)
            if isinstance(n, ast.BinOp):
                a = degree(n.left)
                if isinstance(n.op, (ast.Add, ast.Sub)):
                    result = max(a, degree(n.right))
                elif isinstance(n.op, ast.Mult):
                    result = a + degree(n.right)
                elif (
                    isinstance(n.op, ast.Div)
                    and isinstance(n.right, ast.Constant)
                    and type(n.right.value) is int
                    and 1 <= n.right.value <= 1000
                ):
                    result = a
                elif (
                    isinstance(n.op, ast.Pow)
                    and isinstance(n.right, ast.Constant)
                    and type(n.right.value) is int
                    and 0 <= n.right.value <= 4
                ):
                    result = a * n.right.value
                else:
                    raise Unsupported()
                if result > 8:
                    raise Unsupported()
                return result
            raise Unsupported()

        for tree in trees:
            degree(tree.body)

        def build(n):
            if isinstance(n, ast.Constant):
                return sympy.Integer(n.value)
            if isinstance(n, ast.Name):
                return sympy.Symbol(n.id)
            if isinstance(n, ast.UnaryOp):
                value = build(n.operand)
                return -value if isinstance(n.op, ast.USub) else value
            a, b = build(n.left), build(n.right)
            if isinstance(n.op, ast.Add):
                return a + b
            if isinstance(n.op, ast.Sub):
                return a - b
            if isinstance(n.op, ast.Mult):
                return a * b
            if isinstance(n.op, ast.Div):
                return a / b
            return a**b

        difference = sympy.expand(build(trees[0].body) - build(trees[1].body))
        return "equivalent" if difference == 0 else "not_equivalent"
    except (SyntaxError, Unsupported, RecursionError):
        return "unsupported"
